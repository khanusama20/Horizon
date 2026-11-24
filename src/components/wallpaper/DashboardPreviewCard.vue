<template>
  <div
    id="section-mockup-preview"
    class="dashboard-preview-card pa-4 mb-5 border rounded-xl"
    role="region"
    aria-label="Mobile wallpaper preview section"
    @click="handleCardClick"
    @keydown.enter="handleCardKeydown"
    @keydown.space.prevent="handleCardKeydown"
  >
    <div class="d-flex flex-wrap align-center justify-space-between gap-3">
      <!-- Left: Phone Graphic / Avatar + Titles -->
      <div class="d-flex align-center gap-3 min-w-0">
        <!-- Visual Phone Thumbnail / Swatch -->
        <div
          class="preview-thumbnail-badge flex-shrink-0 d-flex flex-column align-center justify-center rounded-lg shadow-sm"
          :style="{ background: previewBackground }"
        >
          <i class="mdi mdi-cellphone text-white" style="font-size: 22px;"></i>
        </div>

        <div class="section-header-content min-w-0">
          <div class="d-flex align-center gap-2 mb-1 flex-wrap">
            <h2 class="section-header-title text-subtitle-1 font-weight-bold mb-0">
              Mobile Wallpaper Preview
            </h2>
            <span class="preview-res-chip">
              1080 × 1920 PNG
            </span>
          </div>
          <p class="section-header-subtitle text-caption text-medium-emphasis mb-0">
            View your generated countdown lock screen inside a realistic device frame.
          </p>
        </div>
      </div>

      <!-- Right: Action Button -->
      <div class="d-flex align-center gap-2 ms-auto flex-shrink-0">
        <button
          type="button"
          class="open-preview-btn font-weight-bold shadow-orange"
          aria-label="Open full-screen mobile wallpaper preview"
          @click.stop="$emit('open-preview')"
        >
          <i class="mdi mdi-fullscreen me-1"></i>
          Open Dedicated Preview
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getTheme } from '../../services/themeRegistry.js';

const props = defineProps({
  goal: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['open-preview']);

function isMobileScreen() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

function handleCardClick() {
  // On mobile screens, tapping the card still navigates to dedicated preview.
  // On desktop / large screens, only the "Open Dedicated Preview" button triggers the action.
  if (isMobileScreen()) {
    emit('open-preview');
  }
}

function handleCardKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
    emit('open-preview');
  }
}

const previewBackground = computed(() => {
  if (props.goal?.customImageUrl || props.goal?.customImage) {
    return `url("${props.goal.customImageUrl || props.goal.customImage}") center/cover no-repeat`;
  }
  if (props.goal?.customColors?.background) {
    return props.goal.customColors.background;
  }
  const theme = getTheme(props.goal?.templateId || 'alpine-peak');
  const colors = theme?.palette?.previewGradient;
  if (colors && colors.length > 0) {
    return `linear-gradient(135deg, ${colors.join(', ')})`;
  }
  return 'linear-gradient(135deg, #060B14, #10B981)';
});
</script>

<style scoped>
.dashboard-preview-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  background: linear-gradient(135deg, #FFFDF8 0%, #FAF5EC 100%) !important;
  border: 1px solid var(--color-border);
  cursor: default;
}

@media (max-width: 767.98px) {
  .dashboard-preview-card {
    cursor: pointer;
  }
}

.dashboard-preview-card:hover {
  border-color: rgba(233, 120, 36, 0.45) !important;
  box-shadow: 0 4px 14px rgba(233, 120, 36, 0.08) !important;
}

@media (max-width: 767.98px) {
  .dashboard-preview-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(233, 120, 36, 0.12) !important;
  }
}

.preview-thumbnail-badge {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.preview-res-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background-color: rgba(233, 120, 36, 0.12);
  color: var(--color-primary-orange);
}

.open-preview-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  padding: 8px 16px;
  border-radius: 8px;
  background-color: var(--color-primary-orange);
  color: #FFFFFF;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.open-preview-btn:hover {
  background-color: #D36615;
  transform: translateY(-1px);
}

.shadow-orange {
  box-shadow: 0 3px 10px rgba(233, 120, 36, 0.25) !important;
}

@media (max-width: 599.98px) {
  .dashboard-preview-card .ms-auto {
    width: 100%;
    margin-left: 0 !important;
  }
  .open-preview-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
