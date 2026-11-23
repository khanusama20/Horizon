<template>
  <v-card color="surface" class="pa-4 mb-4">
    <!-- Header with Controls -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-3 gap-2">
      <div class="d-flex align-center">
        <v-avatar color="primary" size="28" class="me-2">
          <v-icon icon="mdi-wallpaper" color="on-primary" size="18" />
        </v-avatar>
        <span class="text-subtitle-1 font-weight-bold text-white">Live Canvas Engine Preview</span>
      </div>

      <!-- Controls: Orientation Toggle & Safe Zones Switch -->
      <div class="d-flex align-center flex-wrap gap-2">
        <v-btn-toggle
          v-model="currentPreset"
          density="compact"
          mandatory
          color="primary"
          variant="outlined"
        >
          <v-btn value="MOBILE" size="small">
            <v-icon icon="mdi-cellphone" start size="16" />
            Mobile 9:16
          </v-btn>
          <v-btn value="DESKTOP" size="small">
            <v-icon icon="mdi-monitor" start size="16" />
            Desktop 16:9
          </v-btn>
        </v-btn-toggle>

        <v-btn
          :variant="showSafeZones ? 'flat' : 'outlined'"
          :color="showSafeZones ? 'warning' : 'medium-emphasis'"
          size="small"
          prepend-icon="mdi-shield-outline"
          @click="showSafeZones = !showSafeZones"
        >
          Safe Zones
        </v-btn>
      </div>
    </div>

    <!-- Canvas Preview Display Container -->
    <div class="canvas-container d-flex justify-center align-center pa-2 rounded-lg bg-surface-variant overflow-hidden">
      <canvas
        ref="canvasRef"
        class="wallpaper-canvas rounded shadow-lg"
        :style="canvasStyle"
      />
    </div>

    <!-- Canvas Geometry Info Footer -->
    <div class="d-flex justify-space-between align-center mt-3 text-caption text-medium-emphasis">
      <span>
        Native Canvas: {{ canvasWidth }} × {{ canvasHeight }} px ({{ currentPreset === 'MOBILE' ? '9:16' : '16:9' }})
      </span>
      <span v-if="showSafeZones" class="text-warning font-weight-medium">
        Top 280px & Bottom 200px Safe Zones Visualized
      </span>
      <span v-else class="text-success font-weight-medium">
        Safe Zone Compliant
      </span>
    </div>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { CanvasWallpaperEngine, CANVAS_DIMENSIONS } from '../../services/CanvasWallpaperEngine.js';

const props = defineProps({
  goal: {
    type: Object,
    required: true
  }
});

const canvasRef = ref(null);
const currentPreset = ref('MOBILE');
const showSafeZones = ref(false);

const canvasWidth = computed(() => {
  return currentPreset.value === 'DESKTOP' ? CANVAS_DIMENSIONS.DESKTOP.width : CANVAS_DIMENSIONS.MOBILE.width;
});

const canvasHeight = computed(() => {
  return currentPreset.value === 'DESKTOP' ? CANVAS_DIMENSIONS.DESKTOP.height : CANVAS_DIMENSIONS.MOBILE.height;
});

const canvasStyle = computed(() => {
  if (currentPreset.value === 'DESKTOP') {
    return {
      width: '100%',
      maxWidth: '640px',
      height: 'auto',
      aspectRatio: '16 / 9'
    };
  }
  return {
    width: 'auto',
    maxHeight: '480px',
    aspectRatio: '9 / 16'
  };
});

/**
 * Triggers re-render on the canvas element
 */
async function drawWallpaper() {
  await nextTick();
  if (!canvasRef.value) return;

  await CanvasWallpaperEngine.renderWallpaper(canvasRef.value, {
    goal: props.goal,
    preset: currentPreset.value,
    debugSafeZones: showSafeZones.value
  });
}

// Watch for reactive updates to goal, template, milestones, preset, or safe zone debug toggle
watch(
  () => [
    props.goal.title,
    props.goal.templateId,
    props.goal.totalDays,
    props.goal.targetDate,
    props.goal.category,
    props.goal.milestones,
    currentPreset.value,
    showSafeZones.value
  ],
  () => {
    drawWallpaper();
  },
  { deep: true }
);

onMounted(() => {
  drawWallpaper();
});

defineExpose({
  drawWallpaper,
  getCanvas: () => canvasRef.value
});
</script>

<style scoped>
.canvas-container {
  min-height: 380px;
  background: radial-gradient(circle at center, #1E293B 0%, #0F172A 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.wallpaper-canvas {
  display: block;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
