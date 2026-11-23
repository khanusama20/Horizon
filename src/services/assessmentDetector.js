/**
 * Horizon Assessment & Review Detector
 * Classifies curriculum section titles into 'learning', 'assessment', or 'review'.
 * Designed to prevent false positives (e.g., "Software Testing" should not be marked as an exam).
 */

// Explicit assessment patterns
const ASSESSMENT_PATTERNS = [
  /\b(?:quiz|quizzes)\b/i,
  /\b(?:final exam|midterm exam|practice exam|certification exam|mock exam|midterm examination|final examination)\b/i,
  /\b(?:practice test|final test|mastery test|mock test)\b/i,
  /\b(?:self[- ]assessment|knowledge check|knowledge assessment|skills assessment|graded assessment)\b/i,
  /\b(?:final project|capstone project|capstone|graded assignment|course project)\b/i,
  // Standalone "exam", "examination", "assessment", or "assignment"
  /\b(?:exam|exams|examination|examinations|assessment|assessments|assignment|assignments)\b/i,
  // Standalone "test" only if NOT followed by "ing", "-driven", "suite", "case", or preceded by "unit", "software", "integration"
  /(?<!\b(?:unit|software|integration|automated|e2e|system)\s+)\btest\b(?!\s*[-–—]?(?:driven|ing|suite|case|code|framework|automation))/i
];

// Review / synthesis patterns
const REVIEW_PATTERNS = [
  /\b(?:final review|course review|knowledge synthesis|wrap[- ]up|summary & next steps|course summary|recap)\b/i
];

/**
 * Classifies a section title into milestone type: 'assessment' | 'review' | 'learning'
 * @param {string} title - Section title string
 * @returns {'assessment' | 'review' | 'learning'}
 */
export function classifySectionType(title) {
  if (!title || typeof title !== 'string') {
    return 'learning';
  }

  const trimmed = title.trim();

  // 1. Check assessment patterns
  for (const pattern of ASSESSMENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'assessment';
    }
  }

  // 2. Check review patterns
  for (const pattern of REVIEW_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'review';
    }
  }

  // 3. Default to standard learning unit
  return 'learning';
}

/**
 * Helper to check if a section is an assessment
 * @param {string} title - Section title string
 * @returns {boolean}
 */
export function isAssessmentSection(title) {
  return classifySectionType(title) === 'assessment';
}
