import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseYouTubeUrl,
  parseIsoDuration,
  formatDuration,
  fetchYouTubePlaylist,
  fetchYouTubeSingleVideo
} from '../../server/youtubeService.js';

describe('YouTube Playlist & Video Ingestion Service (Part B)', () => {
  describe('YouTube URL Parser & Validation (Section 4)', () => {
    it('parses standard playlist URL', () => {
      const res = parseYouTubeUrl('https://www.youtube.com/playlist?list=PL4cUxeGndAe6CT3019383');
      expect(res.valid).toBe(true);
      expect(res.type).toBe('playlist');
      expect(res.playlistId).toBe('PL4cUxeGndAe6CT3019383');
    });

    it('parses video URL containing playlist parameter', () => {
      const res = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOdP_8GztsuKi9vnCAJRjyQV');
      expect(res.valid).toBe(true);
      expect(res.type).toBe('playlist');
      expect(res.playlistId).toBe('PLrAXtmErZgOdP_8GztsuKi9vnCAJRjyQV');
      expect(res.videoId).toBe('dQw4w9WgXcQ');
    });

    it('parses single standard watch video URL', () => {
      const res = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(res.valid).toBe(true);
      expect(res.type).toBe('video');
      expect(res.videoId).toBe('dQw4w9WgXcQ');
    });

    it('parses shortened youtu.be URL', () => {
      const res = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(res.valid).toBe(true);
      expect(res.type).toBe('video');
      expect(res.videoId).toBe('dQw4w9WgXcQ');
    });

    it('parses embedded youtube URL', () => {
      const res = parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(res.valid).toBe(true);
      expect(res.type).toBe('video');
      expect(res.videoId).toBe('dQw4w9WgXcQ');
    });

    it('rejects invalid or non-YouTube URLs', () => {
      expect(parseYouTubeUrl('').valid).toBe(false);
      expect(parseYouTubeUrl('https://udemy.com/course/test').valid).toBe(false);
      expect(parseYouTubeUrl('https://youtube.com/invalid_path').valid).toBe(false);
      expect(parseYouTubeUrl('not a url').valid).toBe(false);
    });
  });

  describe('ISO 8601 Duration Parser (Section 5)', () => {
    it('converts ISO 8601 hours, minutes, and seconds correctly', () => {
      expect(parseIsoDuration('PT1H2M33S')).toBe(3753); // 3600 + 120 + 33
      expect(parseIsoDuration('PT15M33S')).toBe(933);   // 900 + 33
      expect(parseIsoDuration('PT45S')).toBe(45);
      expect(parseIsoDuration('PT2H')).toBe(7200);
      expect(parseIsoDuration('PT10M')).toBe(600);
      expect(parseIsoDuration('')).toBe(0);
      expect(parseIsoDuration(null)).toBe(0);
    });

    it('formats total seconds into mm:ss and hh:mm:ss strings', () => {
      expect(formatDuration(45)).toBe('0:45');
      expect(formatDuration(933)).toBe('15:33');
      expect(formatDuration(3753)).toBe('1:02:33');
      expect(formatDuration(0)).toBe('0:00');
    });
  });

  describe('Official YouTube Data API Integration (Section 5)', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('handles missing API key gracefully', async () => {
      const res = await fetchYouTubePlaylist('PL12345', '');
      expect(res.success).toBe(false);
      expect(res.missingKey).toBe(true);
      expect(res.error).toContain('YOUTUBE_API_KEY');
    });

    it('handles API quota error gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 403,
        ok: false,
        text: () => Promise.resolve('quotaExceeded: Daily Limit for Unauthenticated Use Exceeded')
      });

      const res = await fetchYouTubePlaylist('PL12345', 'dummy_key');
      expect(res.success).toBe(false);
      expect(res.quotaExceeded).toBe(true);
      expect(res.error).toContain('quota limit');
    });

    it('handles network timeout or exception gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));

      const res = await fetchYouTubePlaylist('PL12345', 'dummy_key');
      expect(res.success).toBe(false);
      expect(res.error).toContain('ETIMEDOUT');
    });

    it('successfully extracts playlist, filters deleted videos, and preserves order', async () => {
      const mockMetaResponse = {
        items: [
          {
            snippet: {
              title: 'Learn Vue.js 3 in 2026',
              description: 'Step by step Vue 3 guide',
              channelTitle: 'Tech Academy'
            },
            contentDetails: { itemCount: 3 }
          }
        ]
      };

      const mockItemsResponse = {
        items: [
          {
            snippet: {
              title: '01. Introduction to Vue 3',
              position: 0,
              resourceId: { videoId: 'vid111' },
              description: 'Vue 3 overview'
            }
          },
          {
            snippet: {
              title: 'Private video',
              position: 1,
              resourceId: { videoId: 'vidPrivate' }
            }
          },
          {
            snippet: {
              title: '02. Setup and Vite CLI',
              position: 2,
              resourceId: { videoId: 'vid222' },
              description: 'Setting up project'
            }
          }
        ]
      };

      const mockVideosResponse = {
        items: [
          { id: 'vid111', contentDetails: { duration: 'PT10M' } },
          { id: 'vid222', contentDetails: { duration: 'PT15M30S' } }
        ]
      };

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('playlists?')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockMetaResponse) });
        }
        if (url.includes('playlistItems?')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockItemsResponse) });
        }
        if (url.includes('videos?')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockVideosResponse) });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const res = await fetchYouTubePlaylist('PL12345', 'valid_api_key');
      expect(res.success).toBe(true);
      expect(res.data.title).toBe('Learn Vue.js 3 in 2026');
      expect(res.data.totalVideos).toBe(2); // Private video filtered out!
      expect(res.data.videos[0].title).toBe('01. Introduction to Vue 3');
      expect(res.data.videos[0].durationSeconds).toBe(600);
      expect(res.data.videos[0].formattedDuration).toBe('10:00');
      expect(res.data.videos[1].title).toBe('02. Setup and Vite CLI');
      expect(res.data.videos[1].durationSeconds).toBe(930);
      expect(res.data.videos[1].formattedDuration).toBe('15:30');
    });

    it('supports playlist pagination when videos exceed 50 items', async () => {
      const mockMetaResponse = {
        items: [{ snippet: { title: 'Big Playlist' }, contentDetails: { itemCount: 60 } }]
      };

      const page1Items = Array.from({ length: 50 }, (_, i) => ({
        snippet: { title: `Video ${i + 1}`, position: i, resourceId: { videoId: `v_${i + 1}` } }
      }));

      const page2Items = Array.from({ length: 10 }, (_, i) => ({
        snippet: { title: `Video ${i + 51}`, position: i + 50, resourceId: { videoId: `v_${i + 51}` } }
      }));

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('playlists?')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMetaResponse) });
        }
        if (url.includes('playlistItems?') && !url.includes('pageToken=TOKEN_PAGE_2')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: page1Items, nextPageToken: 'TOKEN_PAGE_2' })
          });
        }
        if (url.includes('pageToken=TOKEN_PAGE_2')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: page2Items, nextPageToken: null })
          });
        }
        if (url.includes('videos?')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const res = await fetchYouTubePlaylist('PL_BIG', 'valid_api_key');
      expect(res.success).toBe(true);
      expect(res.data.totalVideos).toBe(60);
      expect(res.data.videos[0].title).toBe('Video 1');
      expect(res.data.videos[59].title).toBe('Video 60');
    });

    it('fetches single video details accurately', async () => {
      const mockSingleVideo = {
        items: [
          {
            snippet: {
              title: 'Learn JavaScript in 1 Hour',
              description: 'Crash course',
              channelTitle: 'Code Hub'
            },
            contentDetails: { duration: 'PT1H5M' }
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSingleVideo)
      });

      const res = await fetchYouTubeSingleVideo('vidSingle', 'key123');
      expect(res.success).toBe(true);
      expect(res.data.title).toBe('Learn JavaScript in 1 Hour');
      expect(res.data.totalVideos).toBe(1);
      expect(res.data.videos[0].durationSeconds).toBe(3900); // 3600 + 300
      expect(res.data.videos[0].formattedDuration).toBe('1:05:00');
    });
  });
});
