import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import FloatingDeviceSwitcher from '../../src/components/wallpaper/FloatingDeviceSwitcher.vue';

describe('FloatingDeviceSwitcher Component', () => {
  let mountedApps = [];

  function mountSwitcher(props = {}, onUpdate = () => {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp({
      render() {
        return h(FloatingDeviceSwitcher, {
          ...props,
          'onUpdate:modelValue': onUpdate
        });
      }
    });

    const vm = app.mount(container);
    mountedApps.push({ app, container });

    return {
      el: container.firstElementChild,
      container,
      vm
    };
  }

  afterEach(() => {
    mountedApps.forEach(({ app, container }) => {
      app.unmount();
      container.remove();
    });
    mountedApps = [];
  });

  it('renders mobile and desktop device icon buttons with proper ARIA attributes', () => {
    const { el } = mountSwitcher({ modelValue: 'MOBILE' });

    const buttons = el.querySelectorAll('.device-switcher-btn');
    expect(buttons.length).toBe(2);

    expect(el.getAttribute('role')).toBe('toolbar');
    expect(el.getAttribute('aria-label')).toBe('Device wallpaper switcher');

    // Mobile button is first
    expect(buttons[0].getAttribute('aria-label')).toMatch(/mobile/i);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');

    // Desktop button is second
    expect(buttons[1].getAttribute('aria-label')).toMatch(/desktop/i);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('highlights mobile device button with active class when modelValue is MOBILE', () => {
    const { el } = mountSwitcher({ modelValue: 'MOBILE' });
    const buttons = el.querySelectorAll('.device-switcher-btn');

    expect(buttons[0].classList.contains('is-active')).toBe(true);
    expect(buttons[1].classList.contains('is-active')).toBe(false);
  });

  it('highlights desktop device button with active class when modelValue is DESKTOP', () => {
    const { el } = mountSwitcher({ modelValue: 'DESKTOP' });
    const buttons = el.querySelectorAll('.device-switcher-btn');

    expect(buttons[0].classList.contains('is-active')).toBe(false);
    expect(buttons[1].classList.contains('is-active')).toBe(true);
  });

  it('emits update:modelValue with DESKTOP when desktop button is clicked', async () => {
    let emittedValue = null;
    const { el } = mountSwitcher({ modelValue: 'MOBILE' }, (val) => {
      emittedValue = val;
    });

    const desktopBtn = el.querySelectorAll('.device-switcher-btn')[1];
    desktopBtn.click();
    await nextTick();

    expect(emittedValue).toBe('DESKTOP');
  });

  it('emits update:modelValue with MOBILE when mobile button is clicked', async () => {
    let emittedValue = null;
    const { el } = mountSwitcher({ modelValue: 'DESKTOP' }, (val) => {
      emittedValue = val;
    });

    const mobileBtn = el.querySelectorAll('.device-switcher-btn')[0];
    mobileBtn.click();
    await nextTick();

    expect(emittedValue).toBe('MOBILE');
  });

  it('toggles collapse and slide state via tuck button', async () => {
    const { el } = mountSwitcher({ modelValue: 'MOBILE' });

    expect(el.classList.contains('is-collapsed')).toBe(false);

    const tuckBtn = el.querySelector('.switcher-tuck-btn');
    if (tuckBtn) {
      tuckBtn.click();
      await nextTick();
      expect(el.classList.contains('is-collapsed')).toBe(true);

      const edgeTab = el.querySelector('.switcher-edge-tab');
      expect(edgeTab).not.toBeNull();

      edgeTab.click();
      await nextTick();
      expect(el.classList.contains('is-collapsed')).toBe(false);
    }
  });
});
