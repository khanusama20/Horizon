import { describe, it, expect } from 'vitest';
import { classifySectionType, isAssessmentSection } from '../../src/services/assessmentDetector.js';

describe('Assessment & Review Detector (Block 3 MVP)', () => {
  describe('Assessment Keywords Detection', () => {
    it('AD-01: identifies quizzes, exams, and knowledge checks', () => {
      expect(classifySectionType('Module 1 Quiz')).toBe('assessment');
      expect(classifySectionType('Midterm Examination')).toBe('assessment');
      expect(classifySectionType('Practice Exam: AWS Cloud Practitioner')).toBe('assessment');
      expect(classifySectionType('Knowledge Check Assessment')).toBe('assessment');
      expect(classifySectionType('Final Exam')).toBe('assessment');
      expect(isAssessmentSection('Final Exam')).toBe(true);
    });

    it('AD-02: identifies assignments, practice tests, and final projects', () => {
      expect(classifySectionType('Graded Assignment: Fine-Tuning Llama')).toBe('assessment');
      expect(classifySectionType('Practice Test 1')).toBe('assessment');
      expect(classifySectionType('Capstone Project: End-to-End RAG')).toBe('assessment');
      expect(classifySectionType('Final Project Submission')).toBe('assessment');
    });

    it('AD-03: identifies standalone "Quiz", "Exam", "Assessment"', () => {
      expect(classifySectionType('Quiz')).toBe('assessment');
      expect(classifySectionType('Exam')).toBe('assessment');
      expect(classifySectionType('Assessment')).toBe('assessment');
    });
  });

  describe('Non-Assessment / False Positive Prevention', () => {
    it('AD-04: does NOT misclassify technical sections containing "test" or "testing"', () => {
      expect(classifySectionType('Unit Testing with PyTest')).toBe('learning');
      expect(classifySectionType('Software Testing Fundamentals')).toBe('learning');
      expect(classifySectionType('Test-Driven Development (TDD)')).toBe('learning');
      expect(classifySectionType('Integration Testing of Microservices')).toBe('learning');
      expect(classifySectionType('Automated Testing Frameworks')).toBe('learning');
      expect(classifySectionType('A/B Testing in Production')).toBe('learning');
    });

    it('AD-05: standard learning sections are classified as "learning"', () => {
      expect(classifySectionType('Foundations and First Projects')).toBe('learning');
      expect(classifySectionType('Frontier APIs and Customer Service Chatbots')).toBe('learning');
      expect(classifySectionType('Embracing Open-Source Models')).toBe('learning');
      expect(classifySectionType('Retrieval-Augmented Generation (RAG)')).toBe('learning');
      expect(classifySectionType('Deployment and Finalization')).toBe('learning');
    });
  });

  describe('Review and Synthesis Detection', () => {
    it('AD-06: identifies review and wrap-up sections', () => {
      expect(classifySectionType('Final Review & Knowledge Synthesis')).toBe('review');
      expect(classifySectionType('Course Summary & Next Steps')).toBe('review');
      expect(classifySectionType('Wrap-Up and Recap')).toBe('review');
    });
  });

  describe('Edge Cases', () => {
    it('AD-07: handles empty, null, or undefined values gracefully', () => {
      expect(classifySectionType('')).toBe('learning');
      expect(classifySectionType(null)).toBe('learning');
      expect(classifySectionType(undefined)).toBe('learning');
    });
  });
});
