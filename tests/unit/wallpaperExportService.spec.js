import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeFilenameSlug,
  generateWallpaperFilename,
  dataUrlToBlob,
  wallpaperExportService
} from '../../src/services/wallpaperExportService.js';
import { CanvasWallpaperEngine } from '../../src/services/CanvasWallpaperEngine.js';

describe('Wallpaper Export Service & Static PNG Export (Block 5 MVP)', () => {
  describe('sanitizeFilenameSlug()', () => {
    it('WE-01: cleans spaces, uppercase, and punctuation into safe slug', () => {
      const raw = '  Complete LLM & Python Bootcamp: 2026 Edition!  ';
      const slug = sanitizeFilenameSlug(raw);
      expect(slug).toBe('complete-llm-python-bootcamp-2026-edition');
    });

    it('WE-02: strips forbidden OS characters for Windows/macOS/Linux', () => {
      const forbidden = 'Goal: <Best> "Course" / Test \\ File? * Pipe |';
      const slug = sanitizeFilenameSlug(forbidden);
      expect(slug).not.toMatch(/[\\/:*?"<>|]/);
      expect(slug).toBe('goal-best-course-test-file-pipe');
    });

    it('WE-03: collapses underscores and multiple consecutive hyphens', () => {
      const raw = 'my___custom---course___goal';
      const slug = sanitizeFilenameSlug(raw);
      expect(slug).toBe('my-custom-course-goal');
    });

    it('WE-04: trims leading and trailing hyphens', () => {
      const raw = '---leading-and-trailing---';
      const slug = sanitizeFilenameSlug(raw);
      expect(slug).toBe('leading-and-trailing');
    });

    it('WE-05: truncates strings longer than 50 characters cleanly', () => {
      const longTitle = 'This is an exceedingly long goal title designed to test the 50-character truncation ceiling in our export service';
      const slug = sanitizeFilenameSlug(longTitle);
      expect(slug.length).toBeLessThanOrEqual(50);
      expect(slug).toBe('this-is-an-exceedingly-long-goal-title-designed-to');
    });

    it('WE-06: returns fallback "goal" for empty, null, or whitespace-only inputs', () => {
      expect(sanitizeFilenameSlug('')).toBe('goal');
      expect(sanitizeFilenameSlug(null)).toBe('goal');
      expect(sanitizeFilenameSlug(undefined)).toBe('goal');
      expect(sanitizeFilenameSlug('   ')).toBe('goal');
      expect(sanitizeFilenameSlug('???:::***')).toBe('goal');
    });
  });

  describe('generateWallpaperFilename()', () => {
    it('WE-07: formats standard mobile wallpaper filename', () => {
      const goal = { title: 'Docker Mastery', templateId: 'alpine-peak' };
      const filename = generateWallpaperFilename(goal, 'alpine-peak', 'MOBILE');
      expect(filename).toBe('horizon-alpine-peak-docker-mastery-mobile.png');
    });

    it('WE-08: formats standard desktop wallpaper filename', () => {
      const goal = { title: 'Kubernetes in Action', templateId: 'deep-pacific' };
      const filename = generateWallpaperFilename(goal, 'deep-pacific', 'DESKTOP');
      expect(filename).toBe('horizon-deep-pacific-kubernetes-in-action-desktop.png');
    });

    it('WE-09: handles null/undefined goal gracefully with fallbacks', () => {
      const filename = generateWallpaperFilename(null, null, 'MOBILE');
      expect(filename).toBe('horizon-alpine-peak-goal-mobile.png');
    });
  });

  describe('dataUrlToBlob()', () => {
    it('WE-10: correctly parses PNG base64 data URL into binary Blob', () => {
      // 1x1 transparent PNG data URL
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const blob = dataUrlToBlob(dataUrl);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('generateWallpaperBlob()', () => {
    let originalCreateElement;
    let mockCanvas;
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        setLineDash: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
      };

      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
        toBlob: vi.fn((callback, mime, quality) => {
          const fakeBlob = new Blob(['fake-png-bytes'], { type: mime || 'image/png' });
          callback(fakeBlob);
        }),
        toDataURL: vi.fn(() => 'data:image/png;base64,iVBORw0KGgo=')
      };

      originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') {
          return mockCanvas;
        }
        return originalCreateElement(tag);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('WE-11: generates mobile PNG blob with exact 1080x1920 dimensions without safe zones', async () => {
      const renderSpy = vi.spyOn(CanvasWallpaperEngine, 'renderWallpaper');

      const result = await wallpaperExportService.generateWallpaperBlob({
        goal: { title: 'Vue Masterclass', templateId: 'alpine-peak' },
        preset: 'MOBILE'
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(mockCanvas.width).toBe(1080);
      expect(mockCanvas.height).toBe(1920);

      expect(renderSpy).toHaveBeenCalledWith(
        mockCanvas,
        expect.objectContaining({
          preset: 'MOBILE',
          debugSafeZones: false // Safe zones must NEVER appear in export
        })
      );
    });

    it('WE-12: generates desktop PNG blob with exact 1920x1080 dimensions without safe zones', async () => {
      const renderSpy = vi.spyOn(CanvasWallpaperEngine, 'renderWallpaper');

      const result = await wallpaperExportService.generateWallpaperBlob({
        goal: { title: 'Vue Masterclass', templateId: 'alpine-peak' },
        preset: 'DESKTOP'
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(mockCanvas.width).toBe(1920);
      expect(mockCanvas.height).toBe(1080);

      expect(renderSpy).toHaveBeenCalledWith(
        mockCanvas,
        expect.objectContaining({
          preset: 'DESKTOP',
          debugSafeZones: false
        })
      );
    });

    it('WE-13: handles toBlob returning null gracefully', async () => {
      mockCanvas.toBlob = vi.fn((cb) => cb(null));

      const result = await wallpaperExportService.generateWallpaperBlob({
        goal: { title: 'Failure Test' },
        preset: 'MOBILE'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('toBlob() returned null');
    });

    it('WE-14: falls back to toDataURL when toBlob is unavailable', async () => {
      delete mockCanvas.toBlob;
      mockCanvas.toDataURL = vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

      const result = await wallpaperExportService.generateWallpaperBlob({
        goal: { title: 'Fallback Test' },
        preset: 'MOBILE'
      });

      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('image/png');
    });

    it('WE-15: handles renderWallpaper failure cleanly', async () => {
      vi.spyOn(CanvasWallpaperEngine, 'renderWallpaper').mockResolvedValueOnce({
        success: false,
        error: 'Simulated GPU context loss'
      });

      const result = await wallpaperExportService.generateWallpaperBlob({
        goal: { title: 'Context Loss Test' },
        preset: 'MOBILE'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Simulated GPU context loss');
    });
  });

  describe('triggerDownload()', () => {
    let mockAnchor;
    let originalCreateElement;

    beforeEach(() => {
      mockAnchor = {
        href: '',
        download: '',
        style: {},
        click: vi.fn()
      };

      originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return mockAnchor;
        return originalCreateElement(tag);
      });

      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

      if (!window.URL) {
        window.URL = {};
      }
      window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost:5173/fake-uuid');
      window.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('WE-16: creates anchor, triggers click, and removes anchor from DOM', () => {
      const blob = new Blob(['bytes'], { type: 'image/png' });
      const filename = 'horizon-test.png';

      const result = wallpaperExportService.triggerDownload(blob, filename);

      expect(result.success).toBe(true);
      expect(result.filename).toBe(filename);
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(mockAnchor.download).toBe(filename);
      expect(mockAnchor.href).toBe('blob:http://localhost:5173/fake-uuid');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
    });

    it('WE-17: schedules URL.revokeObjectURL cleanup after download initiation', async () => {
      vi.useFakeTimers();
      const blob = new Blob(['bytes'], { type: 'image/png' });
      wallpaperExportService.triggerDownload(blob, 'horizon-cleanup.png');

      expect(window.URL.revokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2000);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:5173/fake-uuid');
      vi.useRealTimers();
    });
  });

  describe('exportAndDownload() Orchestrator', () => {
    beforeEach(() => {
      if (!window.URL) window.URL = {};
      window.URL.createObjectURL = vi.fn(() => 'blob:test');
      window.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('WE-18: successfully generates and triggers download returning metadata', async () => {
      const fakeBlob = new Blob(['test-bytes'], { type: 'image/png' });
      vi.spyOn(wallpaperExportService, 'generateWallpaperBlob').mockResolvedValueOnce({
        success: true,
        blob: fakeBlob,
        width: 1080,
        height: 1920
      });

      vi.spyOn(wallpaperExportService, 'triggerDownload').mockReturnValueOnce({
        success: true,
        filename: 'horizon-alpine-peak-my-goal-mobile.png'
      });

      const result = await wallpaperExportService.exportAndDownload({
        goal: { title: 'My Goal', templateId: 'alpine-peak' },
        preset: 'MOBILE'
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe('horizon-alpine-peak-my-goal-mobile.png');
      expect(result.dimensions).toEqual({ width: 1080, height: 1920 });
    });

    it('WE-19: returns error when generateWallpaperBlob fails', async () => {
      vi.spyOn(wallpaperExportService, 'generateWallpaperBlob').mockResolvedValueOnce({
        success: false,
        error: 'Canvas render error'
      });

      const result = await wallpaperExportService.exportAndDownload({
        goal: { title: 'Failing Goal' },
        preset: 'MOBILE'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Canvas render error');
    });
  });
});
