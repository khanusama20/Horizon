<template>
  <v-card id="section-export-controls" color="surface" class="pa-5 mb-5">
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 gap-3">
      <div class="section-header-row">
        <v-avatar color="primary" size="32" class="flex-shrink-0">
          <v-icon icon="mdi-tray-arrow-down" color="white" size="18" />
        </v-avatar>
        <div class="section-header-content">
          <h2 class="section-header-title">Export Wallpaper Artifact</h2>
          <span class="section-header-subtitle">Full-resolution static PNG with deadline countdown HUD</span>
        </div>
      </div>

      <!-- Resolution Badge -->
      <v-chip size="small" color="primary" variant="tonal" class="font-weight-medium">
        {{ resolutionLabel }}
      </v-chip>
    </div>

    <!-- Controls Row: Preset Toggle & Safe Zone Switch -->
    <v-row dense class="align-center mb-3">
      <v-col cols="12" sm="7">
        <v-btn-toggle
          :model-value="preset"
          mandatory
          density="comfortable"
          color="primary"
          variant="outlined"
          class="w-100 preset-btn-toggle"
          @update:model-value="$emit('update:preset', $event)"
        >
          <v-btn value="MOBILE" class="flex-grow-1 font-weight-medium preset-toggle-btn" size="small">
            <v-icon icon="mdi-cellphone" start size="15" class="preset-btn-icon" />
            <span class="preset-btn-label">9:16<span class="d-none d-sm-inline"> (1920)</span></span>
          </v-btn>
          <v-btn value="MOTOROLA_EDGE" class="flex-grow-1 font-weight-medium preset-toggle-btn" size="small">
            <v-icon icon="mdi-cellphone-text" start size="15" class="preset-btn-icon" />
            <span class="preset-btn-label">Edge 50<span class="d-none d-sm-inline"> (2400)</span></span>
          </v-btn>
          <v-btn value="DESKTOP" class="flex-grow-1 font-weight-medium preset-toggle-btn" size="small">
            <v-icon icon="mdi-monitor" start size="15" class="preset-btn-icon" />
            <span class="preset-btn-label">Desktop<span class="d-none d-sm-inline"> (1080)</span></span>
          </v-btn>
        </v-btn-toggle>
      </v-col>

      <v-col cols="12" sm="5" class="d-flex justify-sm-end">
        <v-btn
          :variant="showSafeZones ? 'flat' : 'outlined'"
          :color="showSafeZones ? 'warning' : 'medium-emphasis'"
          size="small"
          height="40"
          prepend-icon="mdi-shield-outline"
          class="w-100 font-weight-medium"
          @click="$emit('update:showSafeZones', !showSafeZones)"
        >
          {{ showSafeZones ? 'Safe Zones: On' : 'Toggle Safe Zones' }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filename Preview Strip -->
    <v-sheet
      color="surface-variant"
      class="pa-3 rounded-lg mb-3 d-flex align-center justify-space-between border text-caption"
    >
      <div class="d-flex align-center text-truncate me-2 gap-2">
        <v-icon icon="mdi-file-image-outline" size="16" color="medium-emphasis" class="flex-shrink-0" />
        <span class="text-medium-emphasis">Filename:</span>
        <span class="font-mono text-primary-text text-truncate">{{ expectedFilename }}</span>
      </div>
      <span class="text-primary font-weight-bold flex-shrink-0">PNG</span>
    </v-sheet>

    <!-- Download Action Button: Responsive label adapts on mobile without clipping -->
    <v-btn
      color="primary"
      size="x-large"
      variant="flat"
      block
      :loading="isExporting"
      :disabled="isExporting"
      prepend-icon="mdi-download"
      class="download-action-btn-responsive font-weight-bold mb-2 shadow-orange"
      @click="handleExport"
    >
      <!-- Desktop Full Label (Visible on sm and up) -->
      <span class="d-none d-sm-inline text-uppercase tracking-wider">
        Download Wallpaper ({{ resolutionText }})
      </span>

      <!-- Mobile Clean Stacked Label (Visible below sm) -->
      <span class="d-inline-flex d-sm-none flex-column align-center line-height-tight py-1">
        <span class="text-uppercase font-weight-bold download-mobile-main-text">
          Download Wallpaper
        </span>
        <span class="text-caption font-weight-regular mt-0.5 download-mobile-res-text">
          {{ resolutionText }} px
        </span>
      </span>
    </v-btn>

    <!-- Unobtrusive Static PNG Clarification Note -->
    <div class="d-flex align-center justify-center text-center px-2 pt-1 gap-1">
      <v-icon icon="mdi-information-outline" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis" style="font-size: 0.725rem !important;">
        Generates a standalone static PNG image. Re-export and refresh your wallpaper as you complete new milestones.
      </span>
    </div>

    <!-- Feedback Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="4000"
      location="bottom right"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  wallpaperExportService,
  generateWallpaperFilename
} from '../../services/wallpaperExportService.js';
import { cleanupTempImageApi } from '../../services/apiClient.js';

const props = defineProps({
  goal: {
    type: Object,
    required: true
  },
  preset: {
    type: String,
    default: 'MOBILE'
  },
  showSafeZones: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:preset', 'update:showSafeZones', 'export-success', 'export-error']);

const isExporting = ref(false);
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const resolutionLabel = computed(() => {
  if (props.preset === 'DESKTOP') return 'Desktop 1920 × 1080 px (16:9)';
  if (props.preset === 'MOTOROLA_EDGE') return 'Edge 50 Fusion 1080 × 2400 px (9:20)';
  return 'Mobile 1080 × 1920 px (9:16)';
});

const resolutionText = computed(() => {
  if (props.preset === 'DESKTOP') return '1920×1080';
  if (props.preset === 'MOTOROLA_EDGE') return '1080×2400';
  return '1080×1920';
});

const expectedFilename = computed(() => {
  return generateWallpaperFilename(props.goal, props.goal?.templateId, props.preset);
});

async function handleExport() {
  isExporting.value = true;

  try {
    const result = await wallpaperExportService.exportAndDownload({
      goal: props.goal,
      preset: props.preset
    });

    if (result.success) {
      snackbar.value = {
        show: true,
        message: `Wallpaper downloaded successfully: ${result.filename} (${result.dimensions.width}×${result.dimensions.height})`,
        color: 'success'
      };
      emit('export-success', result);

      // Auto-drop temporary custom photo from directory upon wallpaper download
      if (props.goal?.customImageFilename) {
        try {
          cleanupTempImageApi(props.goal.customImageFilename);
          props.goal.customImageFilename = null;
        } catch {
          // ignore
        }
      }
    } else {
      snackbar.value = {
        show: true,
        message: `Export failed: ${result.error}`,
        color: 'error'
      };
      emit('export-error', result.error);
    }
  } catch (err) {
    snackbar.value = {
      show: true,
      message: `Export exception: ${err.message}`,
      color: 'error'
    };
    emit('export-error', err.message);
  } finally {
    isExporting.value = false;
  }
}
</script>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.tracking-wider {
  letter-spacing: 0.05em;
}

.download-action-btn-responsive {
  height: auto !important;
  min-height: 52px;
  padding: 8px 16px !important;
  white-space: normal !important;
}

.download-mobile-main-text {
  font-size: 0.875rem;
  letter-spacing: 0.03em;
}

.download-mobile-res-text {
  font-size: 0.725rem;
  opacity: 0.9;
}

@media (max-width: 480px) {
  .preset-toggle-btn {
    padding: 0 4px !important;
  }

  .preset-btn-label {
    font-size: 0.6875rem !important;
  }
}
</style>
