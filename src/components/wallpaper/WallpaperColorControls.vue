<template>
  <div class="wallpaper-color-controls">
    <!-- Header with Reset Button -->
    <div class="d-flex flex-wrap align-center justify-space-between gap-2 mb-3">
      <div>
        <h4 class="text-subtitle-2 font-weight-bold text-primary-text mb-0">
          Wallpaper Color Customization
        </h4>
        <span class="text-caption text-medium-emphasis">
          Customize colors for wallpaper typography, cards, and accents
        </span>
      </div>

      <v-btn
        v-if="hasCustomColors"
        size="x-small"
        variant="tonal"
        color="secondary"
        prepend-icon="mdi-restore"
        class="font-weight-medium text-none"
        @click="resetToTheme"
      >
        Reset to Nature Theme
      </v-btn>
    </div>

    <!-- Presets Section -->
    <div class="mb-4">
      <span class="text-caption font-weight-bold text-uppercase tracking-wider text-medium-emphasis d-block mb-2">
        Curated Color Presets
      </span>
      <v-row dense>
        <v-col
          v-for="preset in COLOR_PRESETS"
          :key="preset.id"
          cols="6"
          sm="3"
        >
          <div
            :class="[
              'preset-card pa-2 rounded-lg border cursor-pointer transition-all',
              activePresetId === preset.id ? 'border-active shadow-sm' : 'border-subtle'
            ]"
            @click="applyPreset(preset)"
          >
            <!-- 5-Color Mini Swatch Strip -->
            <div class="preset-swatch-strip rounded overflow-hidden d-flex mb-2" style="height: 24px;">
              <div :style="{ backgroundColor: preset.colors.background, flex: 2 }" title="Background" />
              <div :style="{ backgroundColor: preset.colors.card, flex: 2 }" title="Card / Overlay" />
              <div :style="{ backgroundColor: preset.colors.accent, flex: 2 }" title="Accent" />
              <div :style="{ backgroundColor: preset.colors.heading, flex: 1.5 }" title="Heading" />
              <div :style="{ backgroundColor: preset.colors.body, flex: 1.5 }" title="Body" />
            </div>

            <div class="d-flex align-center justify-space-between">
              <span class="text-caption font-weight-bold text-truncate">{{ preset.name }}</span>
              <v-icon
                v-if="activePresetId === preset.id"
                icon="mdi-check-circle"
                color="primary"
                size="14"
              />
            </div>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- Individual 5 Color Pickers -->
    <div class="pa-3 rounded-lg bg-surface-variant border mb-3">
      <span class="text-caption font-weight-bold text-uppercase tracking-wider text-medium-emphasis d-block mb-2">
        Fine-Tune Individual Colors
      </span>

      <v-row dense>
        <!-- 1. Background Color -->
        <v-col cols="12" sm="6" md="4" class="py-1">
          <div class="color-picker-item d-flex align-center justify-space-between pa-2 rounded bg-surface border">
            <div class="d-flex align-center gap-2">
              <div class="color-swatch-wrapper position-relative rounded overflow-hidden shadow-sm">
                <input
                  type="color"
                  v-model="colors.background"
                  class="native-color-input cursor-pointer"
                  @change="emitColorUpdate"
                />
              </div>
              <div>
                <div class="text-caption font-weight-bold">Background</div>
                <div class="text-caption text-medium-emphasis font-mono" style="font-size: 0.7rem;">{{ colors.background }}</div>
              </div>
            </div>
          </div>
        </v-col>

        <!-- 2. Primary / Accent Color -->
        <v-col cols="12" sm="6" md="4" class="py-1">
          <div class="color-picker-item d-flex align-center justify-space-between pa-2 rounded bg-surface border">
            <div class="d-flex align-center gap-2">
              <div class="color-swatch-wrapper position-relative rounded overflow-hidden shadow-sm">
                <input
                  type="color"
                  v-model="colors.accent"
                  class="native-color-input cursor-pointer"
                  @change="emitColorUpdate"
                />
              </div>
              <div>
                <div class="text-caption font-weight-bold">Primary / Accent</div>
                <div class="text-caption text-medium-emphasis font-mono" style="font-size: 0.7rem;">{{ colors.accent }}</div>
              </div>
            </div>
          </div>
        </v-col>

        <!-- 3. Heading Text Color -->
        <v-col cols="12" sm="6" md="4" class="py-1">
          <div class="color-picker-item d-flex align-center justify-space-between pa-2 rounded bg-surface border">
            <div class="d-flex align-center gap-2">
              <div class="color-swatch-wrapper position-relative rounded overflow-hidden shadow-sm">
                <input
                  type="color"
                  v-model="colors.heading"
                  class="native-color-input cursor-pointer"
                  @change="emitColorUpdate"
                />
              </div>
              <div>
                <div class="text-caption font-weight-bold">Heading Text</div>
                <div class="text-caption text-medium-emphasis font-mono" style="font-size: 0.7rem;">{{ colors.heading }}</div>
              </div>
            </div>
          </div>
        </v-col>

        <!-- 4. Body Text Color -->
        <v-col cols="12" sm="6" md="6" class="py-1">
          <div class="color-picker-item d-flex align-center justify-space-between pa-2 rounded bg-surface border">
            <div class="d-flex align-center gap-2">
              <div class="color-swatch-wrapper position-relative rounded overflow-hidden shadow-sm">
                <input
                  type="color"
                  v-model="colors.body"
                  class="native-color-input cursor-pointer"
                  @change="emitColorUpdate"
                />
              </div>
              <div>
                <div class="text-caption font-weight-bold">Body Text</div>
                <div class="text-caption text-medium-emphasis font-mono" style="font-size: 0.7rem;">{{ colors.body }}</div>
              </div>
            </div>
          </div>
        </v-col>

        <!-- 5. Card / Overlay Color -->
        <v-col cols="12" sm="12" md="6" class="py-1">
          <div class="color-picker-item d-flex align-center justify-space-between pa-2 rounded bg-surface border">
            <div class="d-flex align-center gap-2">
              <div class="color-swatch-wrapper position-relative rounded overflow-hidden shadow-sm">
                <input
                  type="color"
                  v-model="colors.card"
                  class="native-color-input cursor-pointer"
                  @change="emitColorUpdate"
                />
              </div>
              <div>
                <div class="text-caption font-weight-bold">Card / Overlay</div>
                <div class="text-caption text-medium-emphasis font-mono" style="font-size: 0.7rem;">{{ colors.card }}</div>
              </div>
            </div>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- Live Color Contrast Verification Strip -->
    <div
      class="pa-3 rounded-lg border text-caption"
      :style="{
        backgroundColor: colors.card,
        borderLeft: `4px solid ${colors.accent}`
      }"
    >
      <div class="d-flex align-center justify-space-between mb-1">
        <span class="font-weight-bold" :style="{ color: colors.heading }">
          Live Wallpaper Preview Heading
        </span>
        <span class="text-caption font-weight-bold px-2 py-0.5 rounded" :style="{ backgroundColor: colors.accent, color: '#fff', fontSize: '0.65rem' }">
          Accent Badge
        </span>
      </div>
      <p class="mb-0" :style="{ color: colors.body }">
        Sample body typography demonstrating contrast over the customized card background.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { COLOR_PRESETS, DEFAULT_PALETTE } from '../../services/colorPaletteService.js';

const props = defineProps({
  modelValue: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'change', 'reset']);

const colors = ref({
  background: props.modelValue?.background || DEFAULT_PALETTE.background,
  accent: props.modelValue?.accent || DEFAULT_PALETTE.accent,
  heading: props.modelValue?.heading || DEFAULT_PALETTE.heading,
  body: props.modelValue?.body || DEFAULT_PALETTE.body,
  card: props.modelValue?.card || DEFAULT_PALETTE.card
});

const activePresetId = ref(null);

// Determine if user has actively customized colors
const hasCustomColors = computed(() => {
  return props.modelValue !== null && typeof props.modelValue === 'object';
});

// Watch for external modelValue updates
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    colors.value = {
      background: newVal.background || colors.value.background,
      accent: newVal.accent || colors.value.accent,
      heading: newVal.heading || colors.value.heading,
      body: newVal.body || colors.value.body,
      card: newVal.card || colors.value.card
    };
    // Match preset if exact
    const match = COLOR_PRESETS.find(p =>
      p.colors.background.toLowerCase() === colors.value.background.toLowerCase() &&
      p.colors.accent.toLowerCase() === colors.value.accent.toLowerCase() &&
      p.colors.heading.toLowerCase() === colors.value.heading.toLowerCase()
    );
    activePresetId.value = match ? match.id : null;
  } else {
    activePresetId.value = null;
  }
}, { immediate: true, deep: true });

function applyPreset(preset) {
  colors.value = { ...preset.colors };
  activePresetId.value = preset.id;
  emitColorUpdate();
}

function emitColorUpdate() {
  const updated = { ...colors.value };
  emit('update:modelValue', updated);
  emit('change', updated);
}

function resetToTheme() {
  activePresetId.value = null;
  emit('update:modelValue', null);
  emit('reset');
}
</script>

<style scoped>
.preset-card {
  background: var(--color-surface-card);
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.preset-card:hover {
  border-color: var(--color-primary-orange);
  transform: translateY(-1px);
}

.preset-card.border-active {
  border-color: var(--color-primary-orange) !important;
  box-shadow: 0 0 0 1px var(--color-primary-orange);
}

.color-swatch-wrapper {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
}

.native-color-input {
  position: absolute;
  top: -6px;
  left: -6px;
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  padding: 0;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
