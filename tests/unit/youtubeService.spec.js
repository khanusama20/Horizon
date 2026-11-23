import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseYouTubeUrl,
  parseIsoDuration,
  formatDuration,
  fetchYouTubePlaylist,
  fetchYouTubeSingleVideo,
  handlePlaylistInfoRequest
} from '../../server/youtubeService.js';

describe('Official YouTube Data API v3 Ingestion Service — Required Scenarios', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Scenario 1: Valid playlist URL (https://www.youtube.com/playlist?list=...)
  it('Scenario 1: validates and parses standard playlist URL correctly', () => {
    const res = parseYouTubeUrl('https://www.youtube.com/playlist?list=PL4cUxeGndAe6CT3019383');
    expect(res.valid).toBe(true);
    expect(res.type).toBe('playlist');
    expect(res.playlistId).toBe('PL4cUxeGndAe6CT3019383');
    expect(res.videoId).toBeNull();
  });

  // Scenario 2: Video URL containing a playlist ID (https://www.youtube.com/watch?v=...&list=...)
  it('Scenario 2: parses watch URL containing a playlist ID parameter', () => {
    const res = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOdP_8GztsuKi9vnCAJRjyQV');
    expect(res.valid).toBe(true);
    expect(res.type).toBe('playlist');
    expect(res.playlistId).toBe('PLrAXtmErZgOdP_8GztsuKi9vnCAJRjyQV');
    expect(res.videoId).toBe('dQw4w9WgXcQ');
  });

  // Scenario 3: Invalid YouTube URL (https://udemy.com/... or invalid path)
  it('Scenario 3: rejects non-YouTube or invalid URLs with clear error message', () => {
    const nonYouTube = parseYouTubeUrl('https://www.udemy.com/course/modern-javascript/');
    expect(nonYouTube.valid).toBe(false);
    expect(nonYouTube.error).toContain('Not a YouTube domain');

    const empty = parseYouTubeUrl('');
    expect(empty.valid).toBe(false);

    const malformed = parseYouTubeUrl('invalid_string_not_url');
    expect(malformed.valid).toBe(false);
  });

  // Scenario 4: URL without a playlist ID (e.g. single video watch URL)
  it('Scenario 4: identifies watch URL without playlist ID as single video (playlistId is null)', () => {
    const res = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(res.valid).toBe(true);
    expect(res.type).toBe('video');
    expect(res.playlistId).toBeNull();
    expect(res.videoId).toBe('dQw4w9WgXcQ');
  });

  // Scenario 5: Missing API key (returns HTTP 500 & MISSING_API_KEY)
  it('Scenario 5: returns HTTP 500 and MISSING_API_KEY when API key is not configured', async () => {
    const res = await fetchYouTubePlaylist('PL12345', '');
    expect(res.success).toBe(false);
    expect(res.httpStatus).toBe(500);
    expect(res.error).toBeDefined();
    expect(res.error.code).toBe('MISSING_API_KEY');
    expect(res.error.message).toContain('YOUTUBE_API_KEY');
  });

  // Scenario 6: Empty playlist (returns HTTP 404 & EMPTY_PLAYLIST or PLAYLIST_NOT_FOUND)
  it('Scenario 6: returns HTTP 404 and PLAYLIST_NOT_FOUND when playlist does not exist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [] })
    });

    const res = await fetchYouTubePlaylist('PL_NONEXISTENT', 'dummy_api_key');
    expect(res.success).toBe(false);
    expect(res.httpStatus).toBe(404);
    expect(res.error.code).toBe('PLAYLIST_NOT_FOUND');
    expect(res.error.message).toContain('not found or is set to private');
  });

  it('Scenario 6b: returns HTTP 404 and EMPTY_PLAYLIST when playlist has only deleted/empty videos', async () => {
    const mockMeta = {
      items: [{ snippet: { title: 'Empty Playlist' }, contentDetails: { itemCount: 0 } }]
    };
    const mockItems = {
      items: [
        { snippet: { title: 'Deleted video', resourceId: { videoId: 'del1' } } }
      ]
    };

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('playlists?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockMeta) });
      }
      if (url.includes('playlistItems?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockItems) });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const res = await fetchYouTubePlaylist('PL_EMPTY', 'dummy_api_key');
    expect(res.success).toBe(false);
    expect(res.httpStatus).toBe(404);
    expect(res.error.code).toBe('EMPTY_PLAYLIST');
    expect(res.error.message).toContain('no available or public videos');
  });

  // Scenario 7: Playlist with more than 50 videos (pagination with nextPageToken)
  it('Scenario 7: supports playlist pagination when videos exceed 50 items and preserves order', async () => {
    const mockMeta = {
      items: [{ snippet: { title: 'Full Course 60 Lessons' }, contentDetails: { itemCount: 60 } }]
    };

    const page1Items = Array.from({ length: 50 }, (_, i) => ({
      snippet: { title: `Lesson ${i + 1}`, position: i, resourceId: { videoId: `vid_${i + 1}` } }
    }));

    const page2Items = Array.from({ length: 10 }, (_, i) => ({
      snippet: { title: `Lesson ${i + 51}`, position: i + 50, resourceId: { videoId: `vid_${i + 51}` } }
    }));

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('playlists?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockMeta) });
      }
      if (url.includes('playlistItems?') && !url.includes('pageToken=PAGE2_TOKEN')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: page1Items, nextPageToken: 'PAGE2_TOKEN' })
        });
      }
      if (url.includes('pageToken=PAGE2_TOKEN')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: page2Items, nextPageToken: null })
        });
      }
      if (url.includes('videos?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items: [] }) });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const res = await fetchYouTubePlaylist('PL_PAGINATED', 'dummy_api_key');
    expect(res.success).toBe(true);
    expect(res.data.totalVideos).toBe(60);
    expect(res.data.videos[0].title).toBe('Lesson 1');
    expect(res.data.videos[0].position).toBe(0);
    expect(res.data.videos[59].title).toBe('Lesson 60');
    expect(res.data.videos[59].position).toBe(59);
  });

  // Scenario 8: Deleted or unavailable videos (Private video, Deleted video filtered out)
  it('Scenario 8: filters out deleted, private, or unavailable videos while retaining valid items', async () => {
    const mockMeta = {
      items: [{ snippet: { title: 'Vue Mastery' }, contentDetails: { itemCount: 4 } }]
    };

    const mockItems = {
      items: [
        {
          snippet: {
            title: '01 - Welcome & Setup',
            position: 0,
            resourceId: { videoId: 'v1' },
            description: 'Intro lesson'
          }
        },
        {
          snippet: {
            title: 'Private video',
            position: 1,
            resourceId: { videoId: 'v2_priv' }
          }
        },
        {
          snippet: {
            title: 'Deleted video',
            position: 2,
            resourceId: { videoId: 'v3_del' }
          }
        },
        {
          snippet: {
            title: '02 - Reactivity in Depth',
            position: 3,
            resourceId: { videoId: 'v4' },
            description: 'Reactivity lesson'
          }
        }
      ]
    };

    const mockVideos = {
      items: [
        { id: 'v1', contentDetails: { duration: 'PT5M30S' } },
        { id: 'v4', contentDetails: { duration: 'PT12M00S' } }
      ]
    };

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('playlists?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockMeta) });
      }
      if (url.includes('playlistItems?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockItems) });
      }
      if (url.includes('videos?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockVideos) });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const res = await fetchYouTubePlaylist('PL_FILTER_TEST', 'dummy_api_key');
    expect(res.success).toBe(true);
    expect(res.data.totalVideos).toBe(2);
    expect(res.data.videos[0].title).toBe('01 - Welcome & Setup');
    expect(res.data.videos[0].durationSeconds).toBe(330);
    expect(res.data.videos[0].formattedDuration).toBe('5:30');
    expect(res.data.videos[1].title).toBe('02 - Reactivity in Depth');
    expect(res.data.videos[1].durationSeconds).toBe(720);
    expect(res.data.videos[1].formattedDuration).toBe('12:00');
  });

  // Scenario 9: YouTube API quota / error response (QUOTA_EXCEEDED, status 429)
  it('Scenario 9: handles quotaExceeded response with HTTP 429 and structured QUOTA_EXCEEDED error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
      text: () => Promise.resolve('quotaExceeded: The request cannot be completed because you have exceeded your quota.')
    });

    const res = await fetchYouTubePlaylist('PL_QUOTA', 'dummy_api_key');
    expect(res.success).toBe(false);
    expect(res.httpStatus).toBe(429);
    expect(res.error.code).toBe('QUOTA_EXCEEDED');
    expect(res.error.message).toContain('quota limit');
  });

  it('Scenario 9b: handles network timeout / exception gracefully with HTTP 500 and INTERNAL_ERROR', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ETIMEDOUT: Connection timed out'));

    const res = await fetchYouTubePlaylist('PL_TIMEOUT', 'dummy_api_key');
    expect(res.success).toBe(false);
    expect(res.httpStatus).toBe(500);
    expect(res.error.code).toBe('INTERNAL_ERROR');
    expect(res.error.message).toContain('ETIMEDOUT');
  });

  // Scenario 10: Frontend compatibility with normalized response
  it('Scenario 10: produces normalized response contract expected by frontend', async () => {
    const mockMeta = {
      items: [
        {
          snippet: {
            title: 'Full Stack Node.js & Vue Course',
            description: 'Learn modern web development from scratch.',
            channelTitle: 'WebDev Pro',
            thumbnails: {
              medium: { url: 'https://i.ytimg.com/vi/thumb.jpg' }
            }
          },
          contentDetails: { itemCount: 1 }
        }
      ]
    };

    const mockItems = {
      items: [
        {
          snippet: {
            title: 'Episode 1: Architecture Foundations',
            position: 0,
            description: 'Understanding REST and State',
            resourceId: { videoId: 'nodeVue1' },
            thumbnails: {
              medium: { url: 'https://i.ytimg.com/vi/nodeVue1/mqdefault.jpg' }
            }
          }
        }
      ]
    };

    const mockVideos = {
      items: [
        { id: 'nodeVue1', contentDetails: { duration: 'PT45M30S' } }
      ]
    };

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('playlists?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockMeta) });
      }
      if (url.includes('playlistItems?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockItems) });
      }
      if (url.includes('videos?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockVideos) });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const res = await fetchYouTubePlaylist('PL_NORM_TEST', 'dummy_api_key');
    expect(res.success).toBe(true);
    const data = res.data;

    // Verify all top-level required properties
    expect(data.provider).toBe('youtube');
    expect(data.playlistId).toBe('PL_NORM_TEST');
    expect(data.title).toBe('Full Stack Node.js & Vue Course');
    expect(data.description).toBe('Learn modern web development from scratch.');
    expect(data.thumbnail).toBe('https://i.ytimg.com/vi/thumb.jpg');
    expect(data.channelTitle).toBe('WebDev Pro');
    expect(data.totalVideos).toBe(1);
    expect(data.totalDurationSeconds).toBe(2730); // 45*60 + 30
    expect(data.formattedTotalDuration).toBe('45:30');

    // Verify video item properties
    expect(data.videos).toHaveLength(1);
    const video = data.videos[0];
    expect(video.videoId).toBe('nodeVue1');
    expect(video.title).toBe('Episode 1: Architecture Foundations');
    expect(video.description).toBe('Understanding REST and State');
    expect(video.thumbnail).toBe('https://i.ytimg.com/vi/nodeVue1/mqdefault.jpg');
    expect(video.position).toBe(0);
    expect(video.videoUrl).toBe('https://www.youtube.com/watch?v=nodeVue1');
    expect(video.duration).toBe('45:30');
    expect(video.durationSeconds).toBe(2730);
    expect(video.formattedDuration).toBe('45:30');

    // Verify rawSections compatibility for milestone plan generation
    expect(data.rawSections).toHaveLength(1);
    expect(data.rawSections[0].title).toBe('Episode 1: Architecture Foundations');
    expect(data.rawSections[0].video.videoId).toBe('nodeVue1');
    expect(data.rawSections[0].video.durationSeconds).toBe(2730);
  });
});

describe('ISO 8601 Duration Parser & Formatter', () => {
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

describe('Single Video Details Fetcher', () => {
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

describe('Endpoint Request Handler — POST /api/youtube/playlist-info Contract', () => {
  it('returns HTTP 400 with INVALID_URL when body or url is missing', async () => {
    const res = await handlePlaylistInfoRequest({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_URL');
  });

  it('returns HTTP 400 with INVALID_URL when given an invalid non-YouTube URL', async () => {
    const res = await handlePlaylistInfoRequest({ url: 'https://udemy.com/course/not-youtube' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_URL');
  });

  it('returns HTTP 400 with MISSING_PLAYLIST_ID when given a single video watch URL without list=', async () => {
    const res = await handlePlaylistInfoRequest({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_PLAYLIST_ID');
    expect(res.body.error.message).toContain('does not contain a playlist ID');
  });

  it('returns HTTP 500 with MISSING_API_KEY when API key is missing', async () => {
    const res = await handlePlaylistInfoRequest(
      { url: 'https://www.youtube.com/playlist?list=PL123' },
      '' // Empty API key passed explicitly
    );
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_API_KEY');
  });

  it('returns HTTP 200 with normalized data when playlist extraction succeeds', async () => {
    const mockMeta = {
      items: [
        {
          snippet: { title: 'Test Playlist', description: '', channelTitle: 'Test' },
          contentDetails: { itemCount: 1 }
        }
      ]
    };
    const mockItems = {
      items: [
        { snippet: { title: 'Lesson 1', resourceId: { videoId: 'v1' } } }
      ]
    };
    const mockVideos = {
      items: [
        { id: 'v1', contentDetails: { duration: 'PT10M' } }
      ]
    };

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('playlists?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockMeta) });
      }
      if (url.includes('playlistItems?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockItems) });
      }
      if (url.includes('videos?')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockVideos) });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const res = await handlePlaylistInfoRequest(
      { url: 'https://www.youtube.com/playlist?list=PL123' },
      'valid_test_key'
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.playlistId).toBe('PL123');
    expect(res.body.data.videos).toHaveLength(1);
  });
});
