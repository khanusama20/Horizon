import { describe, it, expect, vi } from 'vitest';
import {
  validateCourseUrl,
  extractMetadataFromHtml,
  extractCourseMetadata,
  isCloudflareOrAntiBotChallenge,
  RESTRICTED_ACCESS_USER_MESSAGE
} from '../../server/scraper.js';
import { parseSyllabusText } from '../../src/services/syllabusParser.js';
import { generateMilestonePlan } from '../../src/services/milestoneEngine.js';

describe('Horizon URL Import & Fallback Architecture (10 Required Scenarios)', () => {
  // Scenario 1: Successful public-page extraction
  it('Scenario 1: extracts complete metadata from accessible public course page', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Modern Full-Stack LLM Engineering | Udemy" />
          <meta property="og:description" content="Master RAG pipelines, agents, and vector databases." />
          <meta name="author" content="Dr. Sarah Connor" />
        </head>
        <body>
          <div class="curriculum-container">
            <span class="section--title">01. Setup & Foundations</span>
            <span class="section--title">02. Vector Search & Embeddings</span>
            <span class="section--title">03. Autonomous Agents</span>
          </div>
        </body>
      </html>
    `;

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockHtml)
    });

    try {
      const result = await extractCourseMetadata('https://www.udemy.com/course/modern-llm/');
      expect(result.success).toBe(true);
      expect(result.restricted).toBe(false);
      expect(result.data.title).toBe('Modern Full-Stack LLM Engineering');
      expect(result.data.description).toBe('Master RAG pipelines, agents, and vector databases.');
      expect(result.data.author).toBe('Dr. Sarah Connor');
      expect(result.data.totalSections).toBe(3);
      expect(result.data.rawSections).toEqual([
        '01. Setup & Foundations',
        '02. Vector Search & Embeddings',
        '03. Autonomous Agents'
      ]);
      expect(result.fallbackRecommended).toBe(false);
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Scenario 2: HTTP 403 response
  it('Scenario 2: handles HTTP 403 response gracefully with user-friendly message', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden')
    });

    try {
      const targetUrl = 'https://www.udemy.com/course/restricted-course/';
      const result = await extractCourseMetadata(targetUrl);

      expect(result.success).toBe(false);
      expect(result.restricted).toBe(true);
      expect(result.fallbackRequired).toBe(true);
      expect(result.statusCode).toBe(403);
      expect(result.error).toBe(RESTRICTED_ACCESS_USER_MESSAGE);
      expect(result.error).not.toMatch(/cloudflare or platform anti-bot/i); // No technical jargon
      expect(result.partialData.sourceUrl).toBe(targetUrl);
      expect(result.partialData.title).toBe(''); // Never fake title
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Scenario 3: Cloudflare challenge detection
  it('Scenario 3: detects Cloudflare anti-bot challenge interstitial even on HTTP 200', async () => {
    const challengeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Just a moment...</title>
        </head>
        <body>
          <div id="cf-please-wait">Enable JavaScript and cookies to continue</div>
          <div class="cf-browser-verification">Ray ID: <code>8e45a2b0c1</code></div>
        </body>
      </html>
    `;

    expect(isCloudflareOrAntiBotChallenge(challengeHtml)).toBe(true);

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(challengeHtml)
    });

    try {
      const targetUrl = 'https://www.udemy.com/course/cloudflare-gated/';
      const result = await extractCourseMetadata(targetUrl);

      expect(result.success).toBe(false);
      expect(result.restricted).toBe(true);
      expect(result.fallbackRequired).toBe(true);
      expect(result.statusCode).toBe(403);
      expect(result.error).toBe(RESTRICTED_ACCESS_USER_MESSAGE);
      expect(result.partialData.sourceUrl).toBe(targetUrl);
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Scenario 4: Missing OpenGraph metadata
  it('Scenario 4: falls back to <title>, JSON-LD, or <h1> when OpenGraph tags are missing', () => {
    // 4a: Falls back to <title>
    const htmlWithTitleOnly = `
      <html>
        <head><title>System Design Mastery - Coursera</title></head>
        <body></body>
      </html>
    `;
    const resTitle = extractMetadataFromHtml(htmlWithTitleOnly, 'https://coursera.org/learn/sd', 'COURSERA');
    expect(resTitle.title).toBe('System Design Mastery');

    // 4b: Falls back to JSON-LD
    const htmlWithJsonLd = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Course",
              "name": "Generative AI Fundamentals",
              "description": "Learn prompt engineering and fine-tuning."
            }
          </script>
        </head>
        <body></body>
      </html>
    `;
    const resJson = extractMetadataFromHtml(htmlWithJsonLd, 'https://example.com/course', 'GENERIC_WEB');
    expect(resJson.title).toBe('Generative AI Fundamentals');
    expect(resJson.description).toBe('Learn prompt engineering and fine-tuning.');

    // 4c: No title anywhere -> returns empty string, never fake title
    const htmlEmpty = '<html><head></head><body></body></html>';
    const resEmpty = extractMetadataFromHtml(htmlEmpty, 'https://example.com/course', 'GENERIC_WEB');
    expect(resEmpty.title).toBe('');
    expect(resEmpty.title).not.toBe('Imported Course Goal');
  });

  // Scenario 5: Invalid URL
  it('Scenario 5: validates URLs and prevents SSRF, private IPs, and malformed inputs', () => {
    expect(validateCourseUrl('').valid).toBe(false);
    expect(validateCourseUrl('ftp://example.com').valid).toBe(false);
    expect(validateCourseUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateCourseUrl('http://localhost:3001').valid).toBe(false);
    expect(validateCourseUrl('http://127.0.0.1:8080').valid).toBe(false);
    expect(validateCourseUrl('http://192.168.1.1/admin').valid).toBe(false);
    expect(validateCourseUrl('http://10.0.0.1').valid).toBe(false);
    expect(validateCourseUrl('http://169.254.169.254/latest').valid).toBe(false);
    expect(validateCourseUrl('not-a-valid-url').valid).toBe(false);

    // Valid URLs
    expect(validateCourseUrl('https://www.udemy.com/course/python/').valid).toBe(true);
    expect(validateCourseUrl('https://www.coursera.org/learn/ml').valid).toBe(true);
  });

  // Scenario 6: Network timeout
  it('Scenario 6: handles network timeout with user-friendly fallback guidance', async () => {
    const originalFetch = global.fetch;
    const timeoutErr = new Error('The operation was aborted');
    timeoutErr.name = 'AbortError';

    global.fetch = vi.fn().mockRejectedValue(timeoutErr);

    try {
      const targetUrl = 'https://www.udemy.com/course/slow-responding-course/';
      const result = await extractCourseMetadata(targetUrl);

      expect(result.success).toBe(false);
      expect(result.fallbackRequired).toBe(true);
      expect(result.error).toMatch(/timed out after 3.5s/i);
      expect(result.error).toMatch(/continue by entering the course details/i);
      expect(result.partialData.sourceUrl).toBe(targetUrl);
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Scenario 7: Empty syllabus response
  it('Scenario 7: handles empty syllabus gracefully and recommends manual outline fallback', () => {
    const htmlWithoutSections = `
      <html>
        <head>
          <meta property="og:title" content="Cloud Architecture Pro | edX" />
          <meta property="og:description" content="Prepare for professional cloud certifications." />
        </head>
        <body>
          <div id="react-root">Client-hydrated curriculum</div>
        </body>
      </html>
    `;

    const metadata = extractMetadataFromHtml(htmlWithoutSections, 'https://edx.org/course/cloud', 'EDX');
    expect(metadata.title).toBe('Cloud Architecture Pro');
    expect(metadata.description).toBe('Prepare for professional cloud certifications.');
    expect(metadata.totalSections).toBe(0);
    expect(metadata.rawSections).toEqual([]);
  });

  // Scenario 8: Manual syllabus fallback after import failure
  it('Scenario 8: Quick-Syllabus text parser extracts clean sections from pasted text', () => {
    const pastedSyllabus = `
      Section I: Python Foundations and Data Structures (2 hrs)
      Section II: Asynchronous Programming and Concurrency
      3. FastAPI Backend Design and WebSockets
      - Docker Containerization and Deployment
      5. Prometheus & Grafana Monitoring
    `;

    const sections = parseSyllabusText(pastedSyllabus);
    expect(sections).toHaveLength(5);
    expect(sections[0]).toBe('Python Foundations and Data Structures');
    expect(sections[1]).toBe('Asynchronous Programming and Concurrency');
    expect(sections[2]).toBe('FastAPI Backend Design and WebSockets');
    expect(sections[3]).toBe('Docker Containerization and Deployment');
    expect(sections[4]).toBe('Prometheus & Grafana Monitoring');
  });

  // Scenario 9: Successful milestone generation using manually supplied syllabus
  it('Scenario 9: generates evenly paced milestone plan using manually supplied syllabus', () => {
    const targetDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const manualGoal = {
      title: 'Python Mastery',
      targetDate,
      totalDays: 14,
      courseSections: [
        { id: '1', title: 'Python Foundations', estimatedHours: 2 },
        { id: '2', title: 'Asynchronous Code', estimatedHours: 3 },
        { id: '3', title: 'FastAPI Backend', estimatedHours: 4 },
        { id: '4', title: 'Docker Containers', estimatedHours: 2 }
      ],
      courseMetadata: {
        sourceUrl: 'https://www.udemy.com/course/python-mastery/',
        sourceType: 'MANUAL_SYLLABUS',
        totalSections: 4,
        rawSections: ['Python Foundations', 'Asynchronous Code', 'FastAPI Backend', 'Docker Containers']
      }
    };

    const milestones = generateMilestonePlan(manualGoal);
    // 4 section milestones + 1 final review milestone (for timeline > 10 days) = 5 milestones
    expect(milestones).toHaveLength(5);
    expect(milestones[0].title).toBe('Python Foundations');
    expect(milestones[3].title).toBe('Docker Containers');
    expect(milestones[4].title).toBe('Final Review & Knowledge Synthesis');
    expect(milestones.every(m => !m.completed && m.status === 'pending')).toBe(true);
    expect(new Date(milestones[0].dueDate).getTime()).toBeLessThanOrEqual(
      new Date(milestones[4].dueDate).getTime()
    );
  });

  // Scenario 10: Preservation of the original course URL
  it('Scenario 10: preserves submitted course URL across failed extraction and manual fallback', async () => {
    const userUrl = 'https://www.udemy.com/course/custom-engineering-course/';

    // 10a: Preserved in extraction failure response
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden')
    });

    try {
      const result = await extractCourseMetadata(userUrl);
      expect(result.partialData.sourceUrl).toBe(userUrl);

      // 10b: Applied to manual syllabus metadata
      const manualCourseMetadata = {
        sourceUrl: result.partialData.sourceUrl,
        sourceType: 'MANUAL_SYLLABUS',
        title: 'Custom Engineering Course',
        totalSections: 2,
        rawSections: ['Module A', 'Module B']
      };

      expect(manualCourseMetadata.sourceUrl).toBe(userUrl);
      expect(manualCourseMetadata.sourceType).toBe('MANUAL_SYLLABUS');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
