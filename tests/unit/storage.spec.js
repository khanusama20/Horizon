import { describe, it, expect, beforeEach } from 'vitest';
import {
  storageService,
  STORAGE_KEYS,
  CURRENT_SCHEMA_VERSION,
  createDefaultGoal,
  createDefaultSettings
} from '../../src/services/storageService.js';

describe('Horizon LocalStorage Persistence Service (Block 1 MVP)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('MVP-LS-01: initializes storage metadata and default settings on first run', () => {
    const result = storageService.initStorage();
    expect(result.success).toBe(true);
    expect(result.version).toBe(CURRENT_SCHEMA_VERSION);

    const meta = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEMA_META));
    expect(meta.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(meta.initializedAt).toBeDefined();

    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS));
    expect(settings.theme).toBe('dark');
    expect(settings.defaultExportFormat).toBe('MOBILE_1080x1920');
  });

  it('MVP-LS-02: returns null cleanly when no goal exists yet', () => {
    const result = storageService.loadGoal();
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it('MVP-LS-03: saves, persists, and hydrates goal data faithfully', () => {
    const goal = createDefaultGoal();
    goal.title = 'Complete LLM Engineering Course';
    goal.totalDays = 15;
    goal.category = 'Learning';

    const saveResult = storageService.saveGoal(goal);
    expect(saveResult.success).toBe(true);
    expect(saveResult.data.title).toBe('Complete LLM Engineering Course');
    expect(saveResult.data.updatedAt).toBeDefined();

    const loadResult = storageService.loadGoal();
    expect(loadResult.success).toBe(true);
    expect(loadResult.data.title).toBe('Complete LLM Engineering Course');
    expect(loadResult.data.totalDays).toBe(15);
  });

  it('MVP-LS-04: updates partial goal fields without mutating unaffected fields', () => {
    const initial = createDefaultGoal();
    initial.title = 'AWS Solutions Architect';
    initial.totalDays = 30;
    storageService.saveGoal(initial);

    const updateResult = storageService.updateGoal({ title: 'AWS Solutions Architect Professional' });
    expect(updateResult.success).toBe(true);
    expect(updateResult.data.title).toBe('AWS Solutions Architect Professional');
    expect(updateResult.data.totalDays).toBe(30);

    const reloaded = storageService.loadGoal();
    expect(reloaded.data.title).toBe('AWS Solutions Architect Professional');
    expect(reloaded.data.totalDays).toBe(30);
  });

  it('MVP-LS-05: deletes goal from LocalStorage cleanly', () => {
    const goal = createDefaultGoal();
    storageService.saveGoal(goal);
    expect(localStorage.getItem(STORAGE_KEYS.GOAL)).not.toBeNull();

    const deleteResult = storageService.deleteGoal();
    expect(deleteResult.success).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.GOAL)).toBeNull();

    const loadResult = storageService.loadGoal();
    expect(loadResult.data).toBeNull();
  });

  it('MVP-LS-06: catches corrupted JSON syntax gracefully without crashing', () => {
    localStorage.setItem(STORAGE_KEYS.GOAL, '{ invalid: json syntax');

    const result = storageService.loadGoal();
    expect(result.success).toBe(false);
    expect(result.wasCorrupted).toBe(true);
    expect(result.data).toBeNull();
  });

  it('MVP-LS-07: catches corrupted goal structure (missing id) and flags corruption', () => {
    localStorage.setItem(STORAGE_KEYS.GOAL, JSON.stringify({ someKey: 'without id' }));

    const result = storageService.loadGoal();
    expect(result.success).toBe(false);
    expect(result.wasCorrupted).toBe(true);
    expect(result.data).toBeNull();
  });

  it('MVP-LS-08: clearAll wipes all horizon_v1_* keys', () => {
    storageService.initStorage();
    storageService.saveGoal(createDefaultGoal());
    expect(localStorage.getItem(STORAGE_KEYS.GOAL)).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_META)).not.toBeNull();

    storageService.clearAll();
    expect(localStorage.getItem(STORAGE_KEYS.GOAL)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_META)).toBeNull();
  });

  it('MVP-LS-09: milestones and their completion state survive save and reload', () => {
    const goal = createDefaultGoal();
    goal.title = 'Complete LLM Engineering Course';
    goal.milestones = [
      {
        id: 'ms-1',
        order: 1,
        title: 'Foundations and First Projects',
        targetDay: 2,
        dueDate: '2026-11-25T23:59:59.000Z',
        status: 'completed',
        completed: true,
        completedAt: '2026-11-23T12:00:00.000Z',
        type: 'learning',
        isQuiz: false
      },
      {
        id: 'ms-2',
        order: 2,
        title: 'Midterm Exam',
        targetDay: 5,
        dueDate: '2026-11-28T23:59:59.000Z',
        status: 'pending',
        completed: false,
        completedAt: null,
        type: 'assessment',
        isQuiz: true
      }
    ];

    storageService.saveGoal(goal);

    const reloaded = storageService.loadGoal();
    expect(reloaded.success).toBe(true);
    expect(reloaded.data.milestones).toHaveLength(2);
    expect(reloaded.data.milestones[0].status).toBe('completed');
    expect(reloaded.data.milestones[0].completed).toBe(true);
    expect(reloaded.data.milestones[0].completedAt).toBe('2026-11-23T12:00:00.000Z');
    expect(reloaded.data.milestones[1].status).toBe('pending');
    expect(reloaded.data.milestones[1].type).toBe('assessment');
    expect(reloaded.data.milestones[1].isQuiz).toBe(true);
  });
});
