<template>
  <Teleport to="body">
    <div v-if="isTourActive" class="tour-guide-container">
      <!-- Spotlight Mask Overlay -->
      <TourOverlay
        ref="overlayRef"
        :target-selector="currentTargetSelector"
        @overlay-click="handleOverlayClick"
        @target-found="onTargetFound"
        @target-missing="onTargetMissing"
      />

      <!-- Floating Step Tooltip -->
      <TourTooltip
        :step="currentStep"
        :step-index="currentStepIndex"
        :total-steps="totalSteps"
        :progress-pct="progressPct"
        :target-rect="activeTargetRect"
        :is-first-step="isFirstStep"
        :is-last-step="isLastStep"
        @next="nextStep"
        @prev="prevStep"
        @skip="skipTour"
        @finish="finishTour"
      />
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useTourGuide } from '../../composables/useTourGuide.js';
import TourOverlay from './TourOverlay.vue';
import TourTooltip from './TourTooltip.vue';

const {
  isTourActive,
  currentStep,
  currentStepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  progressPct,
  nextStep,
  prevStep,
  skipTour,
  finishTour
} = useTourGuide();

const overlayRef = ref(null);
const activeTargetRect = ref(null);

const currentTargetSelector = computed(() => {
  return currentStep.value?.targetSelector || '';
});

function onTargetFound(rect) {
  activeTargetRect.value = rect;
}

function onTargetMissing() {
  activeTargetRect.value = null;
}

function handleOverlayClick() {
  // Clicking outside tooltip advances to next step
  nextStep();
}

function handleKeyDown(event) {
  if (!isTourActive.value) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    skipTour();
  } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
    event.preventDefault();
    nextStep();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    prevStep();
  }
}

watch(isTourActive, (active) => {
  if (active) {
    window.addEventListener('keydown', handleKeyDown);
  } else {
    window.removeEventListener('keydown', handleKeyDown);
  }
});

onMounted(() => {
  if (isTourActive.value) {
    window.addEventListener('keydown', handleKeyDown);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.tour-guide-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  pointer-events: none;
}
</style>
