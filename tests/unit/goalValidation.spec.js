import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSampleLlmGoal,
  SAMPLE_LLM_COURSE,
  SAMPLE_LLM_COURSE_SECTIONS
} from '../../src/services/sampleCourse.js';
import { storageService, createDefaultGoal } from '../../src/services/storageService.js';

describe('Goal Form Validation & Sample Demo Loader (Block 2 MVP)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.initStorage();
  });

  describe('Goal Form Data Validation Rules', () => {
    it('GL-01: validates goal title presence and boundary length', () => {
      const isRequired = val => val !== undefined && val !== null && String(val).trim() !== '';
      const isValidLength = val => val && val.length <= 60;

      expect(isRequired('')).toBe(false);
      expect(isRequired('   ')).toBe(false);
      expect(isRequired('Complete LLM Engineering Course')).toBe(true);

      expect(isValidLength('A'.repeat(60))).toBe(true);
      expect(isValidLength('A'.repeat(61))).toBe(false);
    });

    it('GL-02: validates deadline duration boundaries (1 to 365 days)', () => {
      const isValidDuration = val => Number(val) >= 1 && Number(val) <= 365;

      expect(isValidDuration(0)).toBe(false);
      expect(isValidDuration(-5)).toBe(false);
      expect(isValidDuration(15)).toBe(true);
      expect(isValidDuration(365)).toBe(true);
      expect(isValidDuration(366)).toBe(false);
      expect(isValidDuration('abc')).toBe(false);
    });

    it('GL-03: validates category inclusion', () => {
      const validCategories = ['Learning', 'Certification', 'Project', 'Fitness', 'Personal'];

      expect(validCategories.includes('Learning')).toBe(true);
      expect(validCategories.includes('Certification')).toBe(true);
      expect(validCategories.includes('InvalidCategory')).toBe(false);
    });
  });

  describe('1-Click Sample LLM Course Demo Loader', () => {
    it('GL-04: generates complete, realistic offline sample course data', () => {
      const sampleGoal = createSampleLlmGoal();

      expect(sampleGoal.title).toBe(SAMPLE_LLM_COURSE.title);
      expect(sampleGoal.totalDays).toBe(15);
      expect(sampleGoal.category).toBe('Learning');
      expect(sampleGoal.courseMetadata).toBeDefined();
      expect(sampleGoal.courseMetadata.sourceType).toBe('UDEMY');
      expect(sampleGoal.courseMetadata.totalSections).toBe(8);
      expect(sampleGoal.courseMetadata.rawSections).toEqual(SAMPLE_LLM_COURSE_SECTIONS);
    });

    it('GL-05: preserves existing goal ID when loading sample over active goal', () => {
      const existing = createDefaultGoal();
      existing.id = 'goal-existing-custom-id';

      const populated = createSampleLlmGoal(existing);
      expect(populated.id).toBe('goal-existing-custom-id');
      expect(populated.title).toBe(SAMPLE_LLM_COURSE.title);
    });

    it('GL-06: persists loaded sample course goal into LocalStorage faithfully', () => {
      const sampleGoal = createSampleLlmGoal();
      const saveResult = storageService.saveGoal(sampleGoal);
      expect(saveResult.success).toBe(true);

      const loadedResult = storageService.loadGoal();
      expect(loadedResult.success).toBe(true);
      expect(loadedResult.data.title).toBe('Complete LLM Engineering Course');
      expect(loadedResult.data.courseMetadata.rawSections).toHaveLength(8);
      expect(loadedResult.data.courseMetadata.rawSections[0]).toBe('Foundations and First Projects');
    });
  });
});
