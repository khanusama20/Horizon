import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import {
  useTourGuide,
  initTourState,
  TOUR_STORAGE_KEY,
  TOUR_STATES
} from '../../src/composables/useTourGuide.js';
import { TOUR_STEPS } from '../../src/services/tourSteps.js';
import TourInvitationBanner from '../../src/components/tour/TourInvitationBanner.vue';
import TourTooltip from '../../src/components/tour/TourTooltip.vue';
import TourOverlay from '../../src/components/tour/TourOverlay.vue';
import TourGuide from '../../src/components/tour/TourGuide.vue';
import fs from 'node:fs';
import path from 'node:path';

describe('Interactive Guided Tour Guide (Horizon MVP)', () => {
  let mountedApps = [];

  function mountComponent(Component, props = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp({
      render() {
        return h(Component, props);
      }
    });

    app.mount(container);
    mountedApps.push({ app, container });

    return {
      el: container.firstElementChild,
      container,
      app
    };
  }

  beforeEach(() => {
    localStorage.clear();
    const { resetTour } = useTourGuide();
    resetTour();
  });

  afterEach(() => {
    mountedApps.forEach(({ app, container }) => {
      app.unmount();
      container.remove();
    });
    mountedApps = [];
    localStorage.clear();
  });

  // =========================================================================
  // 1. TOUR STEPS SPECIFICATION
  // =========================================================================
  describe('Tour Steps Curriculum & Workflow Definitions', () => {
    it('TG-01: defines exactly 8 sequential steps covering the end-to-end Horizon workflow', () => {
      expect(TOUR_STEPS).toHaveLength(8);

      const stepIds = TOUR_STEPS.map(s => s.id);
      expect(stepIds).toEqual([
        'welcome',
        'goal-creation',
        'source-selection',
        'milestones-roadmap',
        'achievement-badges',
        'wallpaper-themes',
        'mobile-preview',
        'export-controls'
      ]);
    });

    it('TG-02: each step has complete descriptive metadata and target selectors', () => {
      TOUR_STEPS.forEach(step => {
        expect(step.id).toBeDefined();
        expect(step.title).toBeTruthy();
        expect(step.subtitle).toBeTruthy();
        expect(step.category).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.targetSelector).toMatch(/^#/);
        expect(step.placement).toBeDefined();
      });
    });

    it('TG-03: target selectors correspond to real UI sections', () => {
      const selectors = TOUR_STEPS.map(s => s.targetSelector);
      expect(selectors).toContain('#section-intro-banner');
      expect(selectors).toContain('#section-goal-overview');
      expect(selectors).toContain('#section-source-selection');
      expect(selectors).toContain('#section-milestones');
      expect(selectors).toContain('#section-badges');
      expect(selectors).toContain('#section-themes');
      expect(selectors).toContain('#section-mockup-preview');
      expect(selectors).toContain('#section-export-controls');
    });
  });

  // =========================================================================
  // 2. STATE MACHINE & COMPOSABLE (useTourGuide)
  // =========================================================================
  describe('Tour State Machine & LocalStorage Persistence', () => {
    it('TG-04: defaults to invitation_pending on initial visit with no storage', () => {
      const { showInvitation, isTourActive, currentStepIndex } = useTourGuide();

      expect(showInvitation.value).toBe(true);
      expect(isTourActive.value).toBe(false);
      expect(currentStepIndex.value).toBe(0);
    });

    it('TG-05: startTour() transitions to tour_in_progress and persists to LocalStorage', () => {
      const { startTour, isTourActive, showInvitation } = useTourGuide();

      startTour();

      expect(isTourActive.value).toBe(true);
      expect(showInvitation.value).toBe(false);
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe(TOUR_STATES.TOUR_IN_PROGRESS);
    });

    it('TG-06: dismissInvitation() transitions to invitation_dismissed and persists', () => {
      const { dismissInvitation, showInvitation, isTourActive } = useTourGuide();

      dismissInvitation();

      expect(showInvitation.value).toBe(false);
      expect(isTourActive.value).toBe(false);
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe(TOUR_STATES.INVITATION_DISMISSED);
    });

    it('TG-07: sequential step navigation advances and recalculates progressPct', () => {
      const { startTour, nextStep, prevStep, currentStepIndex, currentStep, progressPct, isFirstStep, isLastStep } = useTourGuide();

      startTour();
      expect(currentStepIndex.value).toBe(0);
      expect(isFirstStep.value).toBe(true);
      expect(isLastStep.value).toBe(false);
      expect(progressPct.value).toBe(13); // 1/8 = 12.5% -> 13%

      // Next step
      nextStep();
      expect(currentStepIndex.value).toBe(1);
      expect(currentStep.value.id).toBe('goal-creation');
      expect(isFirstStep.value).toBe(false);
      expect(progressPct.value).toBe(25); // 2/8 = 25%

      // Previous step
      prevStep();
      expect(currentStepIndex.value).toBe(0);
      expect(currentStep.value.id).toBe('welcome');
      expect(isFirstStep.value).toBe(true);

      // Prev on first step stays at 0
      prevStep();
      expect(currentStepIndex.value).toBe(0);
    });

    it('TG-08: calling nextStep() on the final step finishes the tour', () => {
      const { startTour, nextStep, isTourActive, showInvitation } = useTourGuide();

      startTour();
      // Advance to the end
      for (let i = 0; i < TOUR_STEPS.length - 1; i++) {
        nextStep();
      }
      expect(useTourGuide().isLastStep.value).toBe(true);

      // Advance from last step -> finishes tour
      nextStep();
      expect(isTourActive.value).toBe(false);
      expect(showInvitation.value).toBe(false);
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe(TOUR_STATES.TOUR_COMPLETED);
    });

    it('TG-09: skipTour() prematurely finishes and saves tour_completed', () => {
      const { startTour, skipTour, isTourActive } = useTourGuide();

      startTour();
      expect(isTourActive.value).toBe(true);

      skipTour();
      expect(isTourActive.value).toBe(false);
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe(TOUR_STATES.TOUR_COMPLETED);
    });

    it('TG-10: restartTour() resets step to 0 and activates tour', () => {
      const { startTour, nextStep, restartTour, currentStepIndex, isTourActive } = useTourGuide();

      startTour();
      nextStep();
      nextStep();
      expect(currentStepIndex.value).toBe(2);

      restartTour();
      expect(currentStepIndex.value).toBe(0);
      expect(isTourActive.value).toBe(true);
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe(TOUR_STATES.TOUR_IN_PROGRESS);
    });

    it('TG-11: safely handles corrupted or unrecognised LocalStorage values', () => {
      localStorage.setItem(TOUR_STORAGE_KEY, 'corrupted_random_string_12345');
      const { showInvitation, isTourActive } = useTourGuide();

      expect(showInvitation.value).toBe(true);
      expect(isTourActive.value).toBe(false);
    });

    it('TG-12: recovers gracefully if left mid-tour across browser reloads without startling user', () => {
      localStorage.setItem(TOUR_STORAGE_KEY, TOUR_STATES.TOUR_IN_PROGRESS);
      const { showInvitation, isTourActive } = useTourGuide();

      // Should default back to non-intrusive banner so an overlay doesn't block the screen unexpectedly
      expect(showInvitation.value).toBe(true);
      expect(isTourActive.value).toBe(false);
    });
  });

  // =========================================================================
  // 3. INVITATION BANNER COMPONENT
  // =========================================================================
  describe('TourInvitationBanner Component', () => {
    it('TG-13: renders banner with clear heading and value proposition', async () => {
      const { el } = mountComponent(TourInvitationBanner);
      await nextTick();

      expect(el).not.toBeNull();
      expect(el.textContent).toContain('New to Horizon?');
      expect(el.textContent).toContain('Optional 2-Min Tour');
      expect(el.textContent).toContain('Start Tour');
      expect(el.textContent).toContain("I'll Explore Myself");
    });

    it('TG-14: clicking Start Tour initiates the tour and hides banner', async () => {
      const { el } = mountComponent(TourInvitationBanner);
      await nextTick();

      const startBtn = el.querySelector('.tour-primary-btn');
      expect(startBtn).not.toBeNull();
      startBtn.click();
      await nextTick();

      const { isTourActive, showInvitation } = useTourGuide();
      expect(isTourActive.value).toBe(true);
      expect(showInvitation.value).toBe(false);
    });

    it('TG-15: clicking I\'ll Explore Myself dismisses the banner permanently', async () => {
      const { el } = mountComponent(TourInvitationBanner);
      await nextTick();

      const dismissBtn = el.querySelector('.tour-secondary-btn');
      expect(dismissBtn).not.toBeNull();
      dismissBtn.click();
      await nextTick();

      const { showInvitation, isTourActive } = useTourGuide();
      expect(showInvitation.value).toBe(false);
      expect(isTourActive.value).toBe(false);
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe(TOUR_STATES.INVITATION_DISMISSED);
    });
  });

  // =========================================================================
  // 4. FLOATING TOOLTIP COMPONENT
  // =========================================================================
  describe('TourTooltip Component', () => {
    it('TG-16: renders step content, tags, and progress bar correctly', async () => {
      const step = TOUR_STEPS[0];
      const { el } = mountComponent(TourTooltip, {
        step,
        stepIndex: 0,
        totalSteps: 8,
        progressPct: 13,
        targetRect: { x: 100, y: 150, width: 400, height: 200 },
        isFirstStep: true,
        isLastStep: false
      });
      await nextTick();

      expect(el.textContent).toContain('Overview');
      expect(el.textContent).toContain('Step 1 of 8');
      expect(el.textContent).toContain('Welcome to Horizon');
      expect(el.textContent).toContain('Next Step');
      // Previous button hidden on first step
      expect(el.querySelector('.tour-nav-prev-btn')).toBeNull();
    });

    it('TG-17: displays Previous button and Finish Tour label on the final step', async () => {
      const step = TOUR_STEPS[7];
      const { el } = mountComponent(TourTooltip, {
        step,
        stepIndex: 7,
        totalSteps: 8,
        progressPct: 100,
        targetRect: { x: 100, y: 150, width: 400, height: 200 },
        isFirstStep: false,
        isLastStep: true
      });
      await nextTick();

      expect(el.textContent).toContain('Step 8 of 8');
      expect(el.textContent).toContain('Finish Tour');
      expect(el.querySelector('.tour-nav-prev-btn')).not.toBeNull();
    });

    it('TG-18: emits next, prev, skip, and finish events on button clicks', async () => {
      let emittedEvents = [];

      const container = document.createElement('div');
      document.body.appendChild(container);

      const app = createApp({
        render() {
          return h(TourTooltip, {
            step: TOUR_STEPS[2],
            stepIndex: 2,
            totalSteps: 8,
            progressPct: 38,
            targetRect: null,
            isFirstStep: false,
            isLastStep: false,
            onNext: () => emittedEvents.push('next'),
            onPrev: () => emittedEvents.push('prev'),
            onSkip: () => emittedEvents.push('skip'),
            onFinish: () => emittedEvents.push('finish')
          });
        }
      });

      app.mount(container);
      mountedApps.push({ app, container });
      await nextTick();

      const el = container.firstElementChild;
      el.querySelector('.tour-nav-next-btn').click();
      el.querySelector('.tour-nav-prev-btn').click();
      el.querySelector('.tour-skip-btn').click();
      el.querySelector('.tour-close-x-btn').click();

      expect(emittedEvents).toEqual(['next', 'prev', 'skip', 'skip']);
    });
  });

  // =========================================================================
  // 5. OVERLAY SPOTLIGHT COMPONENT
  // =========================================================================
  describe('TourOverlay Component', () => {
    it('TG-19: renders SVG spotlight cutout and pulse ring when target element exists', async () => {
      // Create a dummy DOM target
      const target = document.createElement('div');
      target.id = 'test-spotlight-target';
      target.style.width = '300px';
      target.style.height = '100px';
      document.body.appendChild(target);

      let foundRect = null;
      const { el } = mountComponent(TourOverlay, {
        targetSelector: '#test-spotlight-target',
        onTargetFound: (r) => { foundRect = r; }
      });

      await nextTick();
      // Allow watch/resize callbacks to run
      await new Promise(r => setTimeout(r, 60));

      expect(el.querySelector('.tour-svg-mask')).not.toBeNull();
      target.remove();
    });

    it('TG-20: gracefully handles missing target selector without error', async () => {
      let missingFired = false;
      const { el } = mountComponent(TourOverlay, {
        targetSelector: '#non-existent-element-xyz',
        onTargetMissing: () => { missingFired = true; }
      });

      await nextTick();
      await new Promise(r => setTimeout(r, 60));

      // Should render without throwing
      expect(el).not.toBeNull();
      expect(missingFired).toBe(true);
    });
  });

  // =========================================================================
  // 6. KEYBOARD NAVIGATION & APPHEADER INTEGRATION
  // =========================================================================
  describe('Keyboard Controls & Toolbar Re-launch', () => {
    it('TG-21: keyboard Escape skips the active tour', async () => {
      const { startTour, isTourActive } = useTourGuide();
      startTour();

      mountComponent(TourGuide);
      await nextTick();

      expect(isTourActive.value).toBe(true);

      // Trigger Escape key event
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await nextTick();

      expect(isTourActive.value).toBe(false);
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe(TOUR_STATES.TOUR_COMPLETED);
    });

    it('TG-22: keyboard ArrowRight and ArrowLeft step forward and backward', async () => {
      const { startTour, currentStepIndex } = useTourGuide();
      startTour();

      mountComponent(TourGuide);
      await nextTick();

      expect(currentStepIndex.value).toBe(0);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await nextTick();
      expect(currentStepIndex.value).toBe(1);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await nextTick();
      expect(currentStepIndex.value).toBe(0);
    });

    it('TG-23: AppHeader template contains Tour Guide launcher button that emits start-tour', () => {
      const appHeaderPath = path.resolve(process.cwd(), 'src/components/layout/AppHeader.vue');
      const content = fs.readFileSync(appHeaderPath, 'utf-8');

      expect(content).toContain('Take Guided Tour');
      expect(content).toContain('mdi-compass-outline');
      expect(content).toContain("$emit('start-tour')");
      expect(content).toContain("'start-tour'");
    });
  });
});
