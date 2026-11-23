import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CanvasWallpaperEngine,
  CANVAS_DIMENSIONS,
  SAFE_ZONES
} from '../../src/services/CanvasWallpaperEngine.js';
import {
  THEME_REGISTRY,
  getTheme,
  getAllThemes
} from '../../src/services/themeRegistry.js';

describe('Canvas Wallpaper Engine & Nature Themes (Block 4 MVP)', () => {
  let mockCanvas;
  let mockCtx;

  beforeEach(() => {
    mockCtx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn((text) => ({ width: text.length * 10 })),
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
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      }))
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn((type) => (type === '2d' ? mockCtx : null))
    };
  });

  describe('Canvas Dimensions & Specifications', () => {
    it('CW-01: sets exact mobile canvas dimensions (1080x1920, 9:16)', async () => {
      const result = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
        goal: { title: 'Test Goal', templateId: 'alpine-peak' },
        preset: 'MOBILE'
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
      expect(mockCanvas.width).toBe(1080);
      expect(mockCanvas.height).toBe(1920);
    });

    it('CW-02: sets exact desktop canvas dimensions (1920x1080, 16:9)', async () => {
      const result = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
        goal: { title: 'Test Goal', templateId: 'alpine-peak' },
        preset: 'DESKTOP'
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(mockCanvas.width).toBe(1920);
      expect(mockCanvas.height).toBe(1080);
    });
  });

  describe('Theme Registry Completeness & Procedural Rendering', () => {
    it('CW-03: all 4 handcrafted nature themes are registered and accessible', () => {
      const allThemes = getAllThemes();
      expect(allThemes).toHaveLength(4);

      const themeIds = allThemes.map(t => t.id);
      expect(themeIds).toContain('alpine-peak');
      expect(themeIds).toContain('deep-pacific');
      expect(themeIds).toContain('golden-horizon');
      expect(themeIds).toContain('minimalist-stone');

      allThemes.forEach(theme => {
        expect(theme.name).toBeDefined();
        expect(theme.palette).toBeDefined();
        expect(theme.palette.accentColor).toBeDefined();
        expect(theme.palette.previewGradient).toHaveLength(3);
        expect(typeof theme.drawBackground).toBe('function');
      });
    });

    it('CW-04: getTheme falls back to alpine-peak for unknown theme IDs', () => {
      const fallback = getTheme('unknown-nonexistent-theme');
      expect(fallback.id).toBe('alpine-peak');
    });

    it('CW-05: each theme renders procedurally without throwing or needing external image URLs', async () => {
      const themes = ['alpine-peak', 'deep-pacific', 'golden-horizon', 'minimalist-stone'];

      for (const tId of themes) {
        const result = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
          goal: {
            title: `Testing ${tId}`,
            templateId: tId,
            milestones: [
              { id: 'ms-1', order: 1, title: 'Step 1', status: 'completed', completed: true },
              { id: 'ms-2', order: 2, title: 'Step 2', status: 'pending', completed: false }
            ]
          },
          preset: 'MOBILE'
        });

        expect(result.success).toBe(true);
        expect(mockCtx.fillRect).toHaveBeenCalled();
      }
    });
  });

  describe('Lock-Screen Safe Zones & Geometry', () => {
    it('CW-06: mobile safe zones reserve top 280px and bottom 200px', () => {
      expect(SAFE_ZONES.MOBILE.topReserved).toBe(280);
      expect(SAFE_ZONES.MOBILE.bottomReserved).toBe(200);
      expect(SAFE_ZONES.MOBILE.contentTop).toBe(280);
      expect(SAFE_ZONES.MOBILE.contentBottom).toBe(1720);
      expect(SAFE_ZONES.MOBILE.contentHeight).toBe(1440);
    });

    it('CW-07: draws safe-zone debug guidelines when debugSafeZones is enabled', async () => {
      await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
        goal: { title: 'Debug Safe Zones Goal' },
        preset: 'MOBILE',
        debugSafeZones: true
      });

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([12, 8]);
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        expect.stringContaining('TOP SAFE ZONE'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('Typography Hierarchy & Text Wrapping', () => {
    it('CW-08: wraps long text onto multiple lines and clamps at max lines', () => {
      const longTitle = 'Very Long Course Goal Title That Exceeds Single Line Width And Must Wrap';
      const endY = CanvasWallpaperEngine.wrapText(mockCtx, longTitle, 50, 100, 200, 40, 2);

      expect(mockCtx.fillText).toHaveBeenCalled();
      expect(endY).toBeGreaterThan(100);
    });

    it('CW-09: handles empty or null text safely without throwing', () => {
      expect(() => {
        CanvasWallpaperEngine.wrapText(mockCtx, '', 50, 100, 200, 40);
        CanvasWallpaperEngine.wrapText(mockCtx, null, 50, 100, 200, 40);
      }).not.toThrow();
    });
  });

  describe('Edge Cases & Resilient Error Handling', () => {
    it('CW-10: handles missing or empty goal object gracefully with defaults', async () => {
      const result = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
        goal: null,
        preset: 'MOBILE'
      });

      expect(result.success).toBe(true);
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        expect.stringContaining('Achievement Countdown Goal'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('CW-11: handles missing milestones and badge arrays cleanly', async () => {
      const result = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
        goal: {
          title: 'Empty Milestones Goal',
          milestones: []
        },
        preset: 'MOBILE'
      });

      expect(result.success).toBe(true);
    });

    it('CW-12: returns error object when canvas is null or getContext fails', async () => {
      const nullCanvasRes = await CanvasWallpaperEngine.renderWallpaper(null);
      expect(nullCanvasRes.success).toBe(false);
      expect(nullCanvasRes.error).toContain('null');

      const failedCtxCanvas = {
        getContext: vi.fn(() => null)
      };
      const failedCtxRes = await CanvasWallpaperEngine.renderWallpaper(failedCtxCanvas);
      expect(failedCtxRes.success).toBe(false);
      expect(failedCtxRes.error).toContain('2D context');
    });

    it('CW-13: waitForFonts resolves without error in headless/test environment', async () => {
      await expect(CanvasWallpaperEngine.waitForFonts()).resolves.toBeUndefined();
    });
  });
});
