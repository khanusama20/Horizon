/**
 * Horizon Course Metadata Scraper & SSRF Guard
 * Safely extracts publicly available course metadata (OpenGraph, JSON-LD, HTML heuristics)
 * with robust SSRF filtering, strict timeouts, Cloudflare/anti-bot challenge detection,
 * and graceful fallback signaling.
 */

// Private & Link-Local IPv4 patterns
const PRIVATE_IP_REGEX = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.|0\.|169\.254\.)/;
const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal']);
const BLOCKED_DOMAINS_SUFFIX = /\.(local|internal|corp|lan|home|arpa)$/i;

/**
 * Standard user-friendly message for restricted access / anti-bot challenges
 */
export const RESTRICTED_ACCESS_USER_MESSAGE =
  'Unable to automatically access this course. The website restricts external requests. You can still continue by entering the course details and pasting its syllabus.';

/**
 * Validates external URL for safety and SSRF prevention
 * @param {string} rawUrl - User-supplied URL string
 * @returns {{ valid: boolean, error?: string, parsedUrl?: URL, sourceType?: string }}
 */
export function validateCourseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Course URL is required' };
  }

  const trimmed = rawUrl.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format. Please include http:// or https://' };
  }

  // 1. Protocol check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http: and https: protocols are permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. SSRF Loopback & Blocked names
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost')) {
    return { valid: false, error: 'Access to loopback/local addresses is forbidden' };
  }

  // 3. SSRF Private IP check
  if (PRIVATE_IP_REGEX.test(hostname)) {
    return { valid: false, error: 'Access to private RFC 1918 or link-local subnets is forbidden' };
  }

  // 4. SSRF Internal domain suffix check
  if (BLOCKED_DOMAINS_SUFFIX.test(hostname)) {
    return { valid: false, error: 'Access to internal network domains is forbidden' };
  }

  // 5. Must have a dot in hostname
  if (!hostname.includes('.')) {
    return { valid: false, error: 'Invalid domain name' };
  }

  // Identify source platform
  let sourceType = 'GENERIC_WEB';
  if (hostname.includes('udemy.com')) {
    sourceType = 'UDEMY';
  } else if (hostname.includes('coursera.org')) {
    sourceType = 'COURSERA';
  } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    sourceType = 'YOUTUBE';
  } else if (hostname.includes('edx.org')) {
    sourceType = 'EDX';
  } else if (hostname.includes('pluralsight.com')) {
    sourceType = 'PLURALSIGHT';
  }

  return { valid: true, parsedUrl: parsed, sourceType };
}

/**
 * Detects whether an HTML response is a Cloudflare or anti-bot challenge interstitial
 * @param {string} html - Raw HTML source
 * @returns {boolean}
 */
export function isCloudflareOrAntiBotChallenge(html) {
  if (!html || typeof html !== 'string') return false;
  const challengePatterns = [
    /<title>\s*Just a moment\.\.\.\s*<\/title>/i,
    /<title>\s*Attention Required!\s*\|\s*Cloudflare\s*<\/title>/i,
    /<title>\s*Security Check\s*<\/title>/i,
    /cf-browser-verification/i,
    /cf-challenge/i,
    /__cf_chl_tk/i,
    /challenge-platform\/scripts/i,
    /id=["']cf-please-wait["']/i,
    /Enable JavaScript and cookies to continue/i,
    /Ray ID:\s*<code>[a-f0-9]+<\/code>/i,
    /Cloudflare Ray ID:/i,
    /Please turn JavaScript on and reload the page/i
  ];
  return challengePatterns.some((pattern) => pattern.test(html));
}

/**
 * Decodes standard HTML entities in extracted text
 * @param {string} str - Raw HTML string
 * @returns {string} Decoded plain text
 */
export function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts OpenGraph, JSON-LD, and HTML section headers from static HTML
 * @param {string} html - Raw HTML source
 * @param {string} sourceUrl - Original URL
 * @param {string} sourceType - Identified platform
 * @returns {object} Extracted metadata
 */
export function extractMetadataFromHtml(html, sourceUrl, sourceType) {
  let title = '';
  let description = '';
  let author = null;
  const rawSections = [];

  // 1. Extract OpenGraph Title, <title>, or <h1>
  const ogTitleMatch =
    html.match(/<meta\s+[^>]*?(?:property|name)=["']og:title["'][^>]*?content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']og:title["']/i);
  if (ogTitleMatch && ogTitleMatch[1]) {
    title = decodeHtmlEntities(ogTitleMatch[1]);
  } else {
    const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleTagMatch && titleTagMatch[1]) {
      title = decodeHtmlEntities(titleTagMatch[1]);
    } else {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (h1Match && h1Match[1]) {
        title = decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, ''));
      }
    }
  }

  // Clean common platform suffixes (e.g. "| Udemy", "- Coursera")
  title = title.replace(/\s*(\||\-)\s*(Udemy|Coursera|edX|YouTube|Pluralsight).*$/i, '').trim();

  // 2. Extract OpenGraph Description or meta description
  const ogDescMatch =
    html.match(/<meta\s+[^>]*?(?:property|name)=["']og:description["'][^>]*?content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']og:description["']/i) ||
    html.match(/<meta\s+[^>]*?name=["']description["'][^>]*?content=["']([^"']*)["']/i);
  if (ogDescMatch && ogDescMatch[1]) {
    description = decodeHtmlEntities(ogDescMatch[1]);
  }

  // 3. Extract JSON-LD Course Schema
  const jsonLdRegex = /<script\s+[^>]*?type=["']application\/ld\+json["'][^>]*?>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item && (item['@type'] === 'Course' || item['@type'] === 'CourseInstance' || item['@type'] === 'LearningResource')) {
          if (!title && item.name) title = decodeHtmlEntities(item.name);
          if (!description && item.description) description = decodeHtmlEntities(item.description);
          if (item.author) {
            author = typeof item.author === 'string' ? item.author : item.author.name || null;
          } else if (item.provider) {
            author = typeof item.provider === 'string' ? item.provider : item.provider.name || null;
          }
        }
      }
    } catch {
      // Ignore JSON-LD parse errors
    }
  }

  // 4. Extract Instructor / Author from meta tag if not yet found
  if (!author) {
    const authorMetaMatch =
      html.match(/<meta\s+[^>]*?name=["']author["'][^>]*?content=["']([^"']*)["']/i) ||
      html.match(/<meta\s+[^>]*?content=["']([^"']*)["'][^>]*?name=["']author["']/i);
    if (authorMetaMatch && authorMetaMatch[1]) {
      author = decodeHtmlEntities(authorMetaMatch[1]);
    }
  }

  // 5. Extract Curriculum Section Headers (HTML Heuristics)
  const sectionRegexes = [
    /<span[^>]*class=["'][^"']*section--title[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    /<div[^>]*class=["'][^"']*section-title[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    /<h[34][^>]*class=["'][^"']*curriculum[^"']*["'][^>]*>([\s\S]*?)<\/h[34]>/gi,
    /<button[^>]*class=["'][^"']*accordion-panel-title[^"']*["'][^>]*>([\s\S]*?)<\/button>/gi
  ];

  for (const regex of sectionRegexes) {
    let sMatch;
    while ((sMatch = regex.exec(html)) !== null) {
      const clean = decodeHtmlEntities(sMatch[1].replace(/<[^>]+>/g, ''));
      if (clean && clean.length > 2 && clean.length < 120 && !rawSections.includes(clean)) {
        rawSections.push(clean);
      }
    }
    if (rawSections.length > 0) break;
  }

  // Never generate fake titles: return actual extracted title or empty string
  return {
    sourceUrl,
    sourceType,
    title: title || '',
    description: description ? description.slice(0, 250) : '',
    author,
    totalSections: rawSections.length,
    rawSections,
    extractedAt: new Date().toISOString()
  };
}

/**
 * Public extraction orchestrator: fetches remote URL safely with timeout & challenge detection
 * @param {string} rawUrl - Course URL
 * @returns {Promise<{ success: boolean, data?: object, restricted?: boolean, fallbackRequired?: boolean, fallbackRecommended?: boolean, statusCode?: number, error?: string, message?: string, partialData?: object }>}
 */
export async function extractCourseMetadata(rawUrl) {
  const validation = validateCourseUrl(rawUrl);
  if (!validation.valid) {
    return {
      success: false,
      restricted: false,
      fallbackRequired: false,
      error: validation.error
    };
  }

  const { parsedUrl, sourceType } = validation;
  const targetUrl = parsedUrl.toString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    });

    clearTimeout(timeout);

    // 1. Detect HTTP status codes representing restricted access / rate limits / challenges
    if (response.status === 403 || response.status === 429 || response.status === 503) {
      return {
        success: false,
        restricted: true,
        fallbackRequired: true,
        statusCode: response.status,
        error: RESTRICTED_ACCESS_USER_MESSAGE,
        partialData: {
          sourceUrl: targetUrl,
          sourceType,
          title: ''
        }
      };
    }

    if (!response.ok) {
      return {
        success: false,
        restricted: false,
        fallbackRequired: true,
        statusCode: response.status,
        error: `Remote course page responded with HTTP ${response.status}. You can still continue by entering the course details and pasting its syllabus.`,
        partialData: {
          sourceUrl: targetUrl,
          sourceType,
          title: ''
        }
      };
    }

    // Read max 1.5MB of HTML
    const html = await response.text();
    const boundedHtml = html.slice(0, 1500000);

    // 2. Detect Cloudflare challenge page even if HTTP status was 200 OK
    if (isCloudflareOrAntiBotChallenge(boundedHtml)) {
      return {
        success: false,
        restricted: true,
        fallbackRequired: true,
        statusCode: 403,
        error: RESTRICTED_ACCESS_USER_MESSAGE,
        partialData: {
          sourceUrl: targetUrl,
          sourceType,
          title: ''
        }
      };
    }

    // 3. Extract metadata from standard public page
    const metadata = extractMetadataFromHtml(boundedHtml, targetUrl, sourceType);

    // If zero sections found (typical when platform hydrates sections via client JS), signal fallback recommendation
    const hasZeroSections = metadata.rawSections.length === 0;

    return {
      success: true,
      restricted: false,
      data: metadata,
      fallbackRecommended: hasZeroSections,
      message: hasZeroSections
        ? 'Course details extracted! Paste your syllabus outline to auto-generate paced milestones.'
        : `Successfully imported ${metadata.totalSections} sections.`
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError' || err.name === 'TimeoutError';
    return {
      success: false,
      restricted: false,
      fallbackRequired: true,
      error: isTimeout
        ? 'External request timed out after 3.5s. You can still continue by entering the course details and pasting its syllabus.'
        : `Network error reaching course platform: ${err.message}. You can still continue by entering the course details and pasting its syllabus.`,
      partialData: {
        sourceUrl: targetUrl,
        sourceType,
        title: ''
      }
    };
  }
}
