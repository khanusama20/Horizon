/**
 * Horizon Wallpaper Export Service
 * Produces full-resolution static PNG exports at exact target dimensions (1080x1920 / 1920x1080)
 * without device frames or debug safe-zone overlays.
 * Handles filename sanitization, Blob generation, download triggers, and object URL cleanup.
 */

import { CanvasWallpaperEngine, CANVAS_DIMENSIONS } from './CanvasWallpaperEngine.js';

/**
 * Sanitizes a string into a safe, cross-platform filename slug
 * @param {string} rawTitle - Raw title string
 * @returns {string} Sanitized slug (safe for Windows, macOS, Linux)
 */
export function sanitizeFilenameSlug(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return 'goal';
  }

  const slug = rawTitle
    .toLowerCase()
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '') // Strip forbidden OS chars
    .replace(/[^\w\s-]/g, '') // Strip remaining non-alphanumeric except hyphen/space
    .trim()
    .replace(/[\s_]+/g, '-') // Convert spaces and underscores to hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens

  return slug.slice(0, 50) || 'goal';
}

/**
 * Generates an informative, standardized filename for the exported wallpaper
 * e.g., "horizon-alpine-peak-complete-llm-engineering-course-mobile.png"
 * @param {object} goal - Active Goal record
 * @param {string} themeId - Selected theme ID
 * @param {'MOBILE'|'DESKTOP'} preset - Resolution preset
 * @returns {string} Standardized filename ending in .png
 */
export function generateWallpaperFilename(goal, themeId = 'alpine-peak', preset = 'MOBILE') {
  const themeSlug = sanitizeFilenameSlug(themeId || goal?.templateId || 'alpine-peak');
  const titleSlug = sanitizeFilenameSlug(goal?.title);
  const presetSlug = (preset === 'DESKTOP') ? 'desktop' : 'mobile';

  return `horizon-${themeSlug}-${titleSlug}-${presetSlug}.png`;
}

/**
 * Converts a data URL to a binary Blob (fallback for environments lacking native toBlob)
 * @param {string} dataUrl - Base64 data URL
 * @returns {Blob}
 */
export function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1] || 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export const wallpaperExportService = {
  /**
   * Generates a high-resolution PNG Blob at the exact target dimensions
   * @param {object} options
   * @param {object} options.goal - Goal record
   * @param {'MOBILE'|'DESKTOP'} [options.preset='MOBILE'] - Output preset
   * @returns {Promise<{ success: boolean, blob?: Blob, width: number, height: number, error?: string }>}
   */
  async generateWallpaperBlob({ goal, preset = 'MOBILE' }) {
    if (typeof document === 'undefined') {
      return { success: false, width: 0, height: 0, error: 'Document is not available in current environment' };
    }

    const dim = (preset === 'DESKTOP') ? CANVAS_DIMENSIONS.DESKTOP : CANVAS_DIMENSIONS.MOBILE;

    // Create a dedicated full-resolution offscreen canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = dim.width;
    exportCanvas.height = dim.height;

    // Render wallpaper with debugSafeZones = false (mockup and debug lines are NEVER exported)
    const renderResult = await CanvasWallpaperEngine.renderWallpaper(exportCanvas, {
      goal,
      preset,
      debugSafeZones: false
    });

    if (!renderResult.success) {
      return {
        success: false,
        width: dim.width,
        height: dim.height,
        error: renderResult.error || 'Failed to render wallpaper canvas'
      };
    }

    // Convert Canvas to Blob
    try {
      const blob = await new Promise((resolve, reject) => {
        if (typeof exportCanvas.toBlob === 'function') {
          exportCanvas.toBlob(
            b => {
              if (b) {
                resolve(b);
              } else {
                reject(new Error('Canvas toBlob() returned null'));
              }
            },
            'image/png',
            1.0
          );
        } else if (typeof exportCanvas.toDataURL === 'function') {
          // Fallback via dataURL
          try {
            const dataUrl = exportCanvas.toDataURL('image/png', 1.0);
            const b = dataUrlToBlob(dataUrl);
            resolve(b);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('Browser Canvas Blob export API is unsupported'));
        }
      });

      return {
        success: true,
        blob,
        width: dim.width,
        height: dim.height
      };
    } catch (err) {
      return {
        success: false,
        width: dim.width,
        height: dim.height,
        error: err.message
      };
    }
  },

  /**
   * Triggers browser download for a Blob using a temporary link and revokes object URL
   * @param {Blob} blob - PNG Blob
   * @param {string} filename - Target filename
   * @returns {{ success: boolean, filename: string, error?: string }}
   */
  triggerDownload(blob, filename) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { success: false, filename, error: 'Window or Document object unavailable' };
    }

    if (!window.URL || typeof window.URL.createObjectURL !== 'function') {
      return { success: false, filename, error: 'URL.createObjectURL is not supported in this browser' };
    }

    let objectUrl = null;
    try {
      objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.style.display = 'none';

      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Clean up object URL safely after download initiates
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(objectUrl);
        } catch {
          // Ignore revocation errors
        }
      }, 1500);

      return { success: true, filename };
    } catch (err) {
      if (objectUrl) {
        try { window.URL.revokeObjectURL(objectUrl); } catch {}
      }
      return { success: false, filename, error: err.message };
    }
  },

  /**
   * Complete export orchestrator: renders full-res PNG, sanitizes filename, and downloads
   * @param {object} options
   * @param {object} options.goal - Goal record
   * @param {'MOBILE'|'DESKTOP'} [options.preset='MOBILE'] - Output preset
   * @returns {Promise<{ success: boolean, filename?: string, dimensions?: { width: number, height: number }, error?: string }>}
   */
  async exportAndDownload({ goal, preset = 'MOBILE' }) {
    const filename = generateWallpaperFilename(goal, goal?.templateId, preset);

    const blobResult = await this.generateWallpaperBlob({ goal, preset });
    if (!blobResult.success || !blobResult.blob) {
      return {
        success: false,
        error: blobResult.error || 'Failed to generate wallpaper image'
      };
    }

    const downloadResult = this.triggerDownload(blobResult.blob, filename);
    if (!downloadResult.success) {
      return {
        success: false,
        error: downloadResult.error || 'Failed to trigger file download'
      };
    }

    return {
      success: true,
      filename,
      dimensions: {
        width: blobResult.width,
        height: blobResult.height
      }
    };
  }
};
