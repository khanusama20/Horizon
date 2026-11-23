/**
 * Horizon Achievement Badge & Motivation Engine
 * Pure functional state machine calculating nature-inspired badges and contextual quotes
 * based on authentic milestone completion.
 */

import { calculateProgress } from './milestoneEngine.js';

export const BADGE_DEFINITIONS = [
  {
    key: 'FIRST_STEP',
    name: 'First Step',
    natureSymbol: 'Seedling Sprout',
    icon: 'mdi-sprout',
    color: '#10B981', // Emerald
    thresholdPct: null, // Unlocks when completedCount >= 1
    description: 'Conquered your very first milestone.'
  },
  {
    key: 'QUARTER_WAY',
    name: 'Quarter Way',
    natureSymbol: 'Forest Compass',
    icon: 'mdi-compass-outline',
    color: '#06B6D4', // Cyan
    thresholdPct: 25,
    description: 'Reached 25% of your learning journey.'
  },
  {
    key: 'HALFWAY',
    name: 'Halfway Hero',
    natureSymbol: 'Mountain Ridge',
    icon: 'mdi-image-filter-hdr',
    color: '#3B82F6', // Blue
    thresholdPct: 50,
    description: 'Reached 50% halfway summit mark.'
  },
  {
    key: 'ALMOST_THERE',
    name: 'Almost There',
    natureSymbol: 'Flowing River',
    icon: 'mdi-waves',
    color: '#8B5CF6', // Purple
    thresholdPct: 75,
    description: '75% completed! The final stretch is in sight.'
  },
  {
    key: 'ACHIEVER',
    name: 'Goal Achiever',
    natureSymbol: 'Summit Sun',
    icon: 'mdi-weather-sunset-up',
    color: '#F59E0B', // Amber
    thresholdPct: 100,
    description: '100% completion of all milestones. Mastery unlocked!'
  }
];

/**
 * Pure function evaluating badge unlock status from current milestones
 * @param {Array<object>} milestones - Current list of milestones
 * @returns {Array<object>} Array of 5 evaluated Badge objects with unlocked state
 */
export function evaluateBadges(milestones) {
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return BADGE_DEFINITIONS.map(badge => ({
      ...badge,
      unlocked: false,
      unlockedAt: null
    }));
  }

  const total = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed' || m.completed === true);
  const completedCount = completedMilestones.length;
  const progressPct = calculateProgress(milestones);

  // Find earliest completion timestamp for first step
  const firstCompleted = completedMilestones.sort((a, b) => {
    return new Date(a.completedAt || 0) - new Date(b.completedAt || 0);
  })[0];

  return BADGE_DEFINITIONS.map(badge => {
    let unlocked = false;
    let unlockedAt = null;

    if (badge.key === 'FIRST_STEP') {
      unlocked = completedCount >= 1;
      unlockedAt = unlocked ? (firstCompleted?.completedAt || new Date().toISOString()) : null;
    } else if (badge.key === 'ACHIEVER') {
      unlocked = completedCount === total && total > 0;
      unlockedAt = unlocked ? (completedMilestones[completedMilestones.length - 1]?.completedAt || new Date().toISOString()) : null;
    } else if (badge.thresholdPct !== null) {
      unlocked = progressPct >= badge.thresholdPct;
      unlockedAt = unlocked ? new Date().toISOString() : null;
    }

    return {
      ...badge,
      unlocked,
      unlockedAt
    };
  });
}

/**
 * Generates deterministic, progress-synchronized motivational quote
 * @param {number} progressPct - Current integer progress percentage
 * @returns {{ quote: string, stage: string }}
 */
export function getMotivationalQuote(progressPct) {
  const pct = Math.max(0, Math.min(100, Number(progressPct) || 0));

  if (pct === 0) {
    return {
      quote: 'The journey of a thousand miles begins with a single step. Let’s begin.',
      stage: 'Starting Out'
    };
  } else if (pct < 25) {
    return {
      quote: 'First milestone conquered! Momentum is building with every lesson.',
      stage: 'Building Momentum'
    };
  } else if (pct < 50) {
    return {
      quote: 'A quarter of the mountain climbed. Consistency is your superpower.',
      stage: 'Steady Ascent'
    };
  } else if (pct < 75) {
    return {
      quote: 'Halfway there! The summit is in sight. Stay relentless.',
      stage: 'Midpoint Mastery'
    };
  } else if (pct < 100) {
    return {
      quote: 'Final stretch! Just a few milestones stand between you and mastery.',
      stage: 'Final Approach'
    };
  } else {
    return {
      quote: 'Goal Achieved! You conquered the horizon. Take a moment to celebrate.',
      stage: 'Summit Reached'
    };
  }
}
