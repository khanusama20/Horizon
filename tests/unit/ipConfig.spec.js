import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IP_CONFIG, getServerBaseUrl, getApiUrl, getHealthCheckUrl } from '../../src/config/ipConfig.js';
import { apiFetch, checkServerHealth, uploadTempImageApi, cleanupTempImageApi } from '../../src/services/apiClient.js';

describe('Centralized Server & IP Configuration', () => {
  const originalConfig = { ...IP_CONFIG };

  beforeEach(() => {
    Object.assign(IP_CONFIG, originalConfig);
  });

  afterEach(() => {
    Object.assign(IP_CONFIG, originalConfig);
  });

  it('provides default server IP configured as 192.168.31.34:3001', () => {
    expect(IP_CONFIG.serverIp).toBe('192.168.31.34');
    expect(IP_CONFIG.serverPort).toBe(3001);
    expect(IP_CONFIG.protocol).toBe('http');
  });

  it('getServerBaseUrl correctly formats HTTP base URL in direct mode', () => {
    IP_CONFIG.mode = 'direct';
    IP_CONFIG.serverIp = '192.168.31.34';
    IP_CONFIG.serverPort = 3001;
    expect(getServerBaseUrl()).toBe('http://192.168.31.34:3001');
  });

  it('getServerBaseUrl returns empty string in proxy mode', () => {
    IP_CONFIG.mode = 'proxy';
    expect(getServerBaseUrl()).toBe('');
  });

  it('getApiUrl resolves endpoint with leading slash', () => {
    IP_CONFIG.mode = 'direct';
    IP_CONFIG.serverIp = '192.168.31.34';
    IP_CONFIG.serverPort = 3001;
    expect(getApiUrl('/api/health')).toBe('http://192.168.31.34:3001/api/health');
    expect(getApiUrl('api/course-info/extract')).toBe('http://192.168.31.34:3001/api/course-info/extract');
  });

  it('getApiUrl preserves already qualified external URLs', () => {
    const external = 'https://example.com/api/test';
    expect(getApiUrl(external)).toBe(external);
  });

  it('getHealthCheckUrl points directly to health check on configured IP', () => {
    IP_CONFIG.mode = 'direct';
    IP_CONFIG.serverIp = '192.168.31.34';
    IP_CONFIG.serverPort = 3001;
    expect(getHealthCheckUrl()).toBe('http://192.168.31.34:3001/api/health');
  });

  it('changing serverIp immediately updates resolved API URLs', () => {
    IP_CONFIG.serverIp = '10.0.0.99';
    IP_CONFIG.serverPort = 8080;
    expect(getServerBaseUrl()).toBe('http://10.0.0.99:8080');
    expect(getApiUrl('/api/test')).toBe('http://10.0.0.99:8080/api/test');
  });

  describe('API Client Service with Centralized IP', () => {
    it('apiFetch calls global fetch with the resolved IP url', async () => {
      const originalFetch = global.fetch;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' })
      });
      global.fetch = mockFetch;

      try {
        IP_CONFIG.mode = 'direct';
        IP_CONFIG.serverIp = '192.168.31.34';
        IP_CONFIG.serverPort = 3001;

        await apiFetch('/api/test-call', { method: 'GET' });
        expect(mockFetch).toHaveBeenCalledWith('http://192.168.31.34:3001/api/test-call', { method: 'GET' });
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('checkServerHealth returns online: true when health check succeeds', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', service: 'horizon-metadata-proxy' })
      });

      try {
        const status = await checkServerHealth();
        expect(status.online).toBe(true);
        expect(status.data?.status).toBe('ok');
        expect(status.url).toContain('3001/api/health');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('checkServerHealth returns online: false on network error', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      try {
        const status = await checkServerHealth();
        expect(status.online).toBe(false);
        expect(status.error).toContain('Connection refused');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('cleanupTempImageApi dispatches cleanup request for given filename', async () => {
      const originalFetch = global.fetch;
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
      global.fetch = mockFetch;

      try {
        await cleanupTempImageApi('temp-12345.png');
        expect(mockFetch).toHaveBeenCalled();
        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[0]).toContain('/api/wallpaper/cleanup-temp');
        expect(callArgs[1].body).toContain('temp-12345.png');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
