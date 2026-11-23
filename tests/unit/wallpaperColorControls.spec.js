import { describe, it, expect, vi } from 'vitest';
import { COLOR_PRESETS, DEFAULT_PALETTE } from '../../src/services/colorPaletteService.js';
import { CanvasWallpaperEngine } from '../../src/services/CanvasWallpaperEngine.js';
import { getTheme } from '../../src/services/themeRegistry.js';

describe('Wallpaper Color Customization & Presets (Part D)', () => {
  describe('Color Presets Structure & Values (Section 11)', () => {
    it('defines 4 required presets with all 5 mandatory color keys', () => {
      expect(COLOR_PRESETS.length).toBe(4);

      const requiredKeys = ['background', 'accent', 'heading', 'body', 'card'];
      for (const preset of COLOR_PRESETS) {
        expect(preset.id).toBeDefined();
        expect(preset.name).toBeDefined();
        for (const key of requiredKeys) {
          expect(preset.colors[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      }
    });

    it('validates Warm Horizon preset colors', () => {
      const p = COLOR_PRESETS.find(p => p.id === 'warm-horizon');
      expect(p.colors.background).toBe('#F7F3EB');
      expect(p.colors.accent).toBe('#E97824');
      expect(p.colors.heading).toBe('#29251F');
      expect(p.colors.body).toBe('#756D62');
      expect(p.colors.card).toBe('#FFFDF8');
    });

    it('validates Deep Ocean preset colors', () => {
      const p = COLOR_PRESETS.find(p => p.id === 'deep-ocean');
      expect(p.colors.background).toBe('#102A43');
      expect(p.colors.accent).toBe('#48A9C5');
      expect(p.colors.heading).toBe('#FFFFFF');
      expect(p.colors.body).toBe('#D9EAF2');
      expect(p.colors.card).toBe('#1C405B');
    });

    it('validates Forest Calm preset colors', () => {
      const p = COLOR_PRESETS.find(p => p.id === 'forest-calm');
      expect(p.colors.background).toBe('#203A32');
      expect(p.colors.accent).toBe('#A8C686');
      expect(p.colors.heading).toBe('#FFFFFF');
      expect(p.colors.body).toBe('#D8E4D9');
      expect(p.colors.card).toBe('#2D5044');
    });

    it('validates Minimal Stone preset colors', () => {
      const p = COLOR_PRESETS.find(p => p.id === 'minimal-stone');
      expect(p.colors.background).toBe('#E8E5DF');
      expect(p.colors.accent).toBe('#9A8065');
      expect(p.colors.heading).toBe('#292724');
      expect(p.colors.body).toBe('#68645E');
      expect(p.colors.card).toBe('#F7F5F0');
    });
  });

  describe('Canvas Wallpaper Engine Color Integration (Section 12)', () => {
    function createMockCanvas(fillStylesUsed = []) {
      const mockCtx = {
        _fillStyle: '',
        get fillStyle() { return this._fillStyle; },
        set fillStyle(val) {
          this._fillStyle = val;
          fillStylesUsed.push(val);
        },
        strokeStyle: '',
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn((text) => ({ width: text ? text.length * 10 : 100 })),
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

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn((type) => (type === '2d' ? mockCtx : null))
      };

      return { mockCanvas, mockCtx };
    }

    it('applies custom colors to palette properties during renderWallpaper', async () => {
      const fillStylesUsed = [];
      const { mockCanvas } = createMockCanvas(fillStylesUsed);

      const customColors = {
        background: '#102A43',
        accent: '#48A9C5',
        heading: '#FFFFFF',
        body: '#D9EAF2',
        card: '#1C405B'
      };

      const goal = {
        id: 'goal-custom-colors',
        title: 'Custom Colored Goal',
        templateId: 'alpine-peak',
        customColors,
        milestones: [
          { id: 'ms-1', order: 1, title: 'Step 1', status: 'pending', completed: false, targetDay: 1, dueDate: '2026-12-01' }
        ]
      };

      const res = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, { goal, preset: 'MOBILE' });
      expect(res.success).toBe(true);

      // Verify that custom colors were applied during canvas draw
      expect(fillStylesUsed).toContain('#102A43'); // custom background
      expect(fillStylesUsed).toContain('#48A9C5'); // custom accent
      expect(fillStylesUsed).toContain('#FFFFFF'); // custom heading
      expect(fillStylesUsed).toContain('#1C405B'); // custom card
    });

    it('restores original theme appearance when customColors is null', async () => {
      const fillStylesUsed = [];
      const { mockCanvas } = createMockCanvas(fillStylesUsed);

      const theme = getTheme('alpine-peak');
      const goal = {
        id: 'goal-original-theme',
        title: 'Original Theme Goal',
        templateId: 'alpine-peak',
        customColors: null,
        milestones: [
          { id: 'ms-1', order: 1, title: 'Step 1', status: 'pending', completed: false, targetDay: 1, dueDate: '2026-12-01' }
        ]
      };

      const res = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, { goal, preset: 'MOBILE' });
      expect(res.success).toBe(true);

      // Verify original theme palette is used
      expect(fillStylesUsed).toContain(theme.palette.cardBackground);
      expect(fillStylesUsed).toContain(theme.palette.accentColor);
    });
  });
});
