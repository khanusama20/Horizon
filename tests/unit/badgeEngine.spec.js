import { describe, it, expect } from 'vitest';
import {
  evaluateBadges,
  getMotivationalQuote,
  BADGE_DEFINITIONS
} from '../../src/services/badgeEngine.js';

describe('Achievement Badge & Motivation Engine (Block 3 MVP)', () => {
  const createMockMilestones = (total, completedCount) => {
    return Array.from({ length: total }, (_, i) => ({
      id: `ms-${i + 1}`,
      order: i + 1,
      title: `Milestone ${i + 1}`,
      status: i < completedCount ? 'completed' : 'pending',
      completed: i < completedCount,
      completedAt: i < completedCount ? new Date().toISOString() : null
    }));
  };

  describe('Badge Unlocking Thresholds', () => {
    it('BG-01: zero progress keeps all 5 badges locked', () => {
      const milestones = createMockMilestones(4, 0);
      const badges = evaluateBadges(milestones);

      expect(badges).toHaveLength(5);
      badges.forEach(b => {
        expect(b.unlocked).toBe(false);
        expect(b.unlockedAt).toBeNull();
      });
    });

    it('BG-02: first milestone completion unlocks FIRST_STEP badge only', () => {
      const milestones = createMockMilestones(8, 1); // 1 / 8 = 12.5% (< 25%)
      const badges = evaluateBadges(milestones);

      const firstStep = badges.find(b => b.key === 'FIRST_STEP');
      const quarterWay = badges.find(b => b.key === 'QUARTER_WAY');

      expect(firstStep.unlocked).toBe(true);
      expect(firstStep.unlockedAt).toBeDefined();
      expect(quarterWay.unlocked).toBe(false);
    });

    it('BG-03: reaching 25% progress unlocks QUARTER_WAY badge', () => {
      const milestones = createMockMilestones(8, 2); // 2 / 8 = 25%
      const badges = evaluateBadges(milestones);

      expect(badges.find(b => b.key === 'FIRST_STEP').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'QUARTER_WAY').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'HALFWAY').unlocked).toBe(false);
    });

    it('BG-04: reaching 50% progress unlocks HALFWAY badge', () => {
      const milestones = createMockMilestones(4, 2); // 2 / 4 = 50%
      const badges = evaluateBadges(milestones);

      expect(badges.find(b => b.key === 'FIRST_STEP').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'QUARTER_WAY').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'HALFWAY').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'ALMOST_THERE').unlocked).toBe(false);
    });

    it('BG-05: reaching 75% progress unlocks ALMOST_THERE badge', () => {
      const milestones = createMockMilestones(4, 3); // 3 / 4 = 75%
      const badges = evaluateBadges(milestones);

      expect(badges.find(b => b.key === 'ALMOST_THERE').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'ACHIEVER').unlocked).toBe(false);
    });

    it('BG-06: 100% completion unlocks ACHIEVER and all badges', () => {
      const milestones = createMockMilestones(4, 4); // 4 / 4 = 100%
      const badges = evaluateBadges(milestones);

      badges.forEach(b => {
        expect(b.unlocked).toBe(true);
      });
    });
  });

  describe('Reactive Reversal & No Duplication', () => {
    it('BG-07: unchecking a milestone re-locks badges reactively', () => {
      // Initially 2 / 4 completed (50%) -> FIRST_STEP, QUARTER_WAY, HALFWAY unlocked
      const milestones = createMockMilestones(4, 2);
      let badges = evaluateBadges(milestones);
      expect(badges.find(b => b.key === 'HALFWAY').unlocked).toBe(true);

      // Revert one milestone -> 1 / 4 completed (25%) -> HALFWAY should re-lock
      milestones[1].status = 'pending';
      milestones[1].completed = false;
      milestones[1].completedAt = null;

      badges = evaluateBadges(milestones);
      expect(badges.find(b => b.key === 'FIRST_STEP').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'QUARTER_WAY').unlocked).toBe(true);
      expect(badges.find(b => b.key === 'HALFWAY').unlocked).toBe(false);

      // Revert to 0 -> all re-lock
      milestones[0].status = 'pending';
      milestones[0].completed = false;
      badges = evaluateBadges(milestones);
      badges.forEach(b => {
        expect(b.unlocked).toBe(false);
      });
    });

    it('BG-08: guarantees exactly 5 distinct badges with no duplicates', () => {
      const badges = evaluateBadges(createMockMilestones(5, 3));
      const keys = badges.map(b => b.key);
      const uniqueKeys = new Set(keys);

      expect(badges.length).toBe(5);
      expect(uniqueKeys.size).toBe(5);
      expect(keys).toEqual(['FIRST_STEP', 'QUARTER_WAY', 'HALFWAY', 'ALMOST_THERE', 'ACHIEVER']);
    });
  });

  describe('Motivational Quote Progression', () => {
    it('BG-09: returns correct contextual quote at each threshold', () => {
      expect(getMotivationalQuote(0).stage).toBe('Starting Out');
      expect(getMotivationalQuote(15).stage).toBe('Building Momentum');
      expect(getMotivationalQuote(30).stage).toBe('Steady Ascent');
      expect(getMotivationalQuote(50).stage).toBe('Midpoint Mastery');
      expect(getMotivationalQuote(80).stage).toBe('Final Approach');
      expect(getMotivationalQuote(100).stage).toBe('Summit Reached');
    });
  });
});
