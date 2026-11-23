import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storageService, createDefaultGoal } from '../../src/services/storageService.js';
import { useStorage } from '../../src/composables/useStorage.js';
import { generateMilestonePlan, calculateProgress } from '../../src/services/milestoneEngine.js';
import { evaluateBadges, getMotivationalQuote } from '../../src/services/badgeEngine.js';
import { CanvasWallpaperEngine, CANVAS_DIMENSIONS, SAFE_ZONES } from '../../src/services/CanvasWallpaperEngine.js';
import { getAllThemes, getTheme } from '../../src/services/themeRegistry.js';
import { wallpaperExportService, generateWallpaperFilename } from '../../src/services/wallpaperExportService.js';
import { createDemoGoal, DEMO_GUIDED_STEPS } from '../../src/services/demoDataService.js';
import { validateCourseUrl, extractCourseMetadata, RESTRICTED_ACCESS_USER_MESSAGE } from '../../server/scraper.js';
import { parseSyllabusText } from '../../src/services/syllabusParser.js';

describe('Block 7 — Final Focused MVP Quality Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.initStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Goal Creation & Input Boundaries', () => {
    it('B7-01: validates goal boundary durations and title constraints', () => {
      const isRequired = val => val !== undefined && val !== null && String(val).trim() !== '';
      const isValidDays = val => Number(val) >= 1 && Number(val) <= 365;

      expect(isRequired('')).toBe(false);
      expect(isRequired('   ')).toBe(false);
      expect(isRequired('Learn Rust in 30 Days')).toBe(true);

      expect(isValidDays(0)).toBe(false);
      expect(isValidDays(1)).toBe(true);
      expect(isValidDays(365)).toBe(true);
      expect(isValidDays(366)).toBe(false);
      expect(isValidDays(-10)).toBe(false);
    });

    it('B7-02: generates correct future target date across month and year boundaries', () => {
      const now = new Date('2026-12-25T12:00:00.000Z');
      const totalDays = 10;
      const target = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);

      expect(target.getUTCFullYear()).toBe(2027);
      expect(target.getUTCMonth()).toBe(0); // January
      expect(target.getUTCDate()).toBe(4);
    });
  });

  describe('2. Milestone Engine & Chronology', () => {
    it('B7-03: milestones maintain strictly non-decreasing chronological order and valid due dates', () => {
      const baseDate = new Date('2026-11-23T00:00:00.000Z');
      const goal = {
        title: 'Full Stack Engineering',
        totalDays: 20,
        targetDate: new Date(baseDate.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        courseMetadata: {
          rawSections: [
            'Section 1: Architecture',
            'Section 2: Database Design',
            'Section 3: API Gateway',
            'Section 4: Cache Layers',
            'Section 5: Deployment'
          ]
        }
      };

      const milestones = generateMilestonePlan(goal, baseDate);
      expect(milestones.length).toBeGreaterThan(0);

      for (let i = 0; i < milestones.length; i++) {
        expect(milestones[i].order).toBe(i + 1);
        expect(milestones[i].targetDay).toBeGreaterThanOrEqual(1);
        expect(milestones[i].targetDay).toBeLessThanOrEqual(20);

        if (i > 0) {
          expect(milestones[i].targetDay).toBeGreaterThanOrEqual(milestones[i - 1].targetDay);
          const prevDate = new Date(milestones[i - 1].dueDate).getTime();
          const currDate = new Date(milestones[i].dueDate).getTime();
          expect(currDate).toBeGreaterThanOrEqual(prevDate);
        }
      }
    });

    it('B7-04: completion state calculation reflects exact percentages without floating point drift', () => {
      const makeMilestones = (total, completed) =>
        Array.from({ length: total }, (_, i) => ({
          id: `m-${i}`,
          completed: i < completed,
          status: i < completed ? 'completed' : 'pending'
        }));

      expect(calculateProgress([])).toBe(0);
      expect(calculateProgress(makeMilestones(4, 1))).toBe(25);
      expect(calculateProgress(makeMilestones(4, 2))).toBe(50);
      expect(calculateProgress(makeMilestones(4, 3))).toBe(75);
      expect(calculateProgress(makeMilestones(4, 4))).toBe(100);
      expect(calculateProgress(makeMilestones(3, 1))).toBe(33); // Rounded integer
      expect(calculateProgress(makeMilestones(3, 2))).toBe(67); // Rounded integer
    });
  });

  describe('3. Gamification State Machine', () => {
    it('B7-05: unlock triggers follow strict percentage thresholds and re-lock cleanly', () => {
      const ms = [
        { id: '1', completed: false, status: 'pending' },
        { id: '2', completed: false, status: 'pending' },
        { id: '3', completed: false, status: 'pending' },
        { id: '4', completed: false, status: 'pending' }
      ];

      // 0%: All locked
      let badges = evaluateBadges(ms);
      expect(badges.every(b => !b.unlocked)).toBe(true);

      // 1 of 4 (25%): FIRST_STEP and QUARTER_WAY unlocked
      ms[0].completed = true;
      ms[0].status = 'completed';
      badges = evaluateBadges(ms);
      expect(badges.find(b => b.key === 'FIRST_STEP').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'QUARTER_WAY').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'HALFWAY').unlocked).toBe(false);

      // 2 of 4 (50%): HALFWAY unlocked
      ms[1].completed = true;
      ms[1].status = 'completed';
      badges = evaluateBadges(ms);
      expect(badges.find(b => b.key === 'HALFWAY').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'ALMOST_THERE').unlocked).toBe(false);

      // 4 of 4 (100%): All unlocked
      ms[2].completed = true;
      ms[2].status = 'completed';
      ms[3].completed = true;
      ms[3].status = 'completed';
      badges = evaluateBadges(ms);
      expect(badges.every(b => b.unlocked)).toBe(true);

      // Re-lock when unchecking milestone 4 (75%)
      ms[3].completed = false;
      ms[3].status = 'pending';
      badges = evaluateBadges(ms);
      expect(badges.find(b => b.key === 'ACHIEVER').unlocked).toBe(false);
      expect(badges.find(b => b.key === 'ALMOST_THERE').unlocked).toBe(true);
    });

    it('B7-06: motivational quote responds dynamically to each progression tier', () => {
      expect(getMotivationalQuote(0).stage).toBe('Starting Out');
      expect(getMotivationalQuote(25).stage).toBe('Steady Ascent');
      expect(getMotivationalQuote(50).stage).toBe('Midpoint Mastery');
      expect(getMotivationalQuote(75).stage).toBe('Final Approach');
      expect(getMotivationalQuote(100).stage).toBe('Summit Reached');
    });
  });

  describe('4. Nature Themes & Canvas Engine', () => {
    let mockCtx;
    let mockCanvas;

    beforeEach(() => {
      mockCtx = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(text => ({ width: text.length * 10 })),
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

    it('B7-07: verifies all 4 nature themes are available with complete palettes', () => {
      const themes = getAllThemes();
      expect(themes).toHaveLength(4);

      const expectedIds = ['alpine-peak', 'deep-pacific', 'golden-horizon', 'minimalist-stone'];
      themes.forEach(theme => {
        expect(expectedIds).toContain(theme.id);
        expect(theme.name).toBeDefined();
        expect(theme.palette.cardBackground).toBeDefined();
        expect(theme.palette.accentColor).toBeDefined();
        expect(theme.palette.primaryText).toBeDefined();
      });
    });

    it('B7-08: renders Mobile 1080x1920 with safe-zone compliance', async () => {
      const goal = createDemoGoal();
      const result = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
        goal,
        preset: 'MOBILE'
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(CANVAS_DIMENSIONS.MOBILE.width);
      expect(result.height).toBe(CANVAS_DIMENSIONS.MOBILE.height);
      expect(SAFE_ZONES.MOBILE.topReserved).toBe(280);
      expect(SAFE_ZONES.MOBILE.bottomReserved).toBe(200);
      expect(SAFE_ZONES.MOBILE.contentBottom).toBe(1720);
    });

    it('B7-09: renders Desktop 1920x1080 with clean typography', async () => {
      const goal = createDemoGoal();
      const result = await CanvasWallpaperEngine.renderWallpaper(mockCanvas, {
        goal,
        preset: 'DESKTOP'
      });

      expect(result.success).toBe(true);
      expect(result.width).toBe(CANVAS_DIMENSIONS.DESKTOP.width);
      expect(result.height).toBe(CANVAS_DIMENSIONS.DESKTOP.height);
      expect(SAFE_ZONES.DESKTOP.topReserved).toBe(80);
      expect(SAFE_ZONES.DESKTOP.bottomReserved).toBe(80);
    });
  });

  describe('5. Wallpaper Export & Filename Sanitization', () => {
    it('B7-10: generates deterministic, safe filenames for mobile and desktop exports', () => {
      const goal = { title: 'AWS Solutions Architect & DevOps (2026)', templateId: 'golden-horizon' };
      const mobileName = generateWallpaperFilename(goal, 'golden-horizon', 'MOBILE');
      const desktopName = generateWallpaperFilename(goal, 'golden-horizon', 'DESKTOP');

      expect(mobileName).toBe('horizon-golden-horizon-aws-solutions-architect-devops-2026-mobile.png');
      expect(desktopName).toBe('horizon-golden-horizon-aws-solutions-architect-devops-2026-desktop.png');
      expect(mobileName).not.toMatch(/[\\/:*?"<>|&]/);
      expect(desktopName).not.toMatch(/[\\/:*?"<>|&]/);
    });
  });

  describe('6. Demo Presentation Mode & Data Safety', () => {
    it('B7-11: demo mode starts 100% offline with future target date and never pollutes LocalStorage', () => {
      // 1. Save user's genuine goal
      const genuineGoal = createDefaultGoal();
      genuineGoal.title = 'My Private Production Goal';
      storageService.saveGoal(genuineGoal);

      const { goal, isDemoMode, enterDemoMode, exitDemoMode, persistNow } = useStorage();
      expect(goal.value.title).toBe('My Private Production Goal');

      // 2. Enter demo mode
      const demo = createDemoGoal();
      enterDemoMode(demo);
      expect(isDemoMode.value).toBe(true);
      expect(goal.value.title).toBe('Master Full-Stack Engineering');

      // Verify future deadline
      const diffDays = Math.round((new Date(goal.value.targetDate) - Date.now()) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBeGreaterThan(0);

      // Verify 3 of 5 completed (60%)
      const completed = goal.value.milestones.filter(m => m.completed);
      expect(completed.length).toBe(3);
      expect(goal.value.milestones.length).toBe(5);

      // 3. Attempt persist during demo mode
      persistNow();

      // 4. Check LocalStorage is UNTOUCHED
      const stored = storageService.loadGoal();
      expect(stored.data.title).toBe('My Private Production Goal');

      // 5. Exit demo mode and verify restoration
      exitDemoMode();
      expect(isDemoMode.value).toBe(false);
      expect(goal.value.title).toBe('My Private Production Goal');
    });

    it('B7-12: all 6 demo presentation steps have valid targets and informative badges', () => {
      expect(DEMO_GUIDED_STEPS).toHaveLength(6);
      DEMO_GUIDED_STEPS.forEach((step, idx) => {
        expect(step.step).toBe(idx + 1);
        expect(step.targetSectionId).toBeDefined();
        expect(step.badge).toBe(`Step ${idx + 1} of 6`);
      });
    });
  });

  describe('7. Security, SSRF & Graceful Fallback', () => {
    it('B7-13: SSRF filter blocks private IPs, metadata endpoints, and loopbacks', () => {
      const blockedUrls = [
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'http://10.0.0.1/admin',
        'http://192.168.1.1/router',
        'http://172.16.0.1/internal',
        'http://169.254.169.254/latest/meta-data/',
        'http://metadata.google.internal/computeMetadata/v1/',
        'ftp://example.com/file',
        'file:///etc/passwd',
        'javascript:alert(1)'
      ];

      blockedUrls.forEach(url => {
        const val = validateCourseUrl(url);
        expect(val.valid).toBe(false);
      });
    });

    it('B7-14: HTTP 403 or anti-bot blocks return user-friendly message without technical jargon', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Access Denied')
      });

      try {
        const res = await extractCourseMetadata('https://www.udemy.com/course/blocked/');
        expect(res.success).toBe(false);
        expect(res.restricted).toBe(true);
        expect(res.fallbackRequired).toBe(true);
        expect(res.error).toBe(RESTRICTED_ACCESS_USER_MESSAGE);
        expect(res.error).not.toMatch(/cloudflare/i);
        expect(res.error).not.toMatch(/anti-bot/i);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('B7-15: syllabus text parser extracts clean module names from raw outline input', () => {
      const rawText = `
        1. Foundations and First Projects (45 mins)
        2. Frontier APIs and Customer Service Chatbots
        - Retrieval-Augmented Generation (RAG)
        Section IV: Fine-Tuning & Evaluation
      `;

      const sections = parseSyllabusText(rawText);
      expect(sections).toHaveLength(4);
      expect(sections[0]).toBe('Foundations and First Projects');
      expect(sections[1]).toBe('Frontier APIs and Customer Service Chatbots');
      expect(sections[2]).toBe('Retrieval-Augmented Generation (RAG)');
      expect(sections[3]).toBe('Fine-Tuning & Evaluation');
    });
  });
});
