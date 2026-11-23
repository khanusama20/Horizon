/**
 * Horizon Interactive Tour Guide — Step Definitions
 * Defines the complete 8-step sequence explaining Horizon's core workflow:
 * Goal creation -> Source ingestion (Udemy/YouTube/Manual) -> Milestones -> Badges -> Theme & Custom Photo -> Preview -> Export
 */

export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Horizon',
    subtitle: 'Goal-to-Wallpaper Learning Countdown',
    category: 'Overview',
    description: 'Horizon turns your learning goals into measurable milestones and personalized achievement wallpapers. Stay motivated every time you glance at your phone or desktop.',
    targetSelector: '#section-intro-banner',
    fallbackSelector: '.dashboard-content-wrapper',
    placement: 'bottom'
  },
  {
    id: 'goal-creation',
    title: 'Create Your Goal',
    subtitle: 'Define Objective & Timeline',
    category: 'Goal Setup',
    description: 'Start by naming what you want to achieve. Set your category, learning duration, and target deadline. Horizon will automatically calculate days remaining and pace your progress.',
    targetSelector: '#section-goal-overview',
    placement: 'bottom'
  },
  {
    id: 'source-selection',
    title: 'Choose Your Learning Source',
    subtitle: 'Udemy, YouTube, or Manual Syllabus',
    category: 'Ingestion',
    description: 'Select how you want to ingest your curriculum: import from Udemy courses, load playlists directly using the official YouTube Data API v3, or write your own custom syllabus.',
    targetSelector: '#section-source-selection',
    placement: 'bottom'
  },
  {
    id: 'milestones-roadmap',
    title: 'Milestone Roadmap & Checklist',
    subtitle: 'Paced Chronological Milestones',
    category: 'Milestones',
    description: 'Horizon automatically balances course modules across your available learning days. Check off milestones as you study to update your countdown progress in real time.',
    targetSelector: '#section-milestones',
    placement: 'top'
  },
  {
    id: 'achievement-badges',
    title: 'Gamified Achievement Badges',
    subtitle: '5 Progressive Nature Tiers',
    category: 'Achievements',
    description: 'Celebrate your dedication! Earn authentic badges as you complete milestones: First Step (seedling), Quarter Way (25%), Halfway Hero (50%), Almost There (75%), and Goal Achiever (100% summit mastery).',
    targetSelector: '#section-badges',
    placement: 'top'
  },
  {
    id: 'wallpaper-themes',
    title: 'Wallpaper Aesthetics & Themes',
    subtitle: 'Procedural Art, Colors & Custom Photos',
    category: 'Aesthetics',
    description: 'Personalize your wallpaper backdrop: choose from 4 procedural nature themes (Alpine Peak, Deep Pacific, etc.), 8 curated minimalist colors, or upload your own temporary custom photo with cover-crop and dark contrast scrim.',
    targetSelector: '#section-themes',
    placement: 'top'
  },
  {
    id: 'mobile-preview',
    title: 'Realistic Mobile Lock Screen Preview',
    subtitle: '1080 × 1920 Mockup Studio',
    category: 'Preview',
    description: 'Preview your generated countdown lock screen inside a realistic smartphone mockup with OS clock safe zones (0-28%), circular progress ring, countdown callout, and milestone tracker.',
    targetSelector: '#section-mockup-preview',
    placement: 'top'
  },
  {
    id: 'export-controls',
    title: 'Wallpaper Export & Download',
    subtitle: 'Crystal Clear PNG Downloads',
    category: 'Export',
    description: 'Export your completed wallpaper in full 1080×1920 mobile or 1920×1080 desktop resolution. Set it as your phone or desktop lock screen to keep your goals front and center every day!',
    targetSelector: '#section-export-controls',
    placement: 'top'
  }
];
