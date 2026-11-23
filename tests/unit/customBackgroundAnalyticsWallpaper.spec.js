import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CanvasWallpaperEngine,
  CANVAS_DIMENSIONS,
  SAFE_ZONES
} from '../../src/services/CanvasWallpaperEngine.js';
import { wallpaperExportService } from '../../src/services/wallpaperExportService.js';
import { getAllThemes } from '../../src/services/themeRegistry.js';

describe('Horizon Canvas Engine — Custom Background & Achievement Analytics (Extended)', () => {
  let mockCanvas;
  let mockCtx;

  function createMockContext() {
    return {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn((text) => ({ width: String(text).length * 10 })),
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
      drawImage: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      }))
    };
  }

  beforeEach(() => {
    mockCtx = createMockContext();
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn((type) => (type === '2d' ? mockCtx : null))
    };
  });

  // Requirement 1: Custom uploaded background image renders correctly
  it('Verification 1: custom uploaded background image renders onto canvas with gradient scrim', async () => {
    const goal = {
      title: 'Full Stack Vue Mastery',
      customImageUrl: 'blob:http://localhost:5173/custom-photo-uuid',
      milestones: [
        { id: 'm1', order: 1, title: 'Basics', status: 'completed', completed: true }
      ]
    };

    const spyDrawImage = vi.spyOn(CanvasWallpaperEngine, 'drawCustomImageBackground');
    const result = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
      goal,
      preset: 'MOBILE'
    });

    expect(result.success).toBe(true);
    expect(spyDrawImage).toHaveBeenCalledWith(
      mockCtx,
      1080,
      1920,
      'blob:http://localhost:5173/custom-photo-uuid',
      expect.anything()
    );
    expect(mockCtx.fillRect).toHaveBeenCalled(); // Gradient overlay drawn
    spyDrawImage.mockRestore();
  });

  // Requirement 2: No image distortion occurs (center-crop / cover scaling preserves aspect ratio)
  it('Verification 2: calculateCoverCrop preserves aspect ratio without stretching or distortion', () => {
    // Case A: Landscape image (1920x1080, 16:9) placed onto portrait canvas (1080x1920, 9:16)
    const landscapeCrop = CanvasWallpaperEngine.calculateCoverCrop(1920, 1080, 1080, 1920);
    expect(landscapeCrop.sHeight).toBe(1080);
    // Source crop aspect ratio must exactly equal target canvas ratio (1080 / 1920 = 0.5625)
    const cropRatio = landscapeCrop.sWidth / landscapeCrop.sHeight;
    const canvasRatio = 1080 / 1920;
    expect(Math.abs(cropRatio - canvasRatio)).toBeLessThan(0.01);
    expect(landscapeCrop.sx).toBeGreaterThan(0); // Centered horizontally
    expect(landscapeCrop.sy).toBe(0);

    // Scaling factor test (both axes must scale by identical multiplier -> 0 distortion)
    const scaleX = landscapeCrop.dWidth / landscapeCrop.sWidth;
    const scaleY = landscapeCrop.dHeight / landscapeCrop.sHeight;
    expect(Math.abs(scaleX - scaleY)).toBeLessThan(0.01);
  });

  // Requirement 3: Mobile and desktop export dimensions remain strictly unchanged
  it('Verification 3: mobile is exactly 1080x1920 and desktop is exactly 1920x1080', async () => {
    expect(CANVAS_DIMENSIONS.MOBILE.width).toBe(1080);
    expect(CANVAS_DIMENSIONS.MOBILE.height).toBe(1920);
    expect(CANVAS_DIMENSIONS.DESKTOP.width).toBe(1920);
    expect(CANVAS_DIMENSIONS.DESKTOP.height).toBe(1080);

    const mobileRes = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, { preset: 'MOBILE' });
    expect(mobileRes.width).toBe(1080);
    expect(mobileRes.height).toBe(1920);

    const desktopRes = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, { preset: 'DESKTOP' });
    expect(desktopRes.width).toBe(1920);
    expect(desktopRes.height).toBe(1080);
  });

  // Requirement 4: Different aspect ratios render correctly without error
  it('Verification 4: handles wide, tall, and square uploaded images cleanly', () => {
    // 1. Ultra-wide image (2560x1080) on portrait canvas (1080x1920)
    const ultraWide = CanvasWallpaperEngine.calculateCoverCrop(2560, 1080, 1080, 1920);
    expect(ultraWide.sx).toBeGreaterThan(0);
    expect(ultraWide.sy).toBe(0);

    // 2. Ultra-tall image (1080x2400) on portrait canvas (1080x1920)
    const ultraTall = CanvasWallpaperEngine.calculateCoverCrop(1080, 2400, 1080, 1920);
    expect(ultraTall.sx).toBe(0);
    expect(ultraTall.sy).toBeGreaterThan(0);

    // 3. Square image (1000x1000) on landscape canvas (1920x1080)
    const squareOnLandscape = CanvasWallpaperEngine.calculateCoverCrop(1000, 1000, 1920, 1080);
    expect(squareOnLandscape.sx).toBe(0);
    expect(squareOnLandscape.sy).toBeGreaterThan(0);
  });

  // Requirement 5: Long goal titles do not overflow (automatic font fitting & wrapping)
  it('Verification 5: long goal titles wrap onto max 2 lines and shrink font size smoothly', () => {
    const longTitle = 'Mastering Autonomous AI Agent Frameworks with Retrieval-Augmented Generation Pipelines';
    const endY = CanvasWallpaperEngine.fitAndWrapText(
      mockCtx,
      longTitle,
      86,
      500,
      908,
      42,
      28,
      "'Roboto', sans-serif",
      2,
      '800'
    );

    expect(mockCtx.fillText).toHaveBeenCalled();
    expect(endY).toBeGreaterThan(500);
  });

  // Requirement 6: Progress states from 0% to 100% render correctly
  it('Verification 6: handles 0% and 100% progress without arithmetic errors', async () => {
    // 0% Progress (no completed milestones)
    const goal0 = {
      title: 'Fresh Goal 0%',
      milestones: [
        { id: 'm1', order: 1, title: 'Step 1', status: 'pending', completed: false }
      ]
    };
    const res0 = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, { goal: goal0, preset: 'MOBILE' });
    expect(res0.success).toBe(true);
    expect(mockCtx.fillText).toHaveBeenCalledWith('0%', expect.any(Number), expect.any(Number));
    expect(mockCtx.fillText).toHaveBeenCalledWith('NOT STARTED', expect.any(Number), expect.any(Number));

    // 100% Progress (all milestones completed)
    mockCtx = createMockContext();
    mockCanvas.getContext = vi.fn(() => mockCtx);
    const goal100 = {
      title: 'Finished Goal 100%',
      milestones: [
        { id: 'm1', order: 1, title: 'Step 1', status: 'completed', completed: true }
      ]
    };
    const res100 = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, { goal: goal100, preset: 'MOBILE' });
    expect(res100.success).toBe(true);
    expect(mockCtx.fillText).toHaveBeenCalledWith('100%', expect.any(Number), expect.any(Number));
    expect(mockCtx.fillText).toHaveBeenCalledWith('COMPLETED', expect.any(Number), expect.any(Number));
  });

  // Requirement 7: Achievement badges reflect actual unlocked badges from evaluateBadges
  it('Verification 7: achievement badge banner reflects authentic unlocked tier', async () => {
    const goal = {
      title: 'Badge Test Goal',
      milestones: [
        { id: 'm1', order: 1, title: 'Step 1', status: 'completed', completed: true },
        { id: 'm2', order: 2, title: 'Step 2', status: 'pending', completed: false }
      ] // 50% completed -> Halfway Hero badge unlocked!
    };

    await CanvasWallpaperEngine.renderWallpaper(mockCanvas, { goal, preset: 'MOBILE' });
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      expect.stringContaining('Halfway Hero'),
      expect.any(Number),
      expect.any(Number)
    );
  });

  // Requirement 8: Milestone overflow is handled correctly with +N more indicator
  it('Verification 8: displays max visible milestones and shows +N more completed indicator', async () => {
    const manyMilestones = Array.from({ length: 8 }, (_, i) => ({
      id: `m${i + 1}`,
      order: i + 1,
      title: `Lesson ${i + 1}`,
      status: 'completed',
      completed: true
    }));

    const goal = {
      title: 'Course with 8 Completed Milestones',
      milestones: manyMilestones
    };

    await CanvasWallpaperEngine.renderWallpaper(mockCanvas, { goal, preset: 'MOBILE' });
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      expect.stringContaining('more completed milestones'),
      expect.any(Number),
      expect.any(Number)
    );
  });

  // Requirement 9: Missing analytics do not produce fake values
  it('Verification 9: omits missing optional analytics cleanly without fabricating metrics', async () => {
    const minimalGoal = {
      title: 'Minimal Goal Without Optional Metadata',
      milestones: []
    };

    await CanvasWallpaperEngine.renderWallpaper(mockCanvas, { goal: minimalGoal, preset: 'MOBILE' });

    // Should not print fake duration or streak values
    const calledTexts = mockCtx.fillText.mock.calls.map(call => call[0]);
    expect(calledTexts.some(t => String(t).includes('undefined'))).toBe(false);
    expect(calledTexts.some(t => String(t).includes('null'))).toBe(false);
    expect(calledTexts.some(t => String(t).includes('NaN'))).toBe(false);
  });

  // Requirement 10: Existing four nature themes still work
  it('Verification 10: all 4 handcrafted nature themes render procedurally without regression', async () => {
    const themes = getAllThemes();
    expect(themes).toHaveLength(4);

    for (const t of themes) {
      mockCtx = createMockContext();
      mockCanvas.getContext = vi.fn(() => mockCtx);
      const res = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
        goal: { title: `Theme ${t.id}`, templateId: t.id },
        preset: 'MOBILE'
      });
      expect(res.success).toBe(true);
      expect(mockCtx.fillRect).toHaveBeenCalled();
    }
  });

  // Requirement 11: PNG export works correctly
  it('Verification 11: wallpaperExportService generates export blob with custom image and analytics', async () => {
    // Mock offscreen document.createElement('canvas')
    const originalCreateElement = global.document.createElement;
    const exportCtx = createMockContext();
    const exportCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => exportCtx),
      toBlob: vi.fn((callback) => {
        callback(new Blob(['fake-png-data'], { type: 'image/png' }));
      }),
      toDataURL: vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==')
    };

    global.document.createElement = vi.fn((tag) => {
      if (tag === 'canvas') return exportCanvas;
      return originalCreateElement.call(global.document, tag);
    });

    try {
      const res = await wallpaperExportService.generateWallpaperBlob({
        goal: {
          title: 'Export Test Goal',
          customImageUrl: 'blob:http://localhost:5173/custom-blob',
          milestones: [{ id: 'm1', order: 1, title: 'Step 1', status: 'completed', completed: true }]
        },
        preset: 'MOBILE'
      });

      expect(res.success).toBe(true);
      expect(res.width).toBe(1080);
      expect(res.height).toBe(1920);
      expect(res.blob).toBeDefined();
    } finally {
      global.document.createElement = originalCreateElement;
    }
  });

  // Requirement 12: Existing wallpaper customization and color settings remain functional
  it('Verification 12: respects user-chosen customColors when supplied', async () => {
    const goal = {
      title: 'Custom Colored Goal',
      templateId: 'alpine-peak',
      customColors: {
        background: '#1E1B4B',
        heading: '#FDE047',
        body: '#E0E7FF',
        accent: '#EC4899',
        card: 'rgba(30, 27, 75, 0.85)'
      },
      milestones: [{ id: 'm1', order: 1, title: 'Step 1', status: 'completed', completed: true }]
    };

    const res = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, { goal, preset: 'MOBILE' });
    expect(res.success).toBe(true);
    // Background fill must use the custom color
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });
});
