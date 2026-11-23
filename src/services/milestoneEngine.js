/**
 * Horizon Milestone Planning & Pacing Engine
 * Pure functional algorithm that distributes course sections across available learning days.
 * Produces structured, chronological milestones with stable IDs, assessment detection,
 * review buffer allocation, and completion state preservation.
 */

import { classifySectionType } from './assessmentDetector.js';

/**
 * Calculates remaining calendar days between now and the target deadline
 * @param {string|Date} targetDate - ISO string or Date object
 * @param {number} [fallbackDays=15] - Fallback duration if targetDate is invalid
 * @returns {number} Days remaining
 */
export function calculateDaysRemaining(targetDate, fallbackDays = 15) {
  if (!targetDate) return fallbackDays;
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? fallbackDays : diffDays;
  } catch {
    return fallbackDays;
  }
}

/**
 * Generates an ISO due date string given a base date and day offset
 * @param {Date} baseDate - Starting reference date
 * @param {number} dayOffset - Number of days from reference
 * @returns {string} ISO 8601 date string
 */
export function computeDueDate(baseDate, dayOffset) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

/**
 * Generates a balanced, chronological milestone plan based on goal deadline and sections
 * @param {object} goal - The Goal data model
 * @param {Date} [referenceDate] - Optional start date for testing/reproducibility
 * @returns {Array<object>} Array of structured Milestone records
 */
export function generateMilestonePlan(goal, referenceDate = new Date()) {
  if (!goal || typeof goal !== 'object') {
    return [];
  }

  const rawSections = goal.courseMetadata?.rawSections || [];
  const existingMilestones = goal.milestones || [];

  // Build lookup maps to preserve existing completion status
  const completedByTitle = new Map();
  const completedByOrder = new Map();

  for (const m of existingMilestones) {
    if (m.status === 'completed' || m.completed === true) {
      completedByTitle.set(m.title.toLowerCase().trim(), m.completedAt || new Date().toISOString());
      completedByOrder.set(m.order, m.completedAt || new Date().toISOString());
    }
  }

  // Determine available timeline: respect targetDate if present, otherwise use goal.totalDays
  let effectiveDays;
  if (goal.targetDate) {
    const daysDiff = calculateDaysRemaining(goal.targetDate, goal.totalDays || 15);
    effectiveDays = (daysDiff > 0) ? daysDiff : (goal.totalDays && goal.totalDays > 0 ? goal.totalDays : 1);
  } else {
    effectiveDays = (goal.totalDays && goal.totalDays > 0) ? goal.totalDays : 15;
  }
  effectiveDays = Math.max(1, effectiveDays);

  // Review buffer: if duration > 10 days, allocate 1-2 buffer days at the end for final synthesis
  const bufferDays = (effectiveDays > 10) ? Math.max(1, Math.min(3, Math.floor(effectiveDays * 0.12))) : 0;
  const learningDays = Math.max(1, effectiveDays - bufferDays);

  const milestones = [];
  const N = rawSections.length;

  // Case 0: No raw sections provided (fallback to single overall goal milestone)
  if (N === 0) {
    const singleTitle = goal.title || 'Complete Learning Objective';
    const isCompleted = completedByTitle.has(singleTitle.toLowerCase().trim()) || completedByOrder.has(1);

    milestones.push({
      id: 'ms-1',
      order: 1,
      title: singleTitle,
      description: goal.description || 'Core study and practice curriculum.',
      targetDay: effectiveDays,
      dueDate: computeDueDate(referenceDate, effectiveDays),
      status: isCompleted ? 'completed' : 'pending',
      completed: isCompleted,
      completedAt: isCompleted ? (completedByOrder.get(1) || new Date().toISOString()) : null,
      type: 'learning',
      isQuiz: false
    });
    return milestones;
  }

  // Case 1: Sections fewer than or equal to learning days (1 section per milestone, spaced out)
  if (N <= learningDays) {
    const dayInterval = learningDays / N;

    rawSections.forEach((sectionItem, idx) => {
      const order = idx + 1;
      const targetDay = Math.min(learningDays, Math.max(1, Math.round(order * dayInterval)));
      
      const title = (typeof sectionItem === 'object' && sectionItem !== null) ? (sectionItem.title || '') : String(sectionItem);
      const videoData = (typeof sectionItem === 'object' && sectionItem !== null && sectionItem.video) ? sectionItem.video : null;

      const detectedType = classifySectionType(title);
      const isQuiz = detectedType === 'assessment';
      const type = videoData ? 'lesson' : detectedType;

      const prevCompletedAt = completedByTitle.get(title.toLowerCase().trim()) || completedByOrder.get(order);
      const isCompleted = Boolean(prevCompletedAt);

      const milestone = {
        id: `ms-${order}`,
        order,
        title,
        description: videoData?.formattedDuration ? `Video Lesson • ${videoData.formattedDuration}` : `Dedicated learning focus for Day ${targetDay}.`,
        targetDay,
        dueDate: computeDueDate(referenceDate, targetDay),
        status: isCompleted ? 'completed' : 'pending',
        completed: isCompleted,
        completedAt: isCompleted ? prevCompletedAt : null,
        type,
        isQuiz
      };

      if (videoData) {
        milestone.video = videoData;
      }

      milestones.push(milestone);
    });
  } else {
    // Case 2: Sections greater than learning days (Bundle sections evenly into learning days)
    const sectionsPerDay = N / learningDays;

    for (let day = 1; day <= learningDays; day++) {
      const startIdx = Math.round((day - 1) * sectionsPerDay);
      const endIdx = Math.round(day * sectionsPerDay);
      const bundled = rawSections.slice(startIdx, endIdx);

      if (bundled.length === 0) continue;

      const order = milestones.length + 1;
      const titles = bundled.map(s => (typeof s === 'object' && s !== null ? (s.title || '') : String(s)));
      const mainTitle = titles.length === 1 ? titles[0] : `${titles[0]} (+${titles.length - 1} more)`;
      const description = titles.length > 1 ? titles.join(' • ') : `Complete ${titles[0]}`;

      const firstVideo = typeof bundled[0] === 'object' && bundled[0]?.video ? bundled[0].video : null;

      // Check if any section in bundle is an assessment
      const hasAssessment = titles.some(s => classifySectionType(s) === 'assessment');
      const type = firstVideo ? 'lesson' : (hasAssessment ? 'assessment' : 'learning');

      const prevCompletedAt = completedByTitle.get(mainTitle.toLowerCase().trim()) || completedByOrder.get(order);
      const isCompleted = Boolean(prevCompletedAt);

      const milestone = {
        id: `ms-${order}`,
        order,
        title: mainTitle,
        description,
        targetDay: day,
        dueDate: computeDueDate(referenceDate, day),
        status: isCompleted ? 'completed' : 'pending',
        completed: isCompleted,
        completedAt: isCompleted ? prevCompletedAt : null,
        type,
        isQuiz: hasAssessment
      };

      if (firstVideo) {
        milestone.video = firstVideo;
      }

      milestones.push(milestone);
    }
  }

  // Insert Final Review & Synthesis Milestone if buffer days exist
  if (bufferDays > 0) {
    const finalOrder = milestones.length + 1;
    const reviewTitle = 'Final Review & Knowledge Synthesis';
    const prevCompletedAt = completedByTitle.get(reviewTitle.toLowerCase()) || completedByOrder.get(finalOrder);
    const isCompleted = Boolean(prevCompletedAt);

    milestones.push({
      id: `ms-${finalOrder}`,
      order: finalOrder,
      title: reviewTitle,
      description: 'Comprehensive curriculum recap, practice review, and final knowledge consolidation.',
      targetDay: effectiveDays,
      dueDate: computeDueDate(referenceDate, effectiveDays),
      status: isCompleted ? 'completed' : 'pending',
      completed: isCompleted,
      completedAt: isCompleted ? prevCompletedAt : null,
      type: 'review',
      isQuiz: false
    });
  }

  return milestones;
}

/**
 * Calculates overall completion percentage
 * @param {Array<object>} milestones - List of milestones
 * @returns {number} Integer percentage between 0 and 100
 */
export function calculateProgress(milestones) {
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return 0;
  }
  const completedCount = milestones.filter(m => m.status === 'completed' || m.completed === true).length;
  return Math.round((completedCount / milestones.length) * 100);
}

/**
 * Toggles a milestone completion state and stamps completion time
 * @param {Array<object>} milestones - Milestone list
 * @param {string} milestoneId - ID of milestone to toggle
 * @returns {Array<object>} New milestone array with updated state
 */
export function toggleMilestoneState(milestones, milestoneId) {
  if (!Array.isArray(milestones)) return [];

  return milestones.map(m => {
    if (m.id === milestoneId) {
      const willBeCompleted = m.status !== 'completed' && !m.completed;
      return {
        ...m,
        status: willBeCompleted ? 'completed' : 'pending',
        completed: willBeCompleted,
        completedAt: willBeCompleted ? new Date().toISOString() : null
      };
    }
    return m;
  });
}
