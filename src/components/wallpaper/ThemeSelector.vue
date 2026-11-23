<template>
  <v-card id="section-themes" color="surface" class="pa-5 mb-5">
    <div class="d-flex align-center justify-space-between mb-4 gap-3 flex-wrap">
      <div class="section-header-row">
        <v-avatar color="primary" size="32" class="flex-shrink-0">
          <v-icon icon="mdi-palette" color="white" size="18" />
        </v-avatar>
        <div class="section-header-content">
          <h2 class="section-header-title">Wallpaper Aesthetics & Background</h2>
          <span class="section-header-subtitle">Choose procedural nature art, minimalist elegant colors, or upload a custom photo</span>
        </div>
      </div>

      <!-- Mode Selector Pills -->
      <div class="d-flex align-center gap-1 bg-surface-variant pa-1 rounded-pill border">
        <button
          type="button"
          :class="['mode-tab-btn', activeMode === 'nature' ? 'is-active' : '']"
          @click="activeMode = 'nature'"
        >
          <v-icon icon="mdi-image-filter-hdr" size="14" class="me-1" />
          Nature Art
        </button>
        <button
          type="button"
          :class="['mode-tab-btn', activeMode === 'colors' ? 'is-active' : '']"
          @click="activeMode = 'colors'"
        >
          <v-icon icon="mdi-palette-swatch-outline" size="14" class="me-1" />
          Elegant Colors
        </button>
        <button
          type="button"
          :class="['mode-tab-btn', activeMode === 'custom' ? 'is-active' : '']"
          @click="activeMode = 'custom'"
        >
          <v-icon icon="mdi-camera-outline" size="14" class="me-1" />
          Custom Photo
        </button>
      </div>
    </div>

    <!-- Active Custom Photo Notice if present -->
    <v-alert
      v-if="goal?.customImageUrl && activeMode !== 'custom'"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4 text-caption rounded-lg"
    >
      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
        <div class="d-flex align-center gap-2">
          <v-icon icon="mdi-image-check" color="primary" size="16" />
          <span>Custom photo is currently active on your wallpaper. Selecting a theme or color below will replace it.</span>
        </div>
        <v-btn size="x-small" variant="text" color="primary" @click="activeMode = 'custom'">
          Manage Photo
        </v-btn>
      </div>
    </v-alert>

    <!-- ==========================================
         MODE 1: PROCEDURAL NATURE ART THEMES (4)
         ========================================== -->
    <div v-if="activeMode === 'nature'">
      <div class="d-flex align-center justify-space-between mb-3">
        <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase tracking-wider">
          4 Handcrafted Procedural Art Themes
        </span>
      </div>
      <v-row dense>
        <v-col
          v-for="theme in natureThemes"
          :key="theme.id"
          cols="12"
          sm="6"
        >
          <v-card
            :color="modelValue === theme.id && !goal?.customImageUrl ? 'surface' : 'surface-variant'"
            :class="[
              'pa-3 h-100 rounded-lg cursor-pointer transition-all border',
              modelValue === theme.id && !goal?.customImageUrl ? 'border-selected shadow-orange' : 'border-subtle hover-lift'
            ]"
            @click="selectTheme(theme.id)"
          >
            <!-- Gradient Swatch Bar -->
            <div
              class="swatch-bar rounded mb-2"
              :style="{ background: makeGradient(theme.palette.previewGradient) }"
            />

            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-body-2 font-weight-bold text-primary-text">
                {{ theme.name }}
              </span>
              <v-chip
                v-if="modelValue === theme.id && !goal?.customImageUrl"
                size="x-small"
                color="primary"
                variant="flat"
                class="font-weight-bold"
              >
                <v-icon icon="mdi-check" start size="12" /> Active
              </v-chip>
              <span v-else class="text-caption text-medium-emphasis">
                {{ theme.category }}
              </span>
            </div>

            <p class="text-caption text-medium-emphasis mb-0 line-clamp-2">
              {{ theme.description }}
            </p>
          </v-card>
        </v-col>
      </v-row>

      <!-- Advanced Color Customization & Presets -->
      <WallpaperColorControls
        v-if="goal"
        v-model="goal.customColors"
        class="mt-4 pt-3 border-t"
      />
    </div>

    <!-- ==========================================
         MODE 2: 8 CURATED ELEGANT COLORS (Point 6)
         ========================================== -->
    <div v-else-if="activeMode === 'colors'">
      <div class="d-flex align-center justify-space-between mb-3">
        <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase tracking-wider">
          8 Minimalist Luxury Solid & Duo-Tone Colors
        </span>
        <span class="text-caption text-medium-emphasis">
          Ultra-clean, high-focus backgrounds
        </span>
      </div>
      <v-row dense>
        <v-col
          v-for="colorTheme in colorThemes"
          :key="colorTheme.id"
          cols="12"
          sm="6"
          md="3"
        >
          <v-card
            :color="modelValue === colorTheme.id && !goal?.customImageUrl ? 'surface' : 'surface-variant'"
            :class="[
              'pa-3 h-100 rounded-lg cursor-pointer transition-all border text-center d-flex flex-column justify-space-between',
              modelValue === colorTheme.id && !goal?.customImageUrl ? 'border-selected shadow-orange' : 'border-subtle hover-lift'
            ]"
            @click="selectTheme(colorTheme.id)"
          >
            <div>
              <!-- Large Color Swatch Box -->
              <div
                class="color-palette-swatch rounded-lg mb-2 shadow-sm border"
                :style="{ background: makeGradient(colorTheme.palette.previewGradient) }"
              >
                <v-icon
                  v-if="modelValue === colorTheme.id && !goal?.customImageUrl"
                  icon="mdi-check-circle"
                  color="white"
                  size="24"
                  class="swatch-check-icon"
                />
              </div>

              <div class="text-caption font-weight-bold text-primary-text mb-0.5 text-truncate">
                {{ colorTheme.name }}
              </div>
            </div>

            <div class="text-caption text-medium-emphasis line-clamp-2 mt-1" style="font-size: 0.7rem !important;">
              {{ colorTheme.description }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Advanced Color Customization & Presets -->
      <WallpaperColorControls
        v-if="goal"
        v-model="goal.customColors"
        class="mt-4 pt-3 border-t"
      />
    </div>

    <!-- ==========================================
         MODE 3: TEMPORARY CUSTOM PHOTO UPLOAD (Point 5)
         ========================================== -->
    <div v-else-if="activeMode === 'custom'">
      <div class="d-flex align-center justify-space-between mb-3">
        <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase tracking-wider">
          Upload Custom Wallpaper Photo
        </span>
        <span class="text-caption text-medium-emphasis">
          Auto-dropped upon wallpaper download
        </span>
      </div>

      <!-- Temporary In-Memory Custom Wallpaper Image Component -->
      <v-sheet
        color="surface-variant"
        class="pa-4 rounded-xl border d-flex flex-column align-center text-center justify-center position-relative"
        style="min-height: 180px;"
      >
        <CustomWallpaperImage
          v-if="goal"
          v-model="goal.customImageUrl"
          @image-selected="onImageSelected"
          @image-cleared="onImageCleared"
        />
        <div v-else class="text-caption text-medium-emphasis">
          Goal not initialized.
        </div>
      </v-sheet>
    </div>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import { getAllThemes, getAllColorThemes } from '../../services/themeRegistry.js';
import CustomWallpaperImage from './CustomWallpaperImage.vue';
import WallpaperColorControls from './WallpaperColorControls.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'alpine-peak'
  },
  goal: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const activeMode = ref(props.goal?.customImageUrl ? 'custom' : 'nature');
const fileInputRef = ref(null);
const isUploading = ref(false);

const natureThemes = getAllThemes();
const colorThemes = getAllColorThemes();

function selectTheme(themeId) {
  // If user picks a theme or color, clear custom image
  if (props.goal) {
    const existing = props.goal.customImageUrl || props.goal.customImage;
    if (existing && typeof existing === 'string' && existing.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(existing);
      } catch {
        // ignore
      }
    }
    props.goal.customImageUrl = null;
    props.goal.customImage = null;
  }
  emit('update:modelValue', themeId);
  emit('change', themeId);
}

function makeGradient(colors) {
  if (!colors || colors.length === 0) return '#F1EBDD';
  return `linear-gradient(135deg, ${colors.join(', ')})`;
}

function onImageSelected(data) {
  if (props.goal) {
    const activeUrl = data.dataUrl || data.objectUrl;
    props.goal.customImageUrl = activeUrl;
    props.goal.customImage = activeUrl;
  }
  activeMode.value = 'custom';
  emit('change', props.modelValue);
  emit('image-selected', data);
}

function onImageCleared() {
  if (props.goal) {
    props.goal.customImageUrl = null;
    props.goal.customImage = null;
  }
  emit('change', props.modelValue);
  emit('image-cleared');
}
</script>

<style scoped>
.mode-tab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 9999px;
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-tab-btn:hover {
  color: var(--color-text-primary);
}

.mode-tab-btn.is-active {
  background-color: var(--color-surface-card);
  color: var(--color-primary-orange);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.swatch-bar {
  height: 38px;
  width: 100%;
}

.color-palette-swatch {
  height: 60px;
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swatch-check-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

.custom-photo-preview {
  width: 140px;
  height: 100px;
  background: #000;
}

.object-cover {
  object-fit: cover;
}

.photo-overlay-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.border-selected {
  border-color: var(--color-primary-orange) !important;
}

.border-subtle {
  border: 1px solid var(--color-border);
}

.hover-lift:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary-orange);
}

.shadow-orange {
  box-shadow: 0 2px 8px rgba(233, 120, 36, 0.28) !important;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.max-w-sm {
  max-width: 380px;
}
</style>
