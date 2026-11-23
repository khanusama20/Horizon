import express from 'express';
import cors from 'cors';
import { extractCourseMetadata, validateCourseUrl } from './scraper.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'horizon-metadata-proxy',
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

// Start Server if invoked directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Horizon API] Course Metadata Proxy running on http://localhost:${PORT}`);
  });
}

export default app;
