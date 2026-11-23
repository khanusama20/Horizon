import { getApiUrl, getServerBaseUrl, IP_CONFIG } from '../config/ipConfig.js';

/**
 * Standard fetch wrapper that routes all requests to the configured backend server IP.
 * 
 * @param {string} endpoint - API endpoint (e.g. '/api/health')
 * @param {RequestInit} [options={}] - Fetch configuration options
 * @returns {Promise<Response>}
 */
export async function apiFetch(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  return fetch(url, options);
}

/**
 * Pings the backend health endpoint to check connection status.
 * 
 * @returns {Promise<{ online: boolean, data?: any, error?: string, url: string }>}
 */
export async function checkServerHealth() {
  const url = getApiUrl('/api/health');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { online: true, data, url };
    }
    return { online: false, error: `HTTP ${res.status}`, url };
  } catch (err) {
    return { online: false, error: err.message, url };
  }
}

/**
 * Extracts metadata for a given course URL via the backend server proxy.
 * 
 * @param {string} url - Course URL
 * @returns {Promise<any>}
 */
export async function extractCourseMetadataApi(url) {
  const res = await apiFetch('/api/course-info/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return res;
}

/**
 * Extracts YouTube playlist / video metadata via the backend YouTube service
 * 
 * @param {string} url - YouTube URL
 * @returns {Promise<any>}
 */
export async function fetchYouTubePlaylistApi(url) {
  const res = await apiFetch('/api/youtube/playlist-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return res.json();
}

/**
 * Checks YouTube API key configuration status from the backend.
 * Never exposes any sensitive values; returns pure boolean configuration status.
 * 
 * @returns {Promise<{ online: boolean, apiKeyConfigured: boolean, error?: string }>}
 */
export async function checkYouTubeApiStatus() {
  try {
    const res = await apiFetch('/api/youtube/status', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return { online: true, apiKeyConfigured: Boolean(data.apiKeyConfigured) };
    }
    return { online: true, apiKeyConfigured: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { online: false, apiKeyConfigured: false, error: err.message };
  }
}

/**
 * Uploads a temporary wallpaper image to the backend server.
 * 
 * @param {string} base64Data - Base64 encoded image string
 * @param {string} originalName - Original filename
 * @returns {Promise<{ success: boolean, fileUrl?: string, filename?: string, error?: string }>}
 */
export async function uploadTempImageApi(base64Data, originalName = 'upload.png') {
  const res = await apiFetch('/api/wallpaper/upload-temp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Data, originalName })
  });
  return res.json();
}

/**
 * Drops / deletes a temporary wallpaper image from the backend server uploads directory.
 * 
 * @param {string} filename - Filename to clean up
 * @returns {Promise<any>}
 */
export async function cleanupTempImageApi(filename) {
  if (!filename) return null;
  return apiFetch('/api/wallpaper/cleanup-temp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  }).catch(() => {});
}

export { getApiUrl, getServerBaseUrl, IP_CONFIG };
