/**
 * Horizon YouTube Data API v3 Ingestion Service
 * 
 * Provides official YouTube Data API v3 integration for extracting
 * playlist metadata, videos list, and video durations without web scraping.
 * 
 * Requirements:
 * - Server-side only (API key never exposed to client).
 * - Full pagination support for playlists > 50 videos.
 * - Filters out deleted and private videos.
 * - Converts ISO 8601 duration strings (PT15M33S) into seconds.
 * - Robust error handling for missing keys, quota limits, and timeouts.
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
 * @returns {{ valid: boolean, type?: 'playlist'|'video', playlistId?: string, videoId?: string, error?: string }}
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
        return { valid: true, type: 'video', videoId: vid };
      }
    }

    // 3. Standard /watch?v=VIDEO_ID
    const vidParam = url.searchParams.get('v');
    if (vidParam && /^[a-zA-Z0-9_-]{11}$/.test(vidParam)) {
      return { valid: true, type: 'video', videoId: vidParam };
    }

    // 4. Embedded /embed/VIDEO_ID
    if (url.pathname.startsWith('/embed/')) {
      const vid = url.pathname.split('/')[2];
      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid)) {
        return { valid: true, type: 'video', videoId: vid };
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
 * Parses an ISO 8601 duration string (e.g. "PT1H2M33S", "PT15M30S", "PT45S") into total seconds.
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
 * Formats total seconds into human-readable duration (e.g. "15:33" or "1:02:40")
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
 * @returns {Promise<object>} Structured playlist extraction result
 */
export async function fetchYouTubePlaylist(playlistId, apiKey, maxVideos = 150) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return {
      success: false,
      missingKey: true,
      error: 'YouTube Data API key is not configured on the server. Set YOUTUBE_API_KEY in your environment, or use the Manual Syllabus option.'
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
          quotaExceeded: true,
          error: 'YouTube API daily quota limit reached. You can still paste video titles using the Manual Syllabus option.'
        };
      }
      return {
        success: false,
        error: 'YouTube API rejected the request. Please verify your YOUTUBE_API_KEY has YouTube Data API v3 enabled.'
      };
    }

    if (!metaRes.ok) {
      return {
        success: false,
        error: `YouTube API returned HTTP ${metaRes.status}: Unable to retrieve playlist details.`
      };
    }

    const metaData = await metaRes.json();
    if (!metaData.items || metaData.items.length === 0) {
      return {
        success: false,
        error: 'Playlist not found or is set to private. Please check the playlist link and privacy settings.'
      };
    }

    const playlistItem = metaData.items[0];
    const playlistTitle = playlistItem.snippet?.title || 'YouTube Playlist';
    const playlistDescription = playlistItem.snippet?.description || '';
    const channelTitle = playlistItem.snippet?.channelTitle || '';
    const totalExpected = playlistItem.contentDetails?.itemCount || 0;
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
      if (!itemsRes.ok) break;

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
            videoUrl: `https://www.youtube.com/watch?v=VIDEO_ID`.replace('VIDEO_ID', videoId),
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
        error: 'This playlist contains no available or public videos.'
      };
    }

    // 3. Batch fetch durations via videos.list (up to 50 per request)
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
        // Fall back gracefully if video duration lookup fails
      }
    }

    // 4. Enrich videos with durations and format
    let totalDurationSeconds = 0;
    const finalVideos = rawVideos.map((v, index) => {
      const durSec = durationMap.get(v.videoId) || 0;
      totalDurationSeconds += durSec;
      return {
        id: `yt-vid-${index + 1}`,
        order: index + 1,
        videoId: v.videoId,
        title: v.title,
        videoUrl: v.videoUrl,
        durationSeconds: durSec,
        formattedDuration: formatDuration(durSec),
        thumbnailUrl: v.thumbnailUrl
      };
    });

    return {
      success: true,
      data: {
        provider: 'youtube',
        type: 'playlist',
        playlistId,
        title: playlistTitle,
        description: playlistDescription,
        channelTitle,
        thumbnail,
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
            formattedDuration: v.formattedDuration
          }
        }))
      }
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error connecting to YouTube API: ${err.message}`
    };
  }
}

/**
 * Fetches details for a single YouTube video using videos.list
 * 
 * @param {string} videoId - YouTube video ID
 * @param {string} apiKey - YouTube Data API Key
 * @returns {Promise<object>} Structured single video extraction result
 */
export async function fetchYouTubeSingleVideo(videoId, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return {
      success: false,
      missingKey: true,
      error: 'YouTube Data API key is not configured on the server. Set YOUTUBE_API_KEY in your environment, or use the Manual Syllabus option.'
    };
  }

  const cleanKey = apiKey.trim();

  try {
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(cleanKey)}`;
    const res = await fetch(videoUrl);

    if (res.status === 403 || res.status === 429) {
      return {
        success: false,
        quotaExceeded: true,
        error: 'YouTube API quota exceeded or request rejected.'
      };
    }

    if (!res.ok) {
      return { success: false, error: `YouTube API returned HTTP ${res.status}` };
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Video not found or is set to private.' };
    }

    const item = data.items[0];
    const durationSec = parseIsoDuration(item.contentDetails?.duration);
    const videoObj = {
      id: 'yt-vid-1',
      order: 1,
      videoId,
      title: item.snippet?.title || 'YouTube Video',
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      durationSeconds: durationSec,
      formattedDuration: formatDuration(durationSec),
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url || null
    };

    return {
      success: true,
      data: {
        provider: 'youtube',
        type: 'video',
        title: videoObj.title,
        description: item.snippet?.description || '',
        channelTitle: item.snippet?.channelTitle || '',
        thumbnail: videoObj.thumbnailUrl,
        totalVideos: 1,
        totalDurationSeconds: durationSec,
        formattedTotalDuration: formatDuration(durationSec),
        videos: [videoObj],
        rawSections: [
          {
            title: videoObj.title,
            video: {
              videoId: videoObj.videoId,
              videoUrl: videoObj.videoUrl,
              durationSeconds: videoObj.durationSeconds,
              formattedDuration: videoObj.formattedDuration
            }
          }
        ]
      }
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error connecting to YouTube API: ${err.message}`
    };
  }
}
