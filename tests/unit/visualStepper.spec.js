import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import VisualStepper from '../../src/components/layout/VisualStepper.vue';

describe('VisualStepper Component', () => {
  let mountedApps = [];

  function mountStepper(props = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp({
      render() {
        return h(VisualStepper, props);
      }
    });

    app.mount(container);
    mountedApps.push({ app, container });

    return {
      el: container.firstElementChild,
      container
    };
  }

  afterEach(() => {
    mountedApps.forEach(({ app, container }) => {
      app.unmount();
      container.remove();
    });
    mountedApps = [];
  });

  it('renders all 4 default steps with correct numbers, titles, and captions', () => {
    const { el } = mountStepper();

    const steps = el.querySelectorAll('.stepper-step');
    expect(steps.length).toBe(4);

    const expectedTitles = ['Curriculum', 'Paced Plan', 'Badges', 'Wallpaper'];
    steps.forEach((step, idx) => {
      const circleNumber = step.querySelector('.stepper-circle-number').textContent.trim();
      expect(circleNumber).toBe(String(idx + 1));

      const title = step.querySelector('.stepper-title').textContent.trim();
      expect(title).toBe(expectedTitles[idx]);

      const caption = step.querySelector('.stepper-caption');
      expect(caption).not.toBeNull();
    });
  });

  it('correctly applies active, completed, and upcoming classes when activeStep is 1', () => {
    const { el } = mountStepper({ activeStep: 1 });

    const steps = el.querySelectorAll('.stepper-step');
    // Step 1: active
    expect(steps[0].classList.contains('is-active')).toBe(true);
    expect(steps[0].querySelector('.stepper-circle--active')).not.toBeNull();
    expect(steps[0].querySelector('.stepper-circle').getAttribute('aria-current')).toBe('step');

    // Steps 2-4: upcoming
    expect(steps[1].classList.contains('is-upcoming')).toBe(true);
    expect(steps[1].querySelector('.stepper-circle--upcoming')).not.toBeNull();

    expect(steps[2].classList.contains('is-upcoming')).toBe(true);
    expect(steps[3].classList.contains('is-upcoming')).toBe(true);
  });

  it('correctly applies active, completed, and upcoming classes when activeStep is 3', () => {
    const { el } = mountStepper({ activeStep: 3 });

    const steps = el.querySelectorAll('.stepper-step');
    // Step 1: completed
    expect(steps[0].classList.contains('is-completed')).toBe(true);
    expect(steps[0].querySelector('.stepper-circle--completed')).not.toBeNull();

    // Step 2: completed
    expect(steps[1].classList.contains('is-completed')).toBe(true);
    expect(steps[1].querySelector('.stepper-circle--completed')).not.toBeNull();

    // Step 3: active
    expect(steps[2].classList.contains('is-active')).toBe(true);
    expect(steps[2].querySelector('.stepper-circle--active')).not.toBeNull();
    expect(steps[2].querySelector('.stepper-circle').getAttribute('aria-current')).toBe('step');

    // Step 4: upcoming
    expect(steps[3].classList.contains('is-upcoming')).toBe(true);
    expect(steps[3].querySelector('.stepper-circle--upcoming')).not.toBeNull();
  });

  it('hides outer connector lines on the first and last steps', () => {
    const { el } = mountStepper();

    const steps = el.querySelectorAll('.stepper-step');
    // First step has start line hidden
    expect(steps[0].querySelector('.stepper-line-start').classList.contains('is-hidden')).toBe(true);
    // Last step has end line hidden
    expect(steps[3].querySelector('.stepper-line-end').classList.contains('is-hidden')).toBe(true);

    // Middle steps have both lines visible
    expect(steps[1].querySelector('.stepper-line-start').classList.contains('is-hidden')).toBe(false);
    expect(steps[1].querySelector('.stepper-line-end').classList.contains('is-hidden')).toBe(false);
  });

  it('fills connecting lines correctly up to the active step', () => {
    const { el } = mountStepper({ activeStep: 2 });

    const steps = el.querySelectorAll('.stepper-step');
    // Step 1 end line leads to step 2 -> should be filled
    expect(steps[0].querySelector('.stepper-line-end').classList.contains('stepper-line--filled')).toBe(true);

    // Step 2 start line comes from step 1 -> should be filled
    expect(steps[1].querySelector('.stepper-line-start').classList.contains('stepper-line--filled')).toBe(true);

    // Step 2 end line leads to step 3 (upcoming) -> should NOT be filled
    expect(steps[1].querySelector('.stepper-line-end').classList.contains('stepper-line--filled')).toBe(false);
  });

  it('is completely non-interactive with no clickable elements', () => {
    const { el } = mountStepper();

    expect(el.classList.contains('visual-stepper-container')).toBe(true);
    expect(el.getAttribute('role')).toBe('region');

    // Strictly non-actionable: no buttons, anchors, or inputs
    expect(el.querySelectorAll('button').length).toBe(0);
    expect(el.querySelectorAll('a').length).toBe(0);
    expect(el.querySelectorAll('input').length).toBe(0);
  });

  it('renders custom steps when provided via props', () => {
    const customSteps = [
      { number: 1, title: 'Concept', caption: 'Initial phase' },
      { number: 2, title: 'Execution', caption: 'Building phase' }
    ];

    const { el } = mountStepper({ steps: customSteps, activeStep: 2 });

    const steps = el.querySelectorAll('.stepper-step');
    expect(steps.length).toBe(2);
    expect(steps[0].querySelector('.stepper-title').textContent.trim()).toBe('Concept');
    expect(steps[1].querySelector('.stepper-title').textContent.trim()).toBe('Execution');
    expect(steps[1].classList.contains('is-active')).toBe(true);
  });
});
