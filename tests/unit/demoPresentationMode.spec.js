import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createDemoGoal,
  validateDemoGoal,
  DEMO_GUIDED_STEPS
} from '../../src/services/demoDataService.js';
import { calculateProgress } from '../../src/services/milestoneEngine.js';
import { evaluateBadges, getMotivationalQuote } from '../../src/services/badgeEngine.js';
import { CanvasWallpaperEngine } from '../../src/services/CanvasWallpaperEngine.js';
import { generateWallpaperFilename } from '../../src/services/wallpaperExportService.js';
import { storageService, createDefaultGoal } from '../../src/services/storageService.js';
import { useStorage } from '../../src/composables/useStorage.js';

describe('Demo Presentation Mode & Contest Polish (Block 6 MVP)', () => {
  describe('Demo Goal Data Structure & Validity', () => {
    it('DP-01: generates a valid, fully populated contest demo goal', () => {
      const demo = createDemoGoal();
      const validation = validateDemoGoal(demo);

      expect(validation.valid).toBe(true);
      expect(demo.title).toBe('Master Full-Stack Engineering');
      expect(demo.courseMetadata.title).toBe('Complete LLM Engineering & System Architecture');
      expect(demo.category).toBe('Engineering');
      expect(demo.totalDays).toBe(20);
      expect(demo.templateId).toBe('alpine-peak');
      expect(demo.milestones).toHaveLength(5);
    });

    it('DP-02: target deadline is strictly in the future when generated', () => {
      const demo = createDemoGoal();
      const targetTime = new Date(demo.targetDate).getTime();
      const now = Date.now();

      expect(targetTime).toBeGreaterThan(now);
      // Approximately 12 days remaining
      const daysDiff = Math.round((targetTime - now) / (24 * 60 * 60 * 1000));
      expect(daysDiff).toBe(12);
    });

    it('DP-03: milestones represent a realistic middle-stage (3 completed, 2 pending = 60%)', () => {
      const demo = createDemoGoal();
      const completed = demo.milestones.filter(m => m.completed && m.status === 'completed');
      const pending = demo.milestones.filter(m => !m.completed && m.status === 'pending');

      expect(completed).toHaveLength(3);
      expect(pending).toHaveLength(2);

      const progress = calculateProgress(demo.milestones);
      expect(progress).toBe(60);
    });

    it('DP-04: validateDemoGoal accurately flags expired deadlines or empty goals', () => {
      expect(validateDemoGoal(null).valid).toBe(false);
      expect(validateDemoGoal({}).valid).toBe(false);

      const pastGoal = {
        title: 'Past Goal',
        targetDate: new Date(Date.now() - 10000).toISOString(),
        milestones: [{ id: '1', completed: true }]
      };
      expect(validateDemoGoal(pastGoal).valid).toBe(false);

      const zeroProgressGoal = {
        title: 'Zero Progress',
        targetDate: new Date(Date.now() + 100000).toISOString(),
        milestones: [{ id: '1', completed: false }]
      };
      expect(validateDemoGoal(zeroProgressGoal).valid).toBe(false);
    });
  });

  describe('Integration with Badge & Motivational Engines', () => {
    it('DP-05: produces exactly 3 unlocked badges and 2 locked badges for 60% progress', () => {
      const demo = createDemoGoal();
      const badges = evaluateBadges(demo.milestones);

      expect(badges).toHaveLength(5);

      const unlocked = badges.filter(b => b.unlocked);
      const locked = badges.filter(b => !b.unlocked);

      expect(unlocked).toHaveLength(3);
      expect(locked).toHaveLength(2);

      const unlockedKeys = unlocked.map(b => b.key);
      expect(unlockedKeys).toContain('FIRST_STEP');
      expect(unlockedKeys).toContain('QUARTER_WAY');
      expect(unlockedKeys).toContain('HALFWAY');

      const lockedKeys = locked.map(b => b.key);
      expect(lockedKeys).toContain('ALMOST_THERE');
      expect(lockedKeys).toContain('ACHIEVER');
    });

    it('DP-06: returns inspiring motivational quote for 60% Midpoint Mastery stage', () => {
      const motivation = getMotivationalQuote(60);
      expect(motivation.stage).toBe('Midpoint Mastery');
      expect(motivation.quote).toBe('Halfway there! The summit is in sight. Stay relentless.');
    });
  });

  describe('Integration with 2D Canvas & Export Pipeline', () => {
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
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
      };

      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx)
      };
    });

    it('DP-07: canvas renders demo goal in Mobile resolution without errors', async () => {
      const demo = createDemoGoal();
      const result = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
        goal: demo,
        preset: 'MOBILE',
        debugSafeZones: false
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        expect.stringContaining('Master Full-Stack Engineering'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('DP-08: canvas renders demo goal in Desktop resolution without errors', async () => {
      const demo = createDemoGoal();
      const result = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
        goal: demo,
        preset: 'DESKTOP',
        debugSafeZones: false
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('DP-09: formats clean, standard export filenames for demo goal', () => {
      const demo = createDemoGoal();
      const mobileName = generateWallpaperFilename(demo, 'alpine-peak', 'MOBILE');
      const desktopName = generateWallpaperFilename(demo, 'deep-pacific', 'DESKTOP');

      expect(mobileName).toBe('horizon-alpine-peak-master-full-stack-engineering-mobile.png');
      expect(desktopName).toBe('horizon-deep-pacific-master-full-stack-engineering-desktop.png');
    });
  });

  describe('Demo Mode Isolation & User Data Safety (useStorage)', () => {
    let mockStorage = {};

    beforeEach(() => {
      mockStorage = {};
      vi.spyOn(storageService, 'isAvailable').mockReturnValue(true);
      vi.spyOn(storageService, 'loadGoal').mockImplementation(() => {
        const item = mockStorage['horizon_v1_goal'];
        return item ? { success: true, data: JSON.parse(item) } : { success: false, data: null };
      });
      vi.spyOn(storageService, 'saveGoal').mockImplementation((goal) => {
        mockStorage['horizon_v1_goal'] = JSON.stringify(goal);
        return { success: true, data: goal };
      });
      vi.spyOn(storageService, 'deleteGoal').mockImplementation(() => {
        delete mockStorage['horizon_v1_goal'];
        return { success: true };
      });
      vi.spyOn(storageService, 'getSettings').mockReturnValue({});
      vi.spyOn(storageService, 'initStorage').mockReturnValue({ success: true });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('DP-10: entering demo mode activates demo goal and protects real LocalStorage data', () => {
      const userGoal = createDefaultGoal();
      userGoal.title = 'My Private User Goal';
      mockStorage['horizon_v1_goal'] = JSON.stringify(userGoal);

      const { goal, isDemoMode, enterDemoMode, persistNow } = useStorage();

      // Hydrate with user's real goal
      goal.value = userGoal;

      // Enter demo mode
      const demo = createDemoGoal();
      enterDemoMode(demo);

      expect(isDemoMode.value).toBe(true);
      expect(goal.value.title).toBe('Master Full-Stack Engineering');

      // Attempt to persist while in demo mode
      persistNow();

      // Verify LocalStorage was NOT overwritten with demo data
      const stored = JSON.parse(mockStorage['horizon_v1_goal']);
      expect(stored.title).toBe('My Private User Goal');
    });

    it('DP-11: exiting demo mode cleanly restores the original user goal', () => {
      const userGoal = createDefaultGoal();
      userGoal.title = 'My Real Course Goal 2026';
      mockStorage['horizon_v1_goal'] = JSON.stringify(userGoal);

      const { goal, isDemoMode, enterDemoMode, exitDemoMode } = useStorage();
      goal.value = userGoal;

      // Enter demo mode
      enterDemoMode(createDemoGoal());
      expect(isDemoMode.value).toBe(true);
      expect(goal.value.title).toBe('Master Full-Stack Engineering');

      // Exit demo mode
      exitDemoMode();
      expect(isDemoMode.value).toBe(false);
      expect(goal.value.title).toBe('My Real Course Goal 2026');

      // Verify LocalStorage still holds the user's real goal
      const stored = JSON.parse(mockStorage['horizon_v1_goal']);
      expect(stored.title).toBe('My Real Course Goal 2026');
    });
  });

  describe('Guided Presentation Steps', () => {
    it('DP-12: guided presentation steps covers all 6 evaluation milestones with valid targets', () => {
      expect(DEMO_GUIDED_STEPS).toHaveLength(6);

      const requiredSections = [
        'section-goal-overview',
        'section-milestones',
        'section-badges',
        'section-themes',
        'section-mockup-preview',
        'section-export-controls'
      ];

      DEMO_GUIDED_STEPS.forEach((step, idx) => {
        expect(step.step).toBe(idx + 1);
        expect(step.title).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.icon).toBeDefined();
        expect(requiredSections).toContain(step.targetSectionId);
      });
    });
  });
});
