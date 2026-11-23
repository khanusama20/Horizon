<template>
  <v-sheet
    color="surface"
    class="demo-presentation-banner pa-4 rounded-xl mb-5 border"
  >
    <!-- Top Action Bar -->
    <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-3">
      <!-- Status Badge & Mode Title -->
      <div class="d-flex align-center flex-wrap gap-2">
        <v-chip
          color="primary"
          variant="flat"
          size="small"
          class="font-weight-bold text-uppercase px-3"
        >
          <v-icon icon="mdi-presentation" start size="16" />
          Contest Presentation Mode
        </v-chip>

        <span class="text-subtitle-2 font-weight-bold text-primary-text d-none d-md-inline">
          Live Contest Evaluation Walkthrough
        </span>

        <v-chip
          size="x-small"
          color="success"
          variant="tonal"
          class="font-weight-medium"
        >
          100% Offline • User Data Protected
        </v-chip>
      </div>

      <!-- Demo Control Actions -->
      <div class="d-flex align-center gap-2 ms-auto">
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-refresh"
          class="font-weight-bold"
          @click="$emit('reset-demo')"
        >
          Reset Demo State
        </v-btn>

        <v-btn
          size="small"
          variant="flat"
          color="error"
          prepend-icon="mdi-exit-to-app"
          class="font-weight-bold"
          @click="$emit('exit-demo')"
        >
          Exit Demo Mode
        </v-btn>
      </div>
    </div>

    <!-- Active Step Description Callout -->
    <v-sheet
      color="surface-variant"
      class="pa-3 rounded-lg mb-3 d-flex align-center justify-space-between flex-wrap gap-3 border"
    >
      <div class="section-header-row flex-grow-1 me-2">
        <v-avatar color="primary" size="32" class="flex-shrink-0">
          <v-icon :icon="currentStepData.icon" color="white" size="18" />
        </v-avatar>
        <div class="section-header-content">
          <div class="d-flex align-center gap-2 mb-1">
            <span class="text-caption font-weight-bold text-primary text-uppercase">
              {{ currentStepData.badge }}
            </span>
            <span class="text-subtitle-2 font-weight-bold text-primary-text">
              {{ currentStepData.title }}
            </span>
          </div>
          <p class="text-caption text-medium-emphasis mb-0">
            {{ currentStepData.description }}
          </p>
        </div>
      </div>

      <!-- Step Navigation Buttons -->
      <div class="d-flex align-center gap-1 ms-auto">
        <v-btn
          size="x-small"
          variant="text"
          color="primary"
          icon="mdi-chevron-left"
          :disabled="activeStepIndex === 0"
          @click="prevStep"
        />
        <span class="text-caption font-weight-bold text-primary-text px-2">
          {{ activeStepIndex + 1 }} / {{ steps.length }}
        </span>
        <v-btn
          size="x-small"
          variant="text"
          color="primary"
          icon="mdi-chevron-right"
          :disabled="activeStepIndex === steps.length - 1"
          @click="nextStep"
        />
      </div>
    </v-sheet>

    <!-- 6-Step Presentation Quick Jump Tabs -->
    <div class="d-flex flex-wrap gap-2">
      <v-btn
        v-for="(st, idx) in steps"
        :key="st.id"
        size="small"
        :variant="activeStepIndex === idx ? 'flat' : 'outlined'"
        :color="activeStepIndex === idx ? 'primary' : 'secondary'"
        :class="['step-pill text-caption font-weight-medium flex-grow-1', activeStepIndex === idx ? 'text-white' : 'text-primary-text']"
        @click="goToStep(idx)"
      >
        <v-icon :icon="st.icon" start size="14" />
        {{ idx + 1 }}. {{ st.title }}
      </v-btn>
    </div>
  </v-sheet>
</template>

<script setup>
import { ref, computed } from 'vue';
import { DEMO_GUIDED_STEPS } from '../../services/demoDataService.js';

const emit = defineEmits(['exit-demo', 'reset-demo', 'step-changed']);

const steps = DEMO_GUIDED_STEPS;
const activeStepIndex = ref(0);

const currentStepData = computed(() => {
  return steps[activeStepIndex.value] || steps[0];
});

function goToStep(index) {
  if (index < 0 || index >= steps.length) return;
  activeStepIndex.value = index;
  const target = steps[index];
  emit('step-changed', target);

  // Smoothly scroll target section into view if available
  if (typeof document !== 'undefined') {
    const el = document.getElementById(target.targetSectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('demo-step-active');
      setTimeout(() => {
        el.classList.remove('demo-step-active');
      }, 2200);
    }
  }
}

function nextStep() {
  if (activeStepIndex.value < steps.length - 1) {
    goToStep(activeStepIndex.value + 1);
  }
}

function prevStep() {
  if (activeStepIndex.value > 0) {
    goToStep(activeStepIndex.value - 1);
  }
}

defineExpose({
  goToStep,
  nextStep,
  prevStep,
  activeStepIndex
});
</script>

<style scoped>
.demo-presentation-banner {
  background: linear-gradient(135deg, #FFFDF8 0%, #FDF6EE 100%) !important;
  border: 1.5px solid var(--color-primary-orange) !important;
  box-shadow: 0 4px 16px rgba(233, 120, 36, 0.12) !important;
}

.step-pill {
  min-width: 140px;
  text-transform: none;
  letter-spacing: 0.01em;
}
</style>
