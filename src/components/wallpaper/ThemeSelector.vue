<template>
  <v-card id="section-themes" color="surface" class="pa-5 mb-5">
    <div class="d-flex align-center justify-space-between mb-4 gap-3">
      <div class="section-header-row">
        <v-avatar color="primary" size="32" class="flex-shrink-0">
          <v-icon icon="mdi-palette" color="white" size="18" />
        </v-avatar>
        <div class="section-header-content">
          <h2 class="section-header-title">Nature Wallpaper Aesthetics</h2>
          <span class="section-header-subtitle">Procedural art themes rendered at native display resolutions</span>
        </div>
      </div>
      <v-chip size="small" color="primary" variant="tonal" class="font-weight-bold">
        4 Handcrafted Themes
      </v-chip>
    </div>

    <v-row dense>
      <v-col
        v-for="theme in themes"
        :key="theme.id"
        cols="12"
        sm="6"
      >
        <v-card
          :color="modelValue === theme.id ? 'surface' : 'surface-variant'"
          :class="[
            'pa-3 h-100 rounded-lg cursor-pointer transition-all border',
            modelValue === theme.id ? 'border-selected shadow-orange' : 'border-subtle hover-lift'
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
              v-if="modelValue === theme.id"
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
  </v-card>
</template>

<script setup>
import { getAllThemes } from '../../services/themeRegistry.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'alpine-peak'
  }
});

const emit = defineEmits(['update:modelValue']);

const themes = getAllThemes();

function selectTheme(themeId) {
  emit('update:modelValue', themeId);
}

function makeGradient(colors) {
  if (!colors || colors.length === 0) return '#F1EBDD';
  return `linear-gradient(135deg, ${colors.join(', ')})`;
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.swatch-bar {
  height: 12px;
  width: 100%;
}
.border-subtle {
  border: 1px solid var(--color-border);
}
.border-selected {
  border: 2px solid var(--color-primary-orange) !important;
  background-color: var(--color-surface-card) !important;
}
.shadow-orange {
  box-shadow: 0 4px 14px rgba(233, 120, 36, 0.16) !important;
}
.hover-lift:hover {
  border-color: rgba(233, 120, 36, 0.4);
}
.transition-all {
  transition: all 0.2s ease-in-out;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
