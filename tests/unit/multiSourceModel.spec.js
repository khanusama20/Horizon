import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeGoal, createDefaultGoal, storageService } from '../../src/services/storageService.js';
import { generateMilestonePlan } from '../../src/services/milestoneEngine.js';

describe('Multi-Source Goal Data Model & Migration (Part A)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.initStorage();
  });

  describe('Goal Creation & Discriminated Source Types', () => {
    it('creates default goal with sourceType manual', () => {
      const def = createDefaultGoal();
      expect(def.sourceType).toBe('manual');
      expect(def.source).toBeNull();
      expect(def.customColors).toBeNull();
    });

    it('validates and normalizes Udemy goal structure', () => {
      const rawUdemyGoal = {
        id: 'goal-udemy-1',
        title: 'Complete Machine Learning Bootcamp',
        sourceType: 'udemy',
        source: {
          provider: 'udemy',
          url: 'https://www.udemy.com/course/machinelearning/',
          title: 'Complete Machine Learning Bootcamp',
          importedAt: '2026-11-23T10:00:00.000Z',
          extractionStatus: 'success'
        },
        milestones: [
          { id: 'ms-1', order: 1, title: 'Introduction', status: 'completed', completed: true }
        ]
      };

      const normalized = normalizeGoal(rawUdemyGoal);
      expect(normalized.sourceType).toBe('udemy');
      expect(normalized.source.provider).toBe('udemy');
      expect(normalized.source.url).toBe('https://www.udemy.com/course/machinelearning/');
      expect(normalized.milestones[0].completed).toBe(true);
      expect(normalized.milestones[0].status).toBe('completed');
    });

    it('validates and normalizes YouTube goal structure with video metadata', () => {
      const rawYouTubeGoal = {
        id: 'goal-yt-1',
        title: 'Full Stack Vue 3 Tutorial',
        sourceType: 'youtube',
        source: {
          provider: 'youtube',
          url: 'https://www.youtube.com/playlist?list=PL4cUxeGndAe6CT3019383',
          externalId: 'PL4cUxeGndAe6CT3019383',
          title: 'Vue 3 Tutorial',
          importedAt: '2026-11-23T11:00:00.000Z'
        },
        milestones: [
          {
            id: 'ms-1',
            order: 1,
            title: 'Lesson 1: Intro',
            status: 'pending',
            completed: false,
            type: 'lesson',
            video: {
              videoId: 'abc12345678',
              videoUrl: 'https://www.youtube.com/watch?v=abc12345678',
              durationSeconds: 600,
              formattedDuration: '10:00'
            }
          }
        ]
      };

      const normalized = normalizeGoal(rawYouTubeGoal);
      expect(normalized.sourceType).toBe('youtube');
      expect(normalized.source.provider).toBe('youtube');
      expect(normalized.milestones[0].type).toBe('lesson');
      expect(normalized.milestones[0].video.videoId).toBe('abc12345678');
      expect(normalized.milestones[0].video.durationSeconds).toBe(600);
    });

    it('validates manual goal without source metadata', () => {
      const rawManualGoal = {
        id: 'goal-manual-1',
        title: 'Study Calculus Chapters 1-5',
        sourceType: 'manual',
        milestones: [
          { id: 'ms-1', order: 1, title: 'Limits and Continuity', status: 'pending', completed: false }
        ]
      };

      const normalized = normalizeGoal(rawManualGoal);
      expect(normalized.sourceType).toBe('manual');
      expect(normalized.source.provider).toBe('manual');
      expect(normalized.milestones.length).toBe(1);
    });
  });

  describe('Backward Compatibility & Migration (Requirement 3)', () => {
    it('infers udemy sourceType for legacy goal containing udemy courseMetadata', () => {
      const legacyGoal = {
        id: 'legacy-goal-101',
        title: 'Master LLM Engineering',
        targetDate: '2026-12-15T00:00:00.000Z',
        totalDays: 15,
        courseMetadata: {
          sourceUrl: 'https://www.udemy.com/course/modern-llm/',
          sourceType: 'UDEMY',
          title: 'Modern Full-Stack LLM Engineering',
          totalSections: 8,
          rawSections: ['01. Setup', '02. Vector Search'],
          extractedAt: '2026-11-20T12:00:00.000Z'
        },
        milestones: [
          { id: 'ms-1', order: 1, title: '01. Setup', status: 'completed', completed: true, completedAt: '2026-11-21T10:00:00Z' },
          { id: 'ms-2', order: 2, title: '02. Vector Search', status: 'pending', completed: false }
        ]
      };

      const normalized = normalizeGoal(legacyGoal);
      expect(normalized.sourceType).toBe('udemy');
      expect(normalized.source.provider).toBe('udemy');
      expect(normalized.source.url).toBe('https://www.udemy.com/course/modern-llm/');
      // Completion state strictly preserved
      expect(normalized.milestones[0].completed).toBe(true);
      expect(normalized.milestones[0].status).toBe('completed');
      expect(normalized.milestones[0].completedAt).toBe('2026-11-21T10:00:00Z');
      expect(normalized.milestones[1].completed).toBe(false);
    });

    it('infers manual sourceType for legacy goal without external URL', () => {
      const legacyManualGoal = {
        id: 'legacy-manual-1',
        title: 'Learn Russian Alphabet',
        targetDate: '2026-12-01T00:00:00.000Z',
        totalDays: 7,
        milestones: [
          { id: 'ms-1', order: 1, title: 'Vowels', status: 'completed', completed: true }
        ]
      };

      const normalized = normalizeGoal(legacyManualGoal);
      expect(normalized.sourceType).toBe('manual');
      expect(normalized.source.provider).toBe('manual');
      expect(normalized.milestones[0].completed).toBe(true);
    });

    it('loadGoal automatically migrates stored legacy goal without resetting storage', () => {
      const legacyRaw = {
        id: 'saved-legacy-44',
        title: 'AWS Solutions Architect Prep',
        targetDate: '2026-12-30T00:00:00.000Z',
        totalDays: 30,
        milestones: [
          { id: 'ms-1', order: 1, title: 'VPC & Networking', status: 'completed', completed: true, completedAt: '2026-11-22T08:00:00Z' }
        ]
      };

      localStorage.setItem('horizon_v1_goal', JSON.stringify(legacyRaw));

      const loadRes = storageService.loadGoal();
      expect(loadRes.success).toBe(true);
      expect(loadRes.data.sourceType).toBe('manual');
      expect(loadRes.data.milestones[0].completed).toBe(true);
      expect(loadRes.data.milestones[0].completedAt).toBe('2026-11-22T08:00:00Z');
    });
  });

  describe('Milestone Generation for YouTube Videos', () => {
    it('creates lesson milestones with video metadata preserved', () => {
      const ytGoal = {
        id: 'goal-yt-plan',
        title: 'Vue 3 Course',
        sourceType: 'youtube',
        totalDays: 5,
        courseMetadata: {
          rawSections: [
            {
              title: '01. Options vs Composition',
              video: {
                videoId: 'vid11111111',
                videoUrl: 'https://www.youtube.com/watch?v=vid11111111',
                durationSeconds: 720,
                formattedDuration: '12:00'
              }
            },
            {
              title: '02. Reactivity with ref and reactive',
              video: {
                videoId: 'vid22222222',
                videoUrl: 'https://www.youtube.com/watch?v=vid22222222',
                durationSeconds: 900,
                formattedDuration: '15:00'
              }
            }
          ]
        }
      };

      const milestones = generateMilestonePlan(ytGoal);
      expect(milestones.length).toBe(2);
      expect(milestones[0].type).toBe('lesson');
      expect(milestones[0].video.videoId).toBe('vid11111111');
      expect(milestones[0].video.formattedDuration).toBe('12:00');
      expect(milestones[1].type).toBe('lesson');
      expect(milestones[1].video.videoId).toBe('vid22222222');
    });
  });
});
