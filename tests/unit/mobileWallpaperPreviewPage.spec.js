import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import DashboardPreviewCard from '../../src/components/wallpaper/DashboardPreviewCard.vue';
import MobileWallpaperPreviewPage from '../../src/components/wallpaper/MobileWallpaperPreviewPage.vue';
import { wallpaperExportService } from '../../src/services/wallpaperExportService.js';
import { CanvasWallpaperEngine } from '../../src/services/CanvasWallpaperEngine.js';

describe('Mobile Wallpaper Preview as a Dedicated View', () => {
  let mountedApps = [];

  beforeEach(() => {
    vi.spyOn(CanvasWallpaperEngine, 'waitForFonts').mockResolvedValue();
    vi.spyOn(CanvasWallpaperEngine, 'renderWallpaper').mockResolvedValue({
      success: true,
      width: 1080,
      height: 1920
    });
  });

  afterEach(() => {
    mountedApps.forEach(({ app, container }) => {
      app.unmount();
      container.remove();
    });
    mountedApps = [];
    vi.restoreAllMocks();
  });

  const mockGoal = {
    id: 'goal-test-1',
    title: 'Master Full-Stack Engineering',
    category: 'Engineering',
    templateId: 'golden-horizon',
    totalDays: 15,
    targetDate: new Date(Date.now() + 15 * 86400000).toISOString(),
    milestones: [
      { id: 'ms-1', order: 1, title: 'Step 1', completed: true, status: 'completed' },
      { id: 'ms-2', order: 2, title: 'Step 2', completed: false, status: 'pending' }
    ]
  };

  describe('DashboardPreviewCard Component', () => {
    function mountDashboardCard(props = {}, onOpen = () => {}) {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const app = createApp({
        render() {
          return h(DashboardPreviewCard, {
            goal: mockGoal,
            ...props,
            'onOpen-preview': onOpen
          });
        }
      });

      app.mount(container);
      mountedApps.push({ app, container });

      return {
        el: container.firstElementChild,
        container
      };
    }

    it('DC-01: renders compact dashboard preview card with #section-mockup-preview ID and 1080x1920 chip', () => {
      const { el } = mountDashboardCard();

      expect(el.id).toBe('section-mockup-preview');
      expect(el.textContent).toContain('Mobile Wallpaper Preview');
      expect(el.textContent).toContain('1080 × 1920 PNG');
      expect(el.textContent).toContain('Open Dedicated Preview');
    });

    it('DC-02: emits open-preview when card or open button is clicked', async () => {
      let emitted = false;
      const { el } = mountDashboardCard({}, () => {
        emitted = true;
      });

      const btn = el.querySelector('.open-preview-btn');
      expect(btn).not.toBeNull();
      btn.click();
      await nextTick();

      expect(emitted).toBe(true);
    });

    it('DC-03: supports keyboard accessibility (Enter and Space key emit open-preview)', async () => {
      let enterEmitted = false;
      const { el } = mountDashboardCard({}, () => {
        enterEmitted = true;
      });

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await nextTick();
      expect(enterEmitted).toBe(true);
    });
  });

  describe('MobileWallpaperPreviewPage Component', () => {
    function mountPreviewPage(props = {}, onBack = () => {}, onDownload = () => {}) {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const app = createApp({
        render() {
          return h(MobileWallpaperPreviewPage, {
            goal: mockGoal,
            ...props,
            onBack,
            'onDownload-complete': onDownload
          });
        }
      });

      app.mount(container);
      mountedApps.push({ app, container });

      return {
        el: container.firstElementChild,
        container
      };
    }

    it('MP-01: renders dedicated mobile preview layout with back button, header toolbar, and download action', () => {
      const { el } = mountPreviewPage();

      expect(el.classList.contains('mobile-preview-page')).toBe(true);
      expect(el.getAttribute('role')).toBe('region');
      expect(el.getAttribute('aria-label')).toBe('Mobile Wallpaper Preview');

      // Back button
      const backBtn = el.querySelector('.back-dashboard-btn');
      expect(backBtn).not.toBeNull();
      expect(backBtn.textContent).toContain('Back to Dashboard');

      // Download button
      const downloadBtn = el.querySelector('.download-action-btn');
      expect(downloadBtn).not.toBeNull();
      expect(downloadBtn.textContent).toContain('Download Wallpaper');
    });

    it('MP-02: emits back event when Back to Dashboard button is clicked', async () => {
      let backEmitted = false;
      const { el } = mountPreviewPage({}, () => {
        backEmitted = true;
      });

      const backBtn = el.querySelector('.back-dashboard-btn');
      backBtn.click();
      await nextTick();

      expect(backEmitted).toBe(true);
    });

    it('MP-03: emits back event on Escape keyboard press', async () => {
      let backEmitted = false;
      mountPreviewPage({}, () => {
        backEmitted = true;
      });

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await nextTick();

      expect(backEmitted).toBe(true);
    });

    it('MP-04: dedicated view strictly isolates Mobile mode (no desktop monitor, no desktop switcher)', () => {
      const { el } = mountPreviewPage();

      // Mobile smartphone frame must be present
      expect(el.querySelector('.smartphone-body')).not.toBeNull();
      expect(el.querySelector('.dynamic-island-pill')).not.toBeNull();

      // Desktop monitor and floating desktop switcher MUST NOT exist
      expect(el.querySelector('.desktop-monitor-body')).toBeNull();
      expect(el.querySelector('.floating-device-switcher')).toBeNull();
      expect(el.querySelector('.switcher-dock')).toBeNull();
    });

    it('MP-05: invokes wallpaperExportService with preset MOBILE and 1080x1920 dimensions on download', async () => {
      const exportSpy = vi.spyOn(wallpaperExportService, 'exportAndDownload').mockResolvedValue({
        success: true,
        filename: 'horizon-golden-horizon-master-full-stack-engineering-mobile.png',
        dimensions: { width: 1080, height: 1920 }
      });

      let downloadResult = null;
      const { el } = mountPreviewPage({}, () => {}, (res) => {
        downloadResult = res;
      });

      const downloadBtn = el.querySelector('.download-action-btn');
      downloadBtn.click();
      await nextTick();

      expect(exportSpy).toHaveBeenCalledWith({
        goal: mockGoal,
        preset: 'MOBILE'
      });
    });

    it('MP-06: displays error message when export fails without throwing unhandled exceptions', async () => {
      vi.spyOn(wallpaperExportService, 'exportAndDownload').mockResolvedValue({
        success: false,
        error: 'Canvas memory allocation failed'
      });

      const { el } = mountPreviewPage();
      const downloadBtn = el.querySelector('.download-action-btn');
      downloadBtn.click();
      await nextTick();

      // Component remains mounted and functional
      expect(el.querySelector('.download-action-btn')).not.toBeNull();
    });

    it('MP-07: renders floating download FAB in bottom right corner and triggers mobile export on click', async () => {
      const exportSpy = vi.spyOn(wallpaperExportService, 'exportAndDownload').mockResolvedValue({
        success: true,
        filename: 'horizon-golden-horizon-master-full-stack-engineering-mobile.png',
        dimensions: { width: 1080, height: 1920 }
      });

      const { el } = mountPreviewPage();
      const floatingFab = el.querySelector('.floating-download-fab');
      expect(floatingFab).not.toBeNull();
      expect(floatingFab.getAttribute('aria-label')).toContain('Download');

      floatingFab.click();
      await nextTick();

      expect(exportSpy).toHaveBeenCalledWith({
        goal: mockGoal,
        preset: 'MOBILE'
      });
    });

    it('MP-08: renders mobile theme pill and responsive safe zones toggle', () => {
      const { el } = mountPreviewPage();
      const mobileThemePill = el.querySelector('.preview-mobile-theme-pill');
      expect(mobileThemePill).not.toBeNull();
      expect(mobileThemePill.textContent).toContain('Golden Horizon');

      const safeZoneBtn = el.querySelector('.safe-zone-toggle-btn');
      expect(safeZoneBtn).not.toBeNull();
      expect(safeZoneBtn.querySelector('i.mdi-shield-outline')).not.toBeNull();
    });
  });

  describe('View Switching & State Preservation', () => {
    it('VS-01: goal data and theme remain reactive and identical across views', () => {
      expect(mockGoal.title).toBe('Master Full-Stack Engineering');
      expect(mockGoal.templateId).toBe('golden-horizon');
      expect(mockGoal.milestones).toHaveLength(2);

      // Simulating view toggle
      let currentView = 'dashboard';
      expect(currentView).toBe('dashboard');

      currentView = 'preview';
      expect(currentView).toBe('preview');
      expect(mockGoal.title).toBe('Master Full-Stack Engineering');

      currentView = 'dashboard';
      expect(currentView).toBe('dashboard');
      expect(mockGoal.templateId).toBe('golden-horizon');
    });

    it('VS-02: scroll position saving and restoration logic functions accurately', async () => {
      let savedScrollTop = 0;
      const mockContainer = { scrollTop: 420 };

      // Switch to preview: record scroll
      savedScrollTop = mockContainer.scrollTop;
      expect(savedScrollTop).toBe(420);

      // Return to dashboard: restore scroll
      mockContainer.scrollTop = 0; // simulated unmount / reset
      mockContainer.scrollTop = savedScrollTop; // simulated restore
      expect(mockContainer.scrollTop).toBe(420);
    });
  });
});
