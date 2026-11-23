import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const artifactDir = 'C:\\Users\\MS Infra Works\\.gemini\\antigravity\\brain\\dfaa3310-ec0f-4ef4-88f2-a45c810c6eb9';
const sampleDir = path.resolve(rootDir, 'sample-exports');

if (!fs.existsSync(sampleDir)) {
  fs.mkdirSync(sampleDir, { recursive: true });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const port = 5199;
let server;

// Create temporary HTML preview runner
const htmlRunnerPath = path.resolve(rootDir, 'temp-preview-runner.html');
const runnerHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Horizon Wallpaper Preview Exporter</title>
  <style>
    body { margin: 0; background: #0b0f19; color: #fff; font-family: sans-serif; }
    canvas { display: block; margin: 20px auto; border: 1px solid #333; }
  </style>
</head>
<body>
  <div id="status">Rendering wallpapers...</div>
  <script type="module">
    import { CanvasWallpaperEngine } from '/src/services/CanvasWallpaperEngine.js';

    const goal = {
      id: 'udemy-rag-mastery',
      title: 'Udemy RAG & LLM Engineering Course',
      category: 'Udemy Course',
      sourceType: 'udemy',
      templateId: 'alpine-peak',
      totalDays: 15,
      targetDate: new Date(Date.now() + 15 * 86400000).toISOString(),
      streakDays: 6,
      courseMetadata: { durationHours: 24.5 },
      milestones: [
        { id: 'm1', order: 1, title: 'Vector Embeddings & Semantic Search Fundamentals', targetDay: 2, status: 'completed', completed: true },
        { id: 'm2', order: 2, title: 'Dense Retrieval, FAISS Indexing & Hybrid Search', targetDay: 5, status: 'completed', completed: true },
        { id: 'm3', order: 3, title: 'Reranking with Cross-Encoders & Contextual Compression', targetDay: 8, status: 'in_progress', completed: false },
        { id: 'm4', order: 4, title: 'Agentic Tool Calling & LangGraph Workflow Orchestration', targetDay: 12, status: 'pending', completed: false },
        { id: 'm5', order: 5, title: 'Production Deployment, Evaluation & Tracing with Arize', targetDay: 15, status: 'pending', completed: false }
      ]
    };

    async function run() {
      const presets = [
        { name: 'motorola-edge-1080x2400', preset: 'MOTOROLA_EDGE', w: 1080, h: 2400 },
        { name: 'standard-mobile-1080x1920', preset: 'MOBILE', w: 1080, h: 1920 },
        { name: 'desktop-1920x1080', preset: 'DESKTOP', w: 1920, h: 1080 }
      ];

      for (const p of presets) {
        const canvas = document.createElement('canvas');
        canvas.width = p.w;
        canvas.height = p.h;
        document.body.appendChild(canvas);

        const res = await CanvasWallpaperEngine.renderWallpaper(canvas, {
          goal,
          preset: p.preset
        });

        console.log('Rendered ' + p.name + ':', res);
        const dataUrl = canvas.toDataURL('image/png', 1.0);

        await fetch('/save-export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: p.name, dataUrl })
        });
      }

      document.getElementById('status').innerText = 'All wallpapers generated successfully!';
      await fetch('/done', { method: 'POST' });
    }

    run().catch(err => {
      console.error(err);
      fetch('/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message, stack: err.stack })
      });
    });
  </script>
</body>
</html>`;

fs.writeFileSync(htmlRunnerPath, runnerHtml, 'utf8');

let completedCount = 0;

server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/save-export') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { name, dataUrl } = JSON.parse(body);
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const buf = Buffer.from(base64Data, 'base64');

        const outPathSample = path.join(sampleDir, `horizon-${name}.png`);
        fs.writeFileSync(outPathSample, buf);

        const outPathArtifact = path.join(artifactDir, `wallpaper-${name}.png`);
        fs.writeFileSync(outPathArtifact, buf);

        console.log(`Saved ${name}.png (${buf.length} bytes) to sample-exports and artifacts!`);
        completedCount++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error('Failed to save export:', err);
        res.writeHead(500);
        res.end(err.message);
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/done') {
    console.log('All exports finished successfully!');
    res.writeHead(200);
    res.end('OK');
    setTimeout(() => {
      cleanupAndExit(0);
    }, 1000);
    return;
  }

  if (req.method === 'POST' && req.url === '/error') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      console.error('Client reported error:', body);
      res.writeHead(200);
      res.end('OK');
      cleanupAndExit(1);
    });
    return;
  }

  // Serve static files
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/temp-preview-runner.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(fs.readFileSync(htmlRunnerPath));
  }

  const filePath = path.join(rootDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    return fs.createReadStream(filePath).pipe(res);
  }

  res.writeHead(404);
  res.end('Not found: ' + reqPath);
});

server.listen(port, () => {
  console.log(`Export server listening on http://localhost:${port}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-web-security',
    `http://localhost:${port}/temp-preview-runner.html`
  ];

  console.log(`Launching Chrome headless to render wallpapers...`);
  const chromeProcess = spawn(chromePath, chromeArgs);

  chromeProcess.on('error', err => {
    console.error('Failed to spawn Chrome:', err);
    cleanupAndExit(1);
  });
});

function cleanupAndExit(code) {
  try {
    if (fs.existsSync(htmlRunnerPath)) fs.unlinkSync(htmlRunnerPath);
  } catch {}
  if (server) server.close();
  process.exit(code);
}

// Timeout failsafe after 30 seconds
setTimeout(() => {
  console.error('Timeout waiting for wallpapers to export');
  cleanupAndExit(1);
}, 30000);
