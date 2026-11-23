<template>
  <div class="mobile-preview-page d-flex flex-column" role="region" aria-label="Mobile Wallpaper Preview">
    <!-- Top Studio Toolbar -->
    <header class="preview-page-header px-4 py-2 border-b">
      <div class="d-flex align-center justify-space-between flex-wrap gap-2 gap-sm-3">
        <!-- Left: Back to Dashboard Button & Title (Desktop Only) -->
        <div class="preview-desktop-details align-center gap-3">
          <button
            type="button"
            class="back-dashboard-btn font-weight-bold"
            aria-label="Back to Dashboard"
            @click="$emit('back')"
          >
            <i class="mdi mdi-arrow-left me-1"></i>
            Back to Dashboard
          </button>

          <!-- Desktop Title & Resolution info -->
          <div class="d-flex align-center gap-2">
            <div class="header-icon-avatar flex-shrink-0">
              <i class="mdi mdi-cellphone text-white" style="font-size: 16px;"></i>
            </div>
            <div>
              <div class="text-subtitle-2 font-weight-bold text-primary-text line-height-tight">
                Mobile Wallpaper Studio
              </div>
              <div class="text-caption text-medium-emphasis" style="font-size: 0.725rem !important;">
                1080 × 1920 • Live Lock-Screen Mockup
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Theme Indicator Pill (Mobile only: sleek and minimal) -->
        <div class="preview-mobile-details align-center gap-1">
          <span class="preview-mobile-theme-pill">
            <i class="mdi mdi-palette-swatch-outline me-1"></i>
            {{ activeThemeName }}
          </span>
        </div>

        <!-- Center: Device Tag / Info Pill (Desktop Only) -->
        <div class="preview-desktop-details align-center gap-2">
          <span class="preview-tag-pill">
            <i class="mdi mdi-cellphone-check me-1" style="font-size: 14px;"></i>
            Mobile (9:16 Aspect Ratio)
          </span>
          <span class="preview-theme-pill">
            Theme: {{ activeThemeName }}
          </span>
        </div>

        <!-- Right: Safe Zones & Download Action Buttons -->
        <div class="d-flex align-center gap-2 ms-auto">
          <!-- Safe Zone Toggle Button: On mobile, icon only -->
          <button
            type="button"
            :class="['safe-zone-toggle-btn font-weight-medium', showSafeZones ? 'is-active' : '']"
            aria-label="Toggle safe zone guide overlay"
            :title="showSafeZones ? 'Safe Zones: Active' : 'Toggle safe zone guides'"
            @click="showSafeZones = !showSafeZones"
          >
            <i :class="['mdi', showSafeZones ? 'mdi-shield-check' : 'mdi-shield-outline']"></i>
            <span class="safe-zone-label ms-1">{{ showSafeZones ? 'Safe Zones: On' : 'Safe Zones' }}</span>
          </button>

          <!-- Prominent Download Wallpaper Action Button (Desktop Only) -->
          <button
            type="button"
            class="download-action-btn font-weight-bold shadow-orange preview-desktop-details"
            :disabled="isExporting"
            aria-label="Download full-resolution mobile wallpaper"
            title="Download full-resolution static PNG (1080×1920)"
            @click="handleDownload"
          >
            <i :class="['mdi me-1', isExporting ? 'mdi-loading mdi-spin' : 'mdi-download']"></i>
            {{ isExporting ? 'Exporting...' : 'Download Wallpaper' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Main Viewport Stage: Full Available Space Centered -->
    <main class="preview-page-stage flex-grow-1">
      <DeviceMockupPreview
        :goal="goal"
        preset="MOBILE"
        :show-safe-zones="showSafeZones"
      />

      <!-- Floating Download Action Button (Bottom-Right Corner for Mobile Responsive) -->
      <button
        type="button"
        class="floating-download-fab shadow-orange d-flex d-sm-none"
        :class="{ 'is-loading': isExporting }"
        :disabled="isExporting"
        aria-label="Download full-resolution mobile wallpaper"
        title="Download full-resolution static PNG (1080×1920)"
        @click="handleDownload"
      >
        <i :class="['mdi', isExporting ? 'mdi-loading mdi-spin' : 'mdi-download']"></i>
      </button>
    </main>

    <!-- Feedback Toast Notification -->
    <Transition name="toast-fade">
      <div v-if="snackbar.show" :class="['preview-toast shadow-lg', `toast-${snackbar.color}`]">
        <i :class="['mdi me-2', snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle']"></i>
        <span class="toast-message">{{ snackbar.message }}</span>
        <button type="button" class="toast-close-btn ms-3" aria-label="Close notification" @click="snackbar.show = false">
          <i class="mdi mdi-close"></i>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import DeviceMockupPreview from './DeviceMockupPreview.vue';
import { getTheme } from '../../services/themeRegistry.js';
import { wallpaperExportService } from '../../services/wallpaperExportService.js';

const props = defineProps({
  goal: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['back', 'download-complete']);

const showSafeZones = ref(false);
const isExporting = ref(false);
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const activeThemeName = computed(() => {
  const theme = getTheme(props.goal?.templateId || 'alpine-peak');
  return theme?.name || 'Alpine Peak';
});

/**
 * Downloads the full-resolution 1080x1920 Mobile PNG
 */
async function handleDownload() {
  isExporting.value = true;
  try {
    const result = await wallpaperExportService.exportAndDownload({
      goal: props.goal,
      preset: 'MOBILE'
    });

    if (result.success) {
      snackbar.value = {
        show: true,
        message: `Mobile wallpaper downloaded: ${result.filename} (${result.dimensions.width}×${result.dimensions.height})`,
        color: 'success'
      };
      emit('download-complete', result);
    } else {
      snackbar.value = {
        show: true,
        message: `Export failed: ${result.error}`,
        color: 'error'
      };
    }
  } catch (err) {
    snackbar.value = {
      show: true,
      message: `Export exception: ${err.message}`,
      color: 'error'
    };
  } finally {
    isExporting.value = false;
  }
}

/**
 * Escape key listener to return back to dashboard
 */
function handleKeyDown(event) {
  if (event.key === 'Escape') {
    emit('back');
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
  }
});
</script>

<style scoped>
.mobile-preview-page {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 64px);
  min-height: calc(100dvh - 64px);
  background: linear-gradient(180deg, #F8F4EC 0%, #EDE5D5 100%);
  position: relative;
  overflow: hidden;
}

.preview-page-header {
  flex-shrink: 0;
  background: rgba(255, 253, 248, 0.96);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border) !important;
  z-index: 10;
}

.preview-page-stage {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  overflow: hidden;
  position: relative;
}

.header-icon-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--color-primary-orange);
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-dashboard-btn {
  display: inline-flex;
  align-items: center;
  font-size: 0.8125rem;
  padding: 6px 14px;
  border-radius: 8px;
  background-color: rgba(233, 120, 36, 0.12);
  color: var(--color-primary-orange);
  border: 1px solid rgba(233, 120, 36, 0.25);
  cursor: pointer;
  transition: all 0.15s ease;
}

.back-dashboard-btn:hover {
  background-color: rgba(233, 120, 36, 0.2);
}

.preview-tag-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  background-color: rgba(233, 120, 36, 0.1);
  color: var(--color-primary-orange);
}

.preview-theme-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 12px;
  background-color: rgba(0, 0, 0, 0.04);
  color: #555555;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.safe-zone-toggle-btn {
  display: inline-flex;
  align-items: center;
  font-size: 0.8125rem;
  padding: 6px 12px;
  border-radius: 8px;
  background-color: transparent;
  color: #666666;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.safe-zone-toggle-btn.is-active {
  background-color: #EAB308;
  color: #FFFFFF;
  border-color: #EAB308;
}

.safe-zone-toggle-btn:hover:not(.is-active) {
  background-color: rgba(0, 0, 0, 0.04);
}

.download-action-btn {
  display: inline-flex;
  align-items: center;
  font-size: 0.8125rem;
  padding: 7px 16px;
  border-radius: 8px;
  background-color: var(--color-primary-orange);
  color: #FFFFFF;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.download-action-btn:hover:not(:disabled) {
  background-color: #D36615;
  transform: translateY(-1px);
}

.download-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.shadow-orange {
  box-shadow: 0 3px 10px rgba(233, 120, 36, 0.28) !important;
}

.line-height-tight {
  line-height: 1.2;
}

/* Toast */
.preview-toast {
  position: absolute;
  bottom: 24px;
  right: 24px;
  padding: 10px 16px;
  border-radius: 8px;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  z-index: 100;
  font-size: 0.875rem;
  font-weight: 500;
}

.toast-success {
  background-color: #10B981;
}

.toast-error {
  background-color: #EF4444;
}

.toast-close-btn {
  background: transparent;
  border: none;
  color: #FFFFFF;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 14px;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.preview-desktop-details {
  display: flex !important;
}

.preview-mobile-details {
  display: none !important;
}

.preview-mobile-theme-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.725rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 9999px;
  background-color: rgba(233, 120, 36, 0.1);
  color: var(--color-primary-orange, #E97824);
  border: 1px solid rgba(233, 120, 36, 0.2);
}

.floating-download-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-orange, #E97824) 0%, #D46615 100%);
  color: #FFFFFF;
  border: none;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  cursor: pointer;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(233, 120, 36, 0.45);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}

.floating-download-fab:hover:not(:disabled) {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(233, 120, 36, 0.55);
}

.floating-download-fab:active:not(:disabled) {
  transform: scale(0.94);
}

.floating-download-fab:disabled {
  opacity: 0.8;
  cursor: wait;
}

@media (max-width: 768px) {
  .preview-desktop-details {
    display: none !important;
  }
  .preview-mobile-details {
    display: flex !important;
  }
  .floating-download-fab {
    display: flex !important;
  }
  .preview-page-header {
    padding: 6px 14px !important;
  }
  .safe-zone-label {
    display: none !important;
  }
  .preview-page-stage {
    padding: 6px 8px !important;
  }
}
</style>
