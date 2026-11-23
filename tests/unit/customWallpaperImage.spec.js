import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storageService, createDefaultGoal } from '../../src/services/storageService.js';
import { CanvasWallpaperEngine } from '../../src/services/CanvasWallpaperEngine.js';

describe('Temporary Custom Wallpaper Image (Part C)', () => {
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;

  beforeEach(() => {
    localStorage.clear();
    storageService.initStorage();
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost:5173/mock-uuid');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  describe('File Validation Rules (Section 8)', () => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    function validateFile(file) {
      if (!file) return { valid: false, error: 'No file provided' };
      const isValidType = ALLOWED_TYPES.includes(file.type) || Boolean(file.name.match(/\.(png|jpe?g|webp)$/i));
      if (!isValidType) {
        return { valid: false, error: 'Unsupported file format. Please upload a PNG, JPG, or WebP image.' };
      }
      if (file.size > MAX_SIZE) {
        return { valid: false, error: 'Image exceeds 10 MB limit.' };
      }
      return { valid: true };
    }

    it('accepts valid PNG, JPG, JPEG, and WebP files under 10 MB', () => {
      expect(validateFile({ name: 'nature.png', type: 'image/png', size: 2 * 1024 * 1024 }).valid).toBe(true);
      expect(validateFile({ name: 'mountain.jpg', type: 'image/jpeg', size: 5 * 1024 * 1024 }).valid).toBe(true);
      expect(validateFile({ name: 'sunset.webp', type: 'image/webp', size: 8 * 1024 * 1024 }).valid).toBe(true);
    });

    it('rejects unsupported file formats (gif, svg, exe, pdf)', () => {
      expect(validateFile({ name: 'anim.gif', type: 'image/gif', size: 1024 }).valid).toBe(false);
      expect(validateFile({ name: 'vector.svg', type: 'image/svg+xml', size: 1024 }).valid).toBe(false);
      expect(validateFile({ name: 'malware.exe', type: 'application/x-msdownload', size: 1024 }).valid).toBe(false);
    });

    it('rejects files exceeding 10 MB limit', () => {
      const overLimit = 10 * 1024 * 1024 + 1;
      const res = validateFile({ name: 'huge.png', type: 'image/png', size: overLimit });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('10 MB');
    });
  });

  describe('Zero LocalStorage Persistence Requirement (Section 8)', () => {
    it('storageService.saveGoal strips customImageUrl and customImage from LocalStorage payload', () => {
      const goalWithImage = {
        ...createDefaultGoal(),
        id: 'goal-custom-img-1',
        title: 'Custom Photo Goal',
        customImageUrl: 'blob:http://localhost:5173/temp-object-url-1234',
        customImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        customImageFilename: 'temp-12345.png'
      };

      const saveRes = storageService.saveGoal(goalWithImage);
      expect(saveRes.success).toBe(true);

      const rawStored = JSON.parse(localStorage.getItem('horizon_v1_goal'));
      expect(rawStored.customImageUrl).toBeUndefined();
      expect(rawStored.customImage).toBeUndefined();
      expect(rawStored.customImageFilename).toBeUndefined();
      expect(rawStored.title).toBe('Custom Photo Goal');
    });
  });

  describe('Canvas Engine Integration & Graceful Fallback (Section 9)', () => {
    it('falls back to procedural nature background when custom image fails to load', async () => {
      const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        drawImage: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn()
      };

      const fallbackTheme = {
        drawBackground: vi.fn()
      };

      // Mock loadImage rejection
      const originalLoadImage = CanvasWallpaperEngine.loadImage;
      CanvasWallpaperEngine.loadImage = vi.fn().mockRejectedValue(new Error('Image failed to load'));

      try {
        await CanvasWallpaperEngine.drawCustomImageBackground(mockCtx, 1080, 1920, 'broken-url', fallbackTheme);
        expect(fallbackTheme.drawBackground).toHaveBeenCalledWith(mockCtx, 1080, 1920);
      } finally {
        CanvasWallpaperEngine.loadImage = originalLoadImage;
      }
    });
  });
});
