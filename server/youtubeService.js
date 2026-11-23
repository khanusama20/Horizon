/**
 * Horizon YouTube Data API v3 Ingestion Service
 * 
 * Provides official YouTube Data API v3 integration for extracting
 * playlist metadata, videos list, and video durations without web scraping.
 * 
 * Requirements:
 * - Server-side only (API key never exposed to client).
 * - Full pagination support for playlists > 50 videos via nextPageToken.
 * - Filters out deleted and private videos while preserving playlist position order.
 * - Converts ISO 8601 duration strings (PT1H20M30S) into seconds and formatted strings.
 * - Standardized structured error responses ({ success: false, error: { code, message } }).
 */

/**
 * Validates and extracts playlist ID and/or video ID from any YouTube URL
 * 
 * Supported formats:
 *   1. https://www.youtube.com/playlist?list=PLAYLIST_ID
 *   2. https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
 *   3. https://www.youtube.com/watch?v=VIDEO_ID
 *   4. https://youtu.be/VIDEO_ID
 *   5. https://www.youtube.com/embed/VIDEO_ID
 * 
 * @param {string} rawUrl - Input URL string
 * @returns {{ valid: boolean, type?: 'playlist'|'video', playlistId?: string|null, videoId?: string|null, error?: string }}
 */
export function parseYouTubeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Please enter a valid YouTube URL' };
  }

  const trimmed = rawUrl.trim();

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase().replace('www.', '').replace('m.', '');

    const isYouTubeDomain = host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com');
    if (!isYouTubeDomain) {
      return { valid: false, error: 'Not a YouTube domain. Please enter a valid YouTube URL.' };
    }

    // 1. Check for playlist parameter 'list'
    const listId = url.searchParams.get('list');
    if (listId) {
      // Clean playlist ID (alphanumeric, underscores, hyphens)
      if (/^[a-zA-Z0-9_-]+$/.test(listId)) {
        const videoId = url.searchParams.get('v') || null;
        return {
          valid: true,
          type: 'playlist',
          playlistId: listId,
          videoId: videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null
        };
      }
    }

    // 2. Shortened youtu.be/VIDEO_ID format
    if (host === 'youtu.be') {
      const vid = url.pathname.slice(1).split('/')[0];
      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid)) {
        return { valid: true, type: 'video', playlistId: null, videoId: vid };
      }
    }

    // 3. Standard /watch?v=VIDEO_ID
    const vidParam = url.searchParams.get('v');
    if (vidParam && /^[a-zA-Z0-9_-]{11}$/.test(vidParam)) {
      return { valid: true, type: 'video', playlistId: null, videoId: vidParam };
    }

    // 4. Embedded /embed/VIDEO_ID
    if (url.pathname.startsWith('/embed/')) {
      const vid = url.pathname.split('/')[2];
      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid)) {
        return { valid: true, type: 'video', playlistId: null, videoId: vid };
      }
    }

    return {
      valid: false,
      error: 'Unrecognized YouTube format. Please provide a playlist link (list=...) or video link (watch?v=...).'
    };
  } catch {
    return { valid: false, error: 'Malformed URL. Please enter a full http:// or https:// YouTube link.' };
  }
}

/**
 * Parses an ISO 8601 duration string (e.g. "PT1H20M30S", "PT15M30S", "PT45S") into total seconds.
 * 
 * @param {string} isoDuration - ISO 8601 duration string
 * @returns {number} Duration in seconds
 */
export function parseIsoDuration(isoDuration) {
  if (!isoDuration || typeof isoDuration !== 'string') return 0;

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats total seconds into human-readable duration (e.g. "15:33" or "1:20:30")
 * 
 * @param {number} totalSeconds - Duration in seconds
 * @returns {string} Formatted string
 */
export function formatDuration(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '0:00';

  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Fetches playlist metadata and all video items using the official YouTube Data API v3.
 * 
 * @param {string} playlistId - YouTube playlist ID
 * @param {string} apiKey - YouTube Data API Key
 * @param {number} [maxVideos=150] - Safety ceiling for pagination
 * @returns {Promise<{ success: boolean, httpStatus?: number, error?: { code: string, message: string }, data?: object }>}
 */
export async function fetchYouTubePlaylist(playlistId, apiKey, maxVideos = 150) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return {
      success: false,
      httpStatus: 500,
      error: {
        code: 'MISSING_API_KEY',
        message: 'YouTube API key is not configured on the server. Please set YOUTUBE_API_KEY environment variable.'
      }
    };
  }

  const cleanKey = apiKey.trim();

  try {
    // 1. Fetch Playlist Metadata (playlists.list)
    const playlistMetaUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(cleanKey)}`;
    const metaRes = await fetch(playlistMetaUrl);

    if (metaRes.status === 403 || metaRes.status === 429) {
      const errBody = await metaRes.text().catch(() => '');
      if (errBody.includes('quotaExceeded')) {
        return {
          success: false,
          httpStatus: 429,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: 'YouTube API daily quota limit exceeded. Please try again later or use the Manual Syllabus option.'
          }
        };
      }
      return {
        success: false,
        httpStatus: 403,
        error: {
          code: 'UPSTREAM_API_ERROR',
          message: 'YouTube API request was rejected. Verify that YouTube Data API v3 is enabled on your API key.'
        }
      };
    }

    if (!metaRes.ok) {
      const upstreamStatus = metaRes.status >= 500 ? 502 : metaRes.status;
      return {
        success: false,
        httpStatus: upstreamStatus,
        error: {
          code: 'UPSTREAM_API_ERROR',
          message: `YouTube Data API returned HTTP ${metaRes.status}: Unable to retrieve playlist details.`
        }
      };
    }

    const metaData = await metaRes.json();
    if (!metaData.items || metaData.items.length === 0) {
      return {
        success: false,
        httpStatus: 404,
        error: {
          code: 'PLAYLIST_NOT_FOUND',
          message: 'YouTube playlist not found or is set to private. Please check the playlist link and privacy settings.'
        }
      };
    }

    const playlistItem = metaData.items[0];
    const playlistTitle = playlistItem.snippet?.title || 'YouTube Playlist';
    const playlistDescription = playlistItem.snippet?.description || '';
    const channelTitle = playlistItem.snippet?.channelTitle || '';
    const thumbnail = playlistItem.snippet?.thumbnails?.medium?.url || playlistItem.snippet?.thumbnails?.default?.url || null;

    // 2. Fetch Playlist Items with Pagination (playlistItems.list)
    const rawVideos = [];
    let pageToken = '';

    while (rawVideos.length < maxVideos) {
      let pageUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(cleanKey)}`;
      if (pageToken) {
        pageUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const itemsRes = await fetch(pageUrl);
      if (!itemsRes.ok) {
        if (itemsRes.status === 403 || itemsRes.status === 429) {
          const errBody = await itemsRes.text().catch(() => '');
          if (errBody.includes('quotaExceeded')) {
            return {
              success: false,
              httpStatus: 429,
              error: {
                code: 'QUOTA_EXCEEDED',
                message: 'YouTube API daily quota limit exceeded.'
              }
            };
          }
        }
        break;
      }

      const itemsData = await itemsRes.json();
      const pageItems = itemsData.items || [];

      for (const item of pageItems) {
        const title = item.snippet?.title || '';
        const videoId = item.snippet?.resourceId?.videoId;

        // Filter out deleted, private, or unavailable videos
        const isUnavailable =
          title === 'Private video' ||
          title === 'Deleted video' ||
          !videoId ||
          title.toLowerCase().includes('private video') ||
          title.toLowerCase().includes('deleted video');

        if (!isUnavailable) {
          rawVideos.push({
            videoId,
            title,
            description: item.snippet?.description || '',
            position: item.snippet?.position ?? rawVideos.length,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
            thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null
          });
        }
      }

      pageToken = itemsData.nextPageToken;
      if (!pageToken) break;
    }

    if (rawVideos.length === 0) {
      return {
        success: false,
        httpStatus: 404,
        error: {
          code: 'EMPTY_PLAYLIST',
          message: 'This playlist contains no available or public videos.'
        }
      };
    }

    // 3. Batch fetch durations via videos.list (up to 50 per batch)
    const durationMap = new Map();
    for (let i = 0; i < rawVideos.length; i += 50) {
      const chunkIds = rawVideos.slice(i, i + 50).map(v => v.videoId).join(',');
      try {
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${encodeURIComponent(chunkIds)}&key=${encodeURIComponent(cleanKey)}`;
        const vRes = await fetch(videosUrl);
        if (vRes.ok) {
          const vData = await vRes.json();
          for (const vid of vData.items || []) {
            const durationSec = parseIsoDuration(vid.contentDetails?.duration);
            durationMap.set(vid.id, durationSec);
          }
        }
      } catch {
        // Fall back gracefully if duration enrichment fails
      }
    }

    // 4. Enrich videos with durations and format preserving exact playlist order
    let totalDurationSeconds = 0;
    const finalVideos = rawVideos.map((v, index) => {
      const durSec = durationMap.get(v.videoId) || 0;
      totalDurationSeconds += durSec;
      const formatted = formatDuration(durSec);
      return {
        videoId: v.videoId,
        title: v.title,
        description: v.description,
        thumbnail: v.thumbnail,
        thumbnailUrl: v.thumbnailUrl,
        position: v.position ?? index,
        videoUrl: v.videoUrl,
        duration: formatted,
        durationSeconds: durSec,
        formattedDuration: formatted
      };
    });

    return {
      success: true,
      data: {
        provider: 'youtube',
        playlistId,
        title: playlistTitle,
        description: playlistDescription,
        thumbnail,
        channelTitle,
        totalVideos: finalVideos.length,
        totalDurationSeconds,
        formattedTotalDuration: formatDuration(totalDurationSeconds),
        videos: finalVideos,
        // Raw sections format for milestone engine compatibility
        rawSections: finalVideos.map(v => ({
          title: v.title,
          video: {
            videoId: v.videoId,
            videoUrl: v.videoUrl,
            durationSeconds: v.durationSeconds,
            formattedDuration: v.duration
          }
        }))
      }
    };
  } catch (err) {
    return {
      success: false,
      httpStatus: 500,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Network error connecting to YouTube API: ${err.message}`
      }
    };
  }
}

/**
 * Fetches details for a single YouTube video using videos.list
 * 
 * @param {string} videoId - YouTube video ID
 * @param {string} apiKey - YouTube Data API Key
 * @returns {Promise<{ success: boolean, httpStatus?: number, error?: { code: string, message: string }, data?: object }>}
 */
export async function fetchYouTubeSingleVideo(videoId, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return {
      success: false,
      httpStatus: 500,
      error: {
        code: 'MISSING_API_KEY',
        message: 'YouTube API key is not configured on the server. Please set YOUTUBE_API_KEY environment variable.'
      }
    };
  }

  const cleanKey = apiKey.trim();

  try {
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(cleanKey)}`;
    const res = await fetch(videoUrl);

    if (res.status === 403 || res.status === 429) {
      return {
        success: false,
        httpStatus: 429,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'YouTube API daily quota limit exceeded.'
        }
      };
    }

    if (!res.ok) {
      return {
        success: false,
        httpStatus: res.status >= 500 ? 502 : res.status,
        error: {
          code: 'UPSTREAM_API_ERROR',
          message: `YouTube API returned HTTP ${res.status}`
        }
      };
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        httpStatus: 404,
        error: {
          code: 'VIDEO_NOT_FOUND',
          message: 'YouTube video not found or is set to private.'
        }
      };
    }

    const item = data.items[0];
    const durationSec = parseIsoDuration(item.contentDetails?.duration);
    const formatted = formatDuration(durationSec);
    const thumbnail = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null;

    const videoObj = {
      videoId,
      title: item.snippet?.title || 'YouTube Video',
      description: item.snippet?.description || '',
      thumbnail,
      thumbnailUrl: thumbnail,
      position: 0,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      duration: formatted,
      durationSeconds: durationSec,
      formattedDuration: formatted
    };

    return {
      success: true,
      data: {
        provider: 'youtube',
        playlistId: null,
        title: videoObj.title,
        description: item.snippet?.description || '',
        thumbnail,
        channelTitle: item.snippet?.channelTitle || '',
        totalVideos: 1,
        totalDurationSeconds: durationSec,
        formattedTotalDuration: formatted,
        videos: [videoObj],
        rawSections: [
          {
            title: videoObj.title,
            video: {
              videoId: videoObj.videoId,
              videoUrl: videoObj.videoUrl,
              durationSeconds: videoObj.durationSeconds,
              formattedDuration: videoObj.duration
            }
          }
        ]
      }
    };
  } catch (err) {
    return {
      success: false,
      httpStatus: 500,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Network error connecting to YouTube API: ${err.message}`
      }
    };
  }
}

/**
 * High-level handler for /api/youtube/playlist-info requests.
 * Validates request payload, enforces playlist ID presence, and delegates to fetchYouTubePlaylist.
 * 
 * @param {{ url?: string }} body - Request body containing YouTube URL
 * @param {string} [apiKey] - YouTube Data API key (defaults to process.env.YOUTUBE_API_KEY)
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function handlePlaylistInfoRequest(body, apiKey = process.env.YOUTUBE_API_KEY) {
  const { url } = body || {};

  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Missing or empty "url" property in request body.'
        }
      }
    };
  }

  const parsed = parseYouTubeUrl(url);
  if (!parsed.valid) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: parsed.error || 'Invalid YouTube URL format.'
        }
      }
    };
  }

  // Reject URLs without a playlist ID with HTTP 400 (Scenario 4)
  if (!parsed.playlistId) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: 'MISSING_PLAYLIST_ID',
          message: 'The provided YouTube URL does not contain a playlist ID ("list" parameter). For single videos, use /api/youtube/video-info.'
        }
      }
    };
  }

  const keyToUse = apiKey !== undefined ? apiKey : (process.env.YOUTUBE_API_KEY || '');
  const result = await fetchYouTubePlaylist(parsed.playlistId, keyToUse);

  if (!result.success) {
    const statusCode = result.httpStatus || 500;
    return {
      status: statusCode,
      body: {
        success: false,
        error: result.error || {
          code: 'YOUTUBE_API_ERROR',
          message: 'Unable to retrieve playlist information.'
        }
      }
    };
  }

  return {
    status: 200,
    body: result
  };
}
