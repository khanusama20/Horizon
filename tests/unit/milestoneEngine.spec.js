import { describe, it, expect } from 'vitest';
import {
  generateMilestonePlan,
  calculateProgress,
  toggleMilestoneState,
  calculateDaysRemaining
} from '../../src/services/milestoneEngine.js';

describe('Milestone Planning Engine (Block 3 MVP)', () => {
  const fixedBaseDate = new Date('2026-11-23T00:00:00.000Z');

  describe('Section Pacing & Day Distribution', () => {
    it('MP-01: fewer sections than available days (N < D) are spaced out evenly with review buffer', () => {
      const goal = {
        title: 'Master LLM Engineering',
        totalDays: 15,
        targetDate: new Date(fixedBaseDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        courseMetadata: {
          rawSections: [
            'Foundations and First Projects',
            'Frontier APIs and Chatbots',
            'Embracing Open-Source Models',
            'LLM Selection & Code Gen',
            'Retrieval-Augmented Generation'
          ]
        }
      };

      const milestones = generateMilestonePlan(goal, fixedBaseDate);

      // 5 learning sections + 1 final review buffer milestone = 6 milestones
      expect(milestones.length).toBe(6);
      expect(milestones[0].order).toBe(1);
      expect(milestones[0].title).toBe('Foundations and First Projects');
      expect(milestones[0].targetDay).toBeGreaterThanOrEqual(1);

      // Final milestone is the review buffer
      const last = milestones[milestones.length - 1];
      expect(last.type).toBe('review');
      expect(last.title).toMatch(/Final Review/i);
      expect(last.targetDay).toBe(15);
    });

    it('MP-02: more sections than available days (N > D) are bundled evenly', () => {
      const goal = {
        title: 'Crash Course',
        totalDays: 4,
        targetDate: new Date(fixedBaseDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        courseMetadata: {
          rawSections: [
            'Sec 1', 'Sec 2', 'Sec 3', 'Sec 4',
            'Sec 5', 'Sec 6', 'Sec 7', 'Sec 8'
          ]
        }
      };

      const milestones = generateMilestonePlan(goal, fixedBaseDate);

      // 8 sections into 4 days: exactly 4 bundled milestones
      expect(milestones.length).toBe(4);
      expect(milestones[0].targetDay).toBe(1);
      expect(milestones[1].targetDay).toBe(2);
      expect(milestones[2].targetDay).toBe(3);
      expect(milestones[3].targetDay).toBe(4);

      // Titles include bundling indicator
      expect(milestones[0].title).toContain('Sec 1 (+1 more)');
      expect(milestones[0].description).toBe('Sec 1 • Sec 2');
    });

    it('MP-03: equal sections and days (N = D) without buffer assigns 1 section per day', () => {
      const goal = {
        title: '7-Day Bootcamp',
        totalDays: 7,
        targetDate: new Date(fixedBaseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        courseMetadata: {
          rawSections: [
            'Day 1 Topic', 'Day 2 Topic', 'Day 3 Topic', 'Day 4 Topic',
            'Day 5 Topic', 'Day 6 Topic', 'Day 7 Topic'
          ]
        }
      };

      const milestones = generateMilestonePlan(goal, fixedBaseDate);

      expect(milestones.length).toBe(7);
      milestones.forEach((m, idx) => {
        expect(m.order).toBe(idx + 1);
        expect(m.targetDay).toBe(idx + 1);
        expect(m.title).toBe(goal.courseMetadata.rawSections[idx]);
      });
    });

    it('MP-04: single day deadline (D = 1) bundles all content into today', () => {
      const goal = {
        title: 'Emergency 1-Day Cram',
        totalDays: 1,
        targetDate: new Date(fixedBaseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        courseMetadata: {
          rawSections: ['Chapter 1', 'Chapter 2', 'Chapter 3']
        }
      };

      const milestones = generateMilestonePlan(goal, fixedBaseDate);

      expect(milestones.length).toBe(1);
      expect(milestones[0].targetDay).toBe(1);
      expect(milestones[0].title).toContain('Chapter 1 (+2 more)');
    });

    it('MP-05: handles past deadline (D <= 0) safely without crashing', () => {
      const goal = {
        title: 'Past Goal',
        totalDays: -2,
        targetDate: new Date(fixedBaseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        courseMetadata: {
          rawSections: ['Section A', 'Section B']
        }
      };

      const milestones = generateMilestonePlan(goal, fixedBaseDate);

      expect(milestones.length).toBeGreaterThan(0);
      expect(milestones[0].targetDay).toBe(1);
      expect(milestones[0].id).toBe('ms-1');
    });

    it('MP-06: handles zero sections (N = 0) with a clean default milestone', () => {
      const goal = {
        title: 'Learn Vue 3',
        totalDays: 10,
        targetDate: new Date(fixedBaseDate.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        courseMetadata: { rawSections: [] }
      };

      const milestones = generateMilestonePlan(goal, fixedBaseDate);

      expect(milestones.length).toBe(1);
      expect(milestones[0].title).toBe('Learn Vue 3');
      expect(milestones[0].targetDay).toBe(10);
    });

    it('MP-07: generates stable chronological IDs and due dates', () => {
      const goal = {
        title: 'Chronological Plan',
        totalDays: 3,
        courseMetadata: { rawSections: ['A', 'B', 'C'] }
      };

      const milestones = generateMilestonePlan(goal, fixedBaseDate);

      expect(milestones.map(m => m.id)).toEqual(['ms-1', 'ms-2', 'ms-3']);

      // Due dates are in non-decreasing order
      const d1 = new Date(milestones[0].dueDate).getTime();
      const d2 = new Date(milestones[1].dueDate).getTime();
      const d3 = new Date(milestones[2].dueDate).getTime();
      expect(d1).toBeLessThanOrEqual(d2);
      expect(d2).toBeLessThanOrEqual(d3);
    });
  });

  describe('Preservation of Milestone State on Plan Regeneration', () => {
    it('MP-08: preserves completed status and completedAt when regenerating plan', () => {
      const existingMilestones = [
        {
          id: 'ms-1',
          order: 1,
          title: 'Foundations and First Projects',
          status: 'completed',
          completed: true,
          completedAt: '2026-11-23T10:00:00.000Z'
        },
        {
          id: 'ms-2',
          order: 2,
          title: 'Frontier APIs and Chatbots',
          status: 'pending',
          completed: false,
          completedAt: null
        }
      ];

      const goal = {
        title: 'Regeneration Goal',
        totalDays: 15,
        courseMetadata: {
          rawSections: [
            'Foundations and First Projects',
            'Frontier APIs and Chatbots',
            'Embracing Open-Source Models'
          ]
        },
        milestones: existingMilestones
      };

      const regenerated = generateMilestonePlan(goal, fixedBaseDate);

      // First milestone remains completed with original timestamp
      expect(regenerated[0].status).toBe('completed');
      expect(regenerated[0].completed).toBe(true);
      expect(regenerated[0].completedAt).toBe('2026-11-23T10:00:00.000Z');

      // Second milestone remains pending
      expect(regenerated[1].status).toBe('pending');
      expect(regenerated[1].completed).toBe(false);
    });
  });

  describe('Progress Calculation & Toggle Utilities', () => {
    it('MP-09: accurately calculates progress percentage', () => {
      expect(calculateProgress([])).toBe(0);
      expect(calculateProgress([{ status: 'pending' }, { status: 'pending' }])).toBe(0);
      expect(calculateProgress([{ status: 'completed' }, { status: 'pending' }])).toBe(50);
      expect(calculateProgress([
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' }
      ])).toBe(75);
      expect(calculateProgress([{ status: 'completed' }])).toBe(100);
    });

    it('MP-10: toggleMilestoneState flips status and stamps/clears completion timestamp', () => {
      const list = [
        { id: 'ms-1', status: 'pending', completed: false, completedAt: null },
        { id: 'ms-2', status: 'pending', completed: false, completedAt: null }
      ];

      const toggledOn = toggleMilestoneState(list, 'ms-1');
      expect(toggledOn[0].status).toBe('completed');
      expect(toggledOn[0].completed).toBe(true);
      expect(toggledOn[0].completedAt).toBeDefined();
      expect(toggledOn[1].status).toBe('pending');

      const toggledOff = toggleMilestoneState(toggledOn, 'ms-1');
      expect(toggledOff[0].status).toBe('pending');
      expect(toggledOff[0].completed).toBe(false);
      expect(toggledOff[0].completedAt).toBeNull();
    });
  });
});
