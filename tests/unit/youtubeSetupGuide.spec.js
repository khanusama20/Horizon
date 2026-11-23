import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import {
  categorizeYouTubeApiError,
  parseYouTubeUrl,
  fetchYouTubePlaylist
} from '../../server/youtubeService.js';
import { checkYouTubeApiStatus } from '../../src/services/apiClient.js';
import YouTubeSetupGuideModal from '../../src/components/youtube/YouTubeSetupGuideModal.vue';
import fs from 'node:fs';
import path from 'node:path';

describe('Judge-Friendly YouTube API Setup Guide & Error Detection', () => {
  let mountedApps = [];
  const originalFetch = global.fetch;

  function mountComponent(Component, props = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp({
      render() {
        return h(Component, props);
      }
    });

    app.mount(container);
    mountedApps.push({ app, container });

    return {
      el: document.body.querySelector('.youtube-guide-modal-backdrop') || container.firstElementChild,
      container,
      app
    };
  }

  afterEach(() => {
    mountedApps.forEach(({ app, container }) => {
      app.unmount();
      container.remove();
    });
    mountedApps = [];
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.youtube-guide-modal-backdrop').forEach(el => el.remove());
    }
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. BACKEND ERROR DIFFERENTIATION & SECURITY
  // =========================================================================
  describe('Backend Error Categorization (server/youtubeService.js)', () => {
    it('SG-01: categorizes missing API key cleanly without leaking any secrets', async () => {
      const res = await fetchYouTubePlaylist('PL12345678', '');
      expect(res.success).toBe(false);
      expect(res.httpStatus).toBe(500);
      expect(res.error.code).toBe('MISSING_API_KEY');
      expect(res.error.message).toContain('YOUTUBE_API_KEY');
      expect(res.error.message).not.toContain('undefined');
    });

    it('SG-02: differentiates invalid API key (API_KEY_INVALID / keyInvalid)', () => {
      const err = categorizeYouTubeApiError(400, '{"error":{"message":"API key not valid. Please pass a valid API key.","errors":[{"reason":"keyInvalid"}]}}');
      expect(err.code).toBe('INVALID_API_KEY');
      expect(err.httpStatus).toBe(400);
      expect(err.message).toContain('invalid or unauthorized');
      expect(err.message).toContain('https://console.cloud.google.com/apis/credentials');
    });

    it('SG-03: differentiates API not enabled in Google Cloud Project (accessNotConfigured)', () => {
      const err = categorizeYouTubeApiError(403, '{"error":{"message":"YouTube Data API v3 has not been used in project 123456 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/youtube.googleapis.com/overview?project=123456 then retry.","errors":[{"reason":"accessNotConfigured"}]}}');
      expect(err.code).toBe('API_NOT_ENABLED');
      expect(err.httpStatus).toBe(403);
      expect(err.message).toContain('not enabled in your Google Cloud Project');
      expect(err.message).toContain('https://console.cloud.google.com/apis/library/youtube.googleapis.com');
    });

    it('SG-04: differentiates quota exceeded (quotaExceeded)', () => {
      const err = categorizeYouTubeApiError(403, '{"error":{"message":"The request cannot be completed because you have exceeded your quota.","errors":[{"reason":"quotaExceeded"}]}}');
      expect(err.code).toBe('QUOTA_EXCEEDED');
      expect(err.httpStatus).toBe(429);
      expect(err.message).toContain('quota limit exceeded');
    });

    it('SG-05: handles generic 403 forbidden and server errors safely', () => {
      const forbidden = categorizeYouTubeApiError(403, 'Access denied');
      expect(forbidden.code).toBe('UPSTREAM_API_ERROR');
      expect(forbidden.httpStatus).toBe(403);

      const serverErr = categorizeYouTubeApiError(500, 'Internal Server Error');
      expect(serverErr.code).toBe('UPSTREAM_API_ERROR');
      expect(serverErr.httpStatus).toBe(502);
    });
  });

  // =========================================================================
  // 2. SAFE API CLIENT STATUS DETECTION
  // =========================================================================
  describe('Safe API Key Detection (src/services/apiClient.js)', () => {
    it('SG-06: checkYouTubeApiStatus returns online=true, apiKeyConfigured=true when key is present', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'ok', apiKeyConfigured: true, service: 'youtube-data-api-v3' })
      });

      const res = await checkYouTubeApiStatus();
      expect(res.online).toBe(true);
      expect(res.apiKeyConfigured).toBe(true);
    });

    it('SG-07: checkYouTubeApiStatus returns online=true, apiKeyConfigured=false when key is absent', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'ok', apiKeyConfigured: false, service: 'youtube-data-api-v3' })
      });

      const res = await checkYouTubeApiStatus();
      expect(res.online).toBe(true);
      expect(res.apiKeyConfigured).toBe(false);
    });

    it('SG-08: checkYouTubeApiStatus detects server offline without claiming key is missing', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (connection refused)'));

      const res = await checkYouTubeApiStatus();
      expect(res.online).toBe(false);
      expect(res.apiKeyConfigured).toBe(false);
      expect(res.error).toContain('Failed to fetch');
    });
  });

  // =========================================================================
  // 3. STEP-BY-STEP SETUP GUIDE MODAL (YouTubeSetupGuideModal.vue)
  // =========================================================================
  describe('Judge-Friendly Setup Guide Modal (YouTubeSetupGuideModal.vue)', () => {
    it('SG-09: renders all 6 numbered steps with clear instructions', async () => {
      const { el } = mountComponent(YouTubeSetupGuideModal, {
        modelValue: true,
        apiKeyConfigured: false,
        isServerOnline: true
      });
      await nextTick();

      expect(el).not.toBeNull();
      const text = el.textContent;

      // Header & Title
      expect(text).toContain('YouTube API Setup Guide');
      expect(text).toContain('Google Cloud Setup');

      // 6 Step Headings
      expect(text).toContain('Open Google Cloud Console');
      expect(text).toContain('Create a Google Cloud Project');
      expect(text).toContain('Enable YouTube Data API v3');
      expect(text).toContain('Create an API Key');
      expect(text).toContain('Configure the API Key in Horizon');
      expect(text).toContain('Verify the Integration');
    });

    it('SG-10: contains direct official Google Cloud links for all external resources', async () => {
      const { el } = mountComponent(YouTubeSetupGuideModal, {
        modelValue: true,
        apiKeyConfigured: false,
        isServerOnline: true
      });
      await nextTick();

      const links = Array.from(el.querySelectorAll('a[href]')).map(a => a.getAttribute('href'));

      // Official Google links verified
      expect(links).toContain('https://console.cloud.google.com/');
      expect(links).toContain('https://console.cloud.google.com/apis/library/youtube.googleapis.com');
      expect(links).toContain('https://console.cloud.google.com/apis/credentials');
    });

    it('SG-11: contains the exact required .env configuration snippet and sample test playlist', async () => {
      const { el } = mountComponent(YouTubeSetupGuideModal, {
        modelValue: true,
        apiKeyConfigured: false,
        isServerOnline: true
      });
      await nextTick();

      const text = el.textContent;
      expect(text).toContain('YOUTUBE_API_KEY=YOUR_GOOGLE_YOUTUBE_API_KEY');
      expect(text).toContain('https://www.youtube.com/playlist?list=PLF532WzyVstQ');
    });

    it('SG-12: displays status banner dynamically matching backend configuration', async () => {
      // Case 1: Missing Key
      const res1 = mountComponent(YouTubeSetupGuideModal, {
        modelValue: true,
        apiKeyConfigured: false,
        isServerOnline: true
      });
      await nextTick();
      expect(res1.el.textContent).toContain('YouTube Setup Required');
      res1.app.unmount();
      res1.container.remove();
      document.querySelectorAll('.youtube-guide-modal-backdrop').forEach(el => el.remove());

      // Case 2: Configured Key
      const res2 = mountComponent(YouTubeSetupGuideModal, {
        modelValue: true,
        apiKeyConfigured: true,
        isServerOnline: true
      });
      await nextTick();
      expect(res2.el.textContent).toContain('API Key Configured & Active');
      res2.app.unmount();
      res2.container.remove();
      document.querySelectorAll('.youtube-guide-modal-backdrop').forEach(el => el.remove());

      // Case 3: Server Offline
      const res3 = mountComponent(YouTubeSetupGuideModal, {
        modelValue: true,
        apiKeyConfigured: false,
        isServerOnline: false
      });
      await nextTick();
      expect(res3.el.textContent).toContain('Backend Server Standby');
      res3.app.unmount();
      res3.container.remove();
      document.querySelectorAll('.youtube-guide-modal-backdrop').forEach(el => el.remove());
    });

    it('SG-13: emits update:modelValue and refresh-status events on user actions', async () => {
      let closedValue = null;
      let refreshFired = false;

      const container = document.createElement('div');
      document.body.appendChild(container);

      const app = createApp({
        render() {
          return h(YouTubeSetupGuideModal, {
            modelValue: true,
            apiKeyConfigured: false,
            isServerOnline: true,
            'onUpdate:modelValue': (val) => { closedValue = val; },
            onRefreshStatus: () => { refreshFired = true; }
          });
        }
      });

      app.mount(container);
      mountedApps.push({ app, container });
      await nextTick();

      const el = document.body.querySelector('.youtube-guide-modal-backdrop') || container.firstElementChild;

      // Click close button
      const closeBtn = el.querySelector('.guide-close-btn');
      expect(closeBtn).not.toBeNull();
      closeBtn.click();
      expect(closedValue).toBe(false);

      // Click refresh status button
      const refreshBtn = el.querySelector('.refresh-status-btn');
      expect(refreshBtn).not.toBeNull();
      refreshBtn.click();
      expect(refreshFired).toBe(true);
    });

    it('SG-14: GoalForm isolates YouTube setup notice strictly to YouTube source mode', () => {
      const goalFormPath = path.resolve(process.cwd(), 'src/components/goals/GoalForm.vue');
      const content = fs.readFileSync(goalFormPath, 'utf-8');

      // Notice card must be nested inside v-else-if="selectedSourceMode === 'youtube'"
      expect(content).toContain("v-else-if=\"selectedSourceMode === 'youtube'\"");
      expect(content).toContain('youtube-setup-notice-card');
      expect(content).toContain('YouTube Setup Required');
      expect(content).toContain('How to Get Your API Key');
      expect(content).toContain("I'll Configure It Later");

      // Verify Udemy section has no YouTube setup notice
      const udemySection = content.split("selectedSourceMode === 'udemy'")[1]?.split("selectedSourceMode === 'youtube'")[0];
      expect(udemySection).toBeDefined();
      expect(udemySection).not.toContain('YouTube Setup Required');

      // Verify Manual section has no YouTube setup notice
      const manualSection = content.split("selectedSourceMode === 'manual'")[1]?.split("</v-sheet>")[0];
      expect(manualSection).toBeDefined();
      expect(manualSection).not.toContain('YouTube Setup Required');
    });

    it('SG-15: .env.example documents YOUTUBE_API_KEY with empty placeholder and no hardcoded secret', () => {
      const envExamplePath = path.resolve(process.cwd(), '.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      expect(content).toContain('YOUTUBE_API_KEY=');
      expect(content).toContain('https://console.cloud.google.com/apis/credentials');
      expect(content).toContain('https://console.cloud.google.com/apis/library/youtube.googleapis.com');

      // Ensure no actual key value is present in .env.example
      const lines = content.split('\n').map(l => l.trim());
      const keyLine = lines.find(l => l.startsWith('YOUTUBE_API_KEY='));
      expect(keyLine).toBe('YOUTUBE_API_KEY=');
    });
  });
});
