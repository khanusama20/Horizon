import express from 'express';
import cors from 'cors';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { extractCourseMetadata, validateCourseUrl, extractSlugTitle } from './scraper.js';
import { parseYouTubeUrl, fetchYouTubePlaylist, fetchYouTubeSingleVideo, handlePlaylistInfoRequest } from './youtubeService.js';
import { IP_CONFIG } from '../src/config/ipConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load .env configuration if present
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
} catch {
  // Ignore env read issues
}

// Ensure temporary upload directory exists
const UPLOADS_TEMP_DIR = path.join(__dirname, 'uploads', 'temp');
if (!fs.existsSync(UPLOADS_TEMP_DIR)) {
  fs.mkdirSync(UPLOADS_TEMP_DIR, { recursive: true });
}

/**
 * Discovers the active local network IPv4 address (e.g. 192.168.x.x)
 */
export function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * Periodically purge stale temporary upload files older than 5 minutes (TTL safety net)
 */
export function cleanupStaleTempFiles(maxAgeMs = 5 * 60 * 1000) {
  try {
    if (!fs.existsSync(UPLOADS_TEMP_DIR)) return;
    const files = fs.readdirSync(UPLOADS_TEMP_DIR);
    const now = Date.now();
    for (const file of files) {
      if (file === '.gitkeep' || file.startsWith('.')) continue;
      const filePath = path.join(UPLOADS_TEMP_DIR, file);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

// Background sweep every 60 seconds
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => cleanupStaleTempFiles(), 60000);
}

const app = express();

// Determine Host & IP mode from CLI flags or env
const isIpMode = process.argv.includes('--ip') || process.env.HOST_MODE === 'ip' || process.env.HOST === '0.0.0.0';
const HOST = isIpMode ? '0.0.0.0' : (process.env.HOST || '127.0.0.1');
const PORT = process.env.PORT || IP_CONFIG.serverPort || 3001;
const localIp = getLocalIpAddress();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));

// Health Check with network details
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'horizon-metadata-proxy',
    host: HOST,
    port: PORT,
    localIp,
    youtubeApiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim() !== ''),
    timestamp: new Date().toISOString()
  });
});

// URL Validation Endpoint
app.post('/api/course-info/validate', (req, res) => {
  const { url } = req.body || {};
  const validation = validateCourseUrl(url);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }
  return res.json({
    success: true,
    sourceType: validation.sourceType,
    normalizedUrl: validation.parsedUrl.toString()
  });
});

// Course Metadata Extraction Endpoint
app.post('/api/course-info/extract', async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      fallbackRequired: false,
      error: 'Missing required "url" property in request body'
    });
  }

  try {
    const result = await extractCourseMetadata(url);

    if (result.fallbackRequired) {
      // 422 Unprocessable Content triggers Quick-Syllabus modal in frontend
      return res.status(422).json(result);
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      fallbackRequired: true,
      error: `Internal server error during metadata extraction: ${err.message}`
    });
  }
});

/**
 * YouTube Status Endpoint
 * GET /api/youtube/status
 * Safe diagnostic endpoint reporting whether the YouTube API key is configured.
 * Never exposes the key or its value.
 */
app.get('/api/youtube/status', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim() !== ''),
    service: 'youtube-data-api-v3'
  });
});

/**
 * YouTube Playlist Ingestion Endpoint (Official YouTube Data API v3)
 * GET  /api/youtube/playlist-info - Diagnostic endpoint for browsers & health checkers
 * POST /api/youtube/playlist-info - Retrieves playlist metadata & ordered video items
 */
app.get('/api/youtube/playlist-info', (req, res) => {
  res.json({
    status: 'ok',
    endpoint: '/api/youtube/playlist-info',
    method: 'POST',
    description: 'Submit { "url": "https://www.youtube.com/playlist?list=..." } via POST to retrieve playlist information.',
    apiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim() !== '')
  });
});

app.post('/api/youtube/playlist-info', async (req, res) => {
  try {
    const { status, body } = await handlePlaylistInfoRequest(req.body, process.env.YOUTUBE_API_KEY);
    return res.status(status).json(body);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Internal server error retrieving playlist: ${err.message}`
      }
    });
  }
});

/**
 * YouTube Single Video Info Endpoint
 * POST /api/youtube/video-info
 */
app.post('/api/youtube/video-info', async (req, res) => {
  const { url, videoId: directVideoId } = req.body || {};
  let videoId = directVideoId;

  if (!videoId && url) {
    const parsed = parseYouTubeUrl(url);
    if (!parsed.valid || !parsed.videoId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_URL', message: 'Invalid YouTube video URL.' }
      });
    }
    videoId = parsed.videoId;
  }

  if (!videoId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_VIDEO_ID', message: 'Missing videoId or url parameter.' }
    });
  }

  const apiKey = process.env.YOUTUBE_API_KEY || '';
  const result = await fetchYouTubeSingleVideo(videoId, apiKey);
  if (!result.success) {
    const status = result.httpStatus || 500;
    return res.status(status).json({ success: false, error: result.error });
  }
  return res.json(result);
});

/**
 * Temporary Image Upload Endpoint (Point 5)
 * Accepts base64 image, writes to temporary directory, returns URL
 */
app.post('/api/wallpaper/upload-temp', (req, res) => {
  const { image, originalName } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ success: false, error: 'No image data provided' });
  }

  try {
    // Extract mime type and base64 payload
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let ext = 'png';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('webp')) ext = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
    }

    const uniqueId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_TEMP_DIR, uniqueId);
    fs.writeFileSync(filePath, buffer);

    return res.json({
      success: true,
      filename: uniqueId,
      fileUrl: `/api/wallpaper/temp-file/${uniqueId}`,
      message: 'Temporary image uploaded successfully. File will auto-drop upon download or after 5 minutes.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: `Upload failed: ${err.message}` });
  }
});

/**
 * Serve Temporary Uploaded Image
 */
app.get('/api/wallpaper/temp-file/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename || '');
  const filePath = path.join(UPLOADS_TEMP_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Temporary image expired or not found' });
  }

  const ext = path.extname(safeFilename).toLowerCase();
  const contentTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
  };

  res.setHeader('Content-Type', contentTypes[ext] || 'image/png');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return fs.createReadStream(filePath).pipe(res);
});

/**
 * Temporary Image Cleanup Endpoint (Point 5)
 * Drops the temporary image immediately from the server directory
 */
app.post('/api/wallpaper/cleanup-temp', (req, res) => {
  const { filename, fileUrl } = req.body || {};
  let target = filename;

  if (!target && fileUrl && typeof fileUrl === 'string') {
    target = fileUrl.split('/').pop();
  }

  if (!target) {
    return res.status(400).json({ success: false, error: 'Missing filename or fileUrl to clean up' });
  }

  try {
    const safeFilename = path.basename(target);
    const filePath = path.join(UPLOADS_TEMP_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({
        success: true,
        dropped: true,
        filename: safeFilename,
        message: 'Temporary file dropped from directory successfully.'
      });
    }

    return res.json({
      success: true,
      dropped: false,
      message: 'File was already dropped or does not exist.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: `Failed to drop file: ${err.message}` });
  }
});

// Start Server if invoked directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`\n======================================================`);
    console.log(`  Horizon Metadata & Wallpaper Proxy Server`);
    console.log(`  Mode: ${isIpMode ? 'Network IP (LAN)' : 'Localhost'}`);
    console.log(`  Local URL:   http://localhost:${PORT}`);
    if (isIpMode || HOST === '0.0.0.0') {
      console.log(`  Network IP:  http://${localIp}:${PORT}`);
    }
    console.log(`======================================================\n`);
  });
}

export default app;
