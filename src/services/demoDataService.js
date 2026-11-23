/**
 * Horizon Demo Presentation Mode Service
 * Provides rich, contest-ready sample data and guided presentation sequences.
 * Guaranteed 100% offline, zero network requests, zero Udemy scraping dependency.
 */

export const DEMO_GUIDED_STEPS = [
  {
    step: 1,
    id: 'step-goal',
    targetSectionId: 'section-goal-overview',
    title: 'Goal & Countdown',
    badge: 'Step 1 of 6',
    description: 'Ambitious, concrete target with a dynamic countdown clock and category HUD.',
    icon: 'mdi-flag-checkered'
  },
  {
    step: 2,
    id: 'step-milestones',
    targetSectionId: 'section-milestones',
    title: 'Milestone Roadmap',
    badge: 'Step 2 of 6',
    description: 'Paced daily curriculum with 3 of 5 milestones accomplished (60% journey completion).',
    icon: 'mdi-map-marker-path'
  },
  {
    step: 3,
    id: 'step-badges',
    targetSectionId: 'section-badges',
    title: 'Achievement Badges',
    badge: 'Step 3 of 6',
    description: 'Gamified nature progression: First Step, Quarter-Way, and Halfway Summit unlocked.',
    icon: 'mdi-trophy-variant'
  },
  {
    step: 4,
    id: 'step-themes',
    targetSectionId: 'section-themes',
    title: '4 Nature Themes',
    badge: 'Step 4 of 6',
    description: 'Handcrafted procedural art palettes: Alpine Peak, Deep Pacific, Golden Horizon, and Minimalist Stone.',
    icon: 'mdi-palette'
  },
  {
    step: 5,
    id: 'step-preview',
    targetSectionId: 'section-mockup-preview',
    title: 'Device Lock-Screen Mockup',
    badge: 'Step 5 of 6',
    description: 'Realistic smartphone frame with Dynamic Island and studio monitor desktop preview.',
    icon: 'mdi-cellphone-link'
  },
  {
    step: 6,
    id: 'step-export',
    targetSectionId: 'section-export-controls',
    title: 'Static PNG Export',
    badge: 'Step 6 of 6',
    description: 'Instant full-resolution 1080x1920 or 1920x1080 static PNG download with zero safe-zone overlap.',
    icon: 'mdi-tray-arrow-down'
  }
];

/**
 * Creates a realistic, middle-stage contest demo goal
 * Demonstrates:
 * - 60% progress (3 of 5 milestones completed)
 * - Future dynamic target date (12 days remaining out of 20)
 * - 3 unlocked badges, 2 locked badges
 * - Full metadata without external scraping
 * @returns {object} Contest demo goal
 */
export function createDemoGoal() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Set target date strictly in the future (12 days from now)
  const targetDaysRemaining = 12;
  const totalDays = 20;
  const targetDate = new Date(now + targetDaysRemaining * dayMs).toISOString();

  // Helper for milestone due dates
  const makeDueDate = (daysOffset) => new Date(now + daysOffset * dayMs).toISOString();

  return {
    id: 'goal-demo-contest-mvp',
    title: 'Master Full-Stack Engineering',
    description: 'Complete LLM Engineering & System Architecture: master APIs, authentication, resilient database caching, and cloud production.',
    category: 'Engineering',
    targetDate,
    totalDays,
    templateId: 'alpine-peak',
    exportPreset: 'MOBILE',
    streakDays: 4,
    courseMetadata: {
      sourceUrl: 'https://www.udemy.com/course/complete-llm-engineering-architecture/',
      sourceType: 'UDEMY',
      title: 'Complete LLM Engineering & System Architecture',
      author: 'Horizon AI Engineering Academy',
      totalSections: 5,
      totalLectures: 42,
      durationHours: 16.5,
      rawSections: [
        'Understand system architecture fundamentals',
        'Learn API design and backend foundations',
        'Build authentication and authorization',
        'Implement database and caching strategies',
        'Complete the final project & cloud deployment'
      ],
      extractedAt: new Date(now - 8 * dayMs).toISOString()
    },
    milestones: [
      {
        id: 'demo-ms-1',
        order: 1,
        title: 'Understand system architecture fundamentals',
        description: 'System design, client-server models, scalability tradeoffs, and modern web topology.',
        targetDay: 4,
        dueDate: makeDueDate(-8),
        status: 'completed',
        completed: true,
        completedAt: new Date(now - 7 * dayMs).toISOString(),
        type: 'milestone'
      },
      {
        id: 'demo-ms-2',
        order: 2,
        title: 'Learn API design and backend foundations',
        description: 'RESTful paradigms, typed schemas, error handling contracts, and proxy security.',
        targetDay: 8,
        dueDate: makeDueDate(-4),
        status: 'completed',
        completed: true,
        completedAt: new Date(now - 3 * dayMs).toISOString(),
        type: 'milestone'
      },
      {
        id: 'demo-ms-3',
        order: 3,
        title: 'Build authentication and authorization',
        description: 'JWT authentication, session security, role-based access control, and token encryption.',
        targetDay: 12,
        dueDate: makeDueDate(-1),
        status: 'completed',
        completed: true,
        completedAt: new Date(now - 1 * dayMs).toISOString(),
        type: 'assessment'
      },
      {
        id: 'demo-ms-4',
        order: 4,
        title: 'Implement database and caching strategies',
        description: 'PostgreSQL indexing, query optimization, Redis cache-aside patterns, and connection pooling.',
        targetDay: 16,
        dueDate: makeDueDate(4),
        status: 'pending',
        completed: false,
        completedAt: null,
        type: 'milestone'
      },
      {
        id: 'demo-ms-5',
        order: 5,
        title: 'Complete the final project & cloud deployment',
        description: 'End-to-end integration test suite, Docker containerization, CI/CD pipeline, and monitoring.',
        targetDay: 20,
        dueDate: makeDueDate(targetDaysRemaining),
        status: 'pending',
        completed: false,
        completedAt: null,
        type: 'assessment'
      }
    ],
    createdAt: new Date(now - 8 * dayMs).toISOString(),
    updatedAt: new Date(now).toISOString()
  };
}

/**
 * Validates that a demo goal structure is intact, has future deadline, and proper milestone distribution
 * @param {object} goal 
 * @returns {{ valid: boolean, error?: string, progressPct: number, completedCount: number, totalMilestones: number }}
 */
export function validateDemoGoal(goal) {
  if (!goal || typeof goal !== 'object') {
    return { valid: false, error: 'Goal is null or invalid object' };
  }
  if (!goal.title || !goal.targetDate || !Array.isArray(goal.milestones)) {
    return { valid: false, error: 'Goal missing essential title, targetDate, or milestones' };
  }

  const targetTime = new Date(goal.targetDate).getTime();
  if (isNaN(targetTime) || targetTime <= Date.now()) {
    return { valid: false, error: 'Target date must be a valid future timestamp' };
  }

  const total = goal.milestones.length;
  if (total === 0) {
    return { valid: false, error: 'Demo goal must contain milestones' };
  }

  const completed = goal.milestones.filter(m => m.completed || m.status === 'completed').length;
  const progressPct = Math.round((completed / total) * 100);

  // Assert realistic middle stage (not 0% and not 100%)
  if (progressPct <= 0 || progressPct >= 100) {
    return { valid: false, error: `Demo goal must be in a realistic middle stage (got ${progressPct}%)` };
  }

  return {
    valid: true,
    progressPct,
    completedCount: completed,
    totalMilestones: total
  };
}
