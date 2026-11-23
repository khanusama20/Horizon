/**
 * ====================================================================
 * HORIZON - SERVER & IP CONFIGURATION FILE
 * ====================================================================
 * 
 * Edit this centralized file to configure your backend server's IP
 * address, port, and connection mode.
 * 
 * Both the Vue client application and the Vite dev proxy will
 * automatically route all API requests (/api/*) to this configured IP.
 * 
 * EXAMPLES:
 *   - Local machine only:   serverIp: '127.0.0.1' or 'localhost'
 *   - Local Wi-Fi / LAN IP: serverIp: '192.168.31.34' (default)
 *   - Custom server host:   serverIp: '192.168.1.100'
 */

export const IP_CONFIG = {
  /**
   * Backend Server IP or Hostname.
   * Change this value whenever your network IP changes.
   */
  serverIp: '192.168.31.34',

  /**
   * Backend Server Port (default: 3001).
   */
  serverPort: 3001,

  /**
   * Protocol to use ('http' or 'https').
   */
  protocol: 'http',

  /**
   * Connection Mode:
   *   - 'direct': Frontend calls http://<serverIp>:<serverPort>/api directly (CORS enabled).
   *   - 'auto'  : Dynamically uses current browser window.location.hostname if available,
   *               otherwise falls back to configured serverIp.
   *   - 'proxy' : Uses relative /api paths routed through Vite dev server proxy.
   */
  mode: 'direct'
};

/**
 * Returns the effective base URL for the backend server.
 * Example: "http://192.168.31.34:3001"
 */
export function getServerBaseUrl() {
  const protocol = IP_CONFIG.protocol || 'http';
  const port = IP_CONFIG.serverPort || 3001;

  if (IP_CONFIG.mode === 'proxy') {
    return '';
  }

  if (IP_CONFIG.mode === 'auto' && typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    // If accessing from a non-localhost host (like mobile on LAN), match that hostname
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `${protocol}://${host}:${port}`;
    }
  }

  const ip = IP_CONFIG.serverIp || '127.0.0.1';
  return `${protocol}://${ip}:${port}`;
}

/**
 * Resolves any API path (e.g. "/api/health") to the absolute URL pointing
 * directly to the configured backend server IP.
 * 
 * @param {string} endpoint - Path like '/api/health' or full URL
 * @returns {string} Fully qualified URL or relative path based on mode
 */
export function getApiUrl(endpoint = '') {
  if (!endpoint) return getServerBaseUrl();
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const baseUrl = getServerBaseUrl();
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${normalized}`;
}

/**
 * Convenience getter for the server health check URL
 */
export function getHealthCheckUrl() {
  return getApiUrl('/api/health');
}
