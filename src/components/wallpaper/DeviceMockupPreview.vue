<template>
  <div class="mockup-viewport-stage">
    <!-- Ambient Studio Mockup Mount (Centered, Responsive, Viewport-Aware) -->
    <div
      :class="['device-frame-wrapper', preset === 'MOBILE' ? 'mobile-mode' : 'desktop-mode']"
    >
      <Transition name="device-fade" mode="out-in">
        <!-- MOBILE SMARTPHONE FRAME (iPhone/Modern Flagship Style) -->
        <div v-if="preset === 'MOBILE'" key="mobile-frame" class="smartphone-body">
          <!-- Physical Device Bezel & Dynamic Island Notch -->
          <div class="notch-island-container">
            <div class="dynamic-island-pill" />
          </div>

          <!-- Phone Screen Glass (9:16 Aspect Ratio) -->
          <div class="phone-screen-glass">
            <canvas
              ref="canvasRef"
              class="mockup-canvas"
            />

            <!-- Home Indicator Bar -->
            <div class="home-indicator-bar" />
          </div>
        </div>

        <!-- DESKTOP MONITOR FRAME (Studio Display Style) -->
        <div v-else key="desktop-frame" class="desktop-monitor-body d-flex flex-column align-center">
          <!-- Monitor Display Bezel (16:9 Aspect Ratio) -->
          <div class="monitor-bezel">
            <!-- Web Camera Dot -->
            <div class="webcam-indicator" />

            <!-- Monitor Screen Glass -->
            <div class="monitor-screen-glass">
              <canvas
                ref="canvasRef"
                class="mockup-canvas"
              />
            </div>

            <!-- Bottom Chin Horizon Logo Accent -->
            <div class="monitor-chin d-flex justify-center align-center">
              <div class="chin-logo-dot" />
            </div>
          </div>

          <!-- Monitor Stand Neck & Base -->
          <div class="stand-neck" />
          <div class="stand-base" />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import { CanvasWallpaperEngine } from '../../services/CanvasWallpaperEngine.js';

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

const canvasRef = ref(null);
let currentRenderToken = 0;

/**
 * Executes canvas wallpaper render with race-condition token guard
 */
async function renderMockup() {
  const token = ++currentRenderToken;
  await nextTick();

  if (!canvasRef.value) return;

  try {
    await CanvasWallpaperEngine.waitForFonts();
    // If user clicked another theme/preset while waiting for fonts, cancel stale operation
    if (token !== currentRenderToken) return;

    await CanvasWallpaperEngine.renderWallpaper(canvasRef.value, {
      goal: props.goal,
      preset: props.preset,
      debugSafeZones: props.showSafeZones
    });
  } catch (err) {
    console.error('[DeviceMockupPreview] Render failed:', err);
  }
}

// Watch for any state mutation affecting the wallpaper
watch(
  () => [
    props.goal.title,
    props.goal.templateId,
    props.goal.totalDays,
    props.goal.targetDate,
    props.goal.category,
    props.goal.milestones,
    props.goal.customImageUrl,
    props.goal.customImage,
    props.goal.customColors,
    props.preset,
    props.showSafeZones
  ],
  () => {
    renderMockup();
  },
  { deep: true }
);

// Explicit watcher for immediate custom photo updates
watch(
  () => [props.goal?.customImageUrl, props.goal?.customImage],
  () => {
    renderMockup();
  }
);

onMounted(() => {
  renderMockup();
});

defineExpose({
  renderMockup,
  getCanvas: () => canvasRef.value
});
</script>

<style scoped>
.mockup-viewport-stage {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: transparent;
  padding: 6px;
}

.device-frame-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  max-height: 100%;
  max-width: 100%;
  min-height: 0;
}

.device-frame-wrapper.mobile-mode {
  height: 98%;
  max-height: 98%;
  width: auto;
  max-width: 98%;
  aspect-ratio: 9 / 19.5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.device-frame-wrapper.desktop-mode {
  width: 98%;
  max-width: min(720px, 98%);
  max-height: 98%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* SMARTPHONE MOCKUP STYLES */
.smartphone-body {
  position: relative;
  height: 100%;
  max-height: 100%;
  width: auto;
  aspect-ratio: 9 / 19.5;
  background: #111827;
  border-radius: min(44px, 5.6vh);
  padding: min(8px, 1vh);
  box-shadow:
    0 25px 60px -10px rgba(0, 0, 0, 0.75),
    0 0 0 2px #374151,
    0 0 0 4px #1F2937,
    0 0 0 6px #111827;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.notch-island-container {
  position: absolute;
  top: min(14px, 1.8vh);
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.dynamic-island-pill {
  width: min(84px, 26%);
  height: min(20px, 2.6vh);
  background: #000000;
  border-radius: 12px;
  box-shadow: 0 0 2px rgba(255, 255, 255, 0.15);
}

.phone-screen-glass {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: min(36px, 4.6vh);
  overflow: hidden;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-indicator-bar {
  position: absolute;
  bottom: min(8px, 1vh);
  left: 50%;
  transform: translateX(-50%);
  width: min(96px, 30%);
  height: 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 2px;
  z-index: 10;
  pointer-events: none;
}

/* DESKTOP MONITOR MOCKUP STYLES */
.desktop-monitor-body {
  width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.monitor-bezel {
  position: relative;
  width: 100%;
  background: #1E293B;
  border: 5px solid #0F172A;
  border-radius: 12px 12px 3px 3px;
  box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.7);
  padding-bottom: 2px;
}

.webcam-indicator {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #334155;
  box-shadow: 0 0 2px #06B6D4;
}

.monitor-screen-glass {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
  display: block;
}

.monitor-chin {
  height: 15px;
  background: #0F172A;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.chin-logo-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10B981;
}

.stand-neck {
  width: 36px;
  height: min(28px, 3.4vh);
  background: linear-gradient(to right, #1E293B, #334155, #1E293B);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
}

.stand-base {
  width: min(160px, 38%);
  height: 7px;
  background: #1E293B;
  border-radius: 5px 5px 2px 2px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.mockup-canvas {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

/* Device Switching Smooth Fade Transition */
.device-fade-enter-active,
.device-fade-leave-active {
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.device-fade-enter-from {
  opacity: 0;
  transform: scale(0.97);
}

.device-fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
}
</style>
