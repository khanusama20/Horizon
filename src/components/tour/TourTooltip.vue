<template>
  <div
    class="tour-tooltip-card shadow-lg"
    :style="tooltipPositionStyle"
    role="dialog"
    aria-modal="true"
    :aria-label="step.title"
  >
    <!-- Top Progress Bar Line -->
    <div class="tour-progress-track">
      <div class="tour-progress-fill" :style="{ width: `${progressPct}%` }" />
    </div>

    <!-- Header: Category Chip + Step Count + Close (X) -->
    <div class="d-flex align-center justify-space-between pa-4 pb-2">
      <div class="d-flex align-center gap-2">
        <span class="tour-category-tag font-weight-bold text-uppercase">
          {{ step.category || 'Guide' }}
        </span>
        <span class="text-caption font-weight-bold text-medium-emphasis">
          Step {{ stepIndex + 1 }} of {{ totalSteps }}
        </span>
      </div>

      <button
        type="button"
        class="tour-close-x-btn"
        aria-label="Skip and close guided tour"
        title="Skip tour"
        @click="$emit('skip')"
      >
        <i class="mdi mdi-close" style="font-size: 18px;"></i>
      </button>
    </div>

    <!-- Body: Heading, Subtitle & Explanatory Description -->
    <div class="px-4 pb-4">
      <h3 class="text-h6 font-weight-bold text-primary-text mb-0 line-height-tight">
        {{ step.title }}
      </h3>
      <div v-if="step.subtitle" class="text-caption font-weight-medium text-primary mb-2">
        {{ step.subtitle }}
      </div>

      <p class="text-body-2 text-medium-emphasis mb-0 line-height-relaxed">
        {{ step.description }}
      </p>
    </div>

    <!-- Footer: Navigation Buttons -->
    <div class="d-flex align-center justify-space-between px-4 py-3 bg-surface-variant border-t rounded-b-xl gap-2">
      <button
        type="button"
        class="tour-skip-btn text-caption font-weight-medium"
        aria-label="Skip tour"
        @click="$emit('skip')"
      >
        Skip Tour
      </button>

      <div class="d-flex align-center gap-2 ms-auto">
        <button
          v-if="!isFirstStep"
          type="button"
          class="tour-nav-prev-btn text-caption font-weight-medium"
          aria-label="Go to previous step"
          @click="$emit('prev')"
        >
          <i class="mdi mdi-chevron-left me-0.5" style="font-size: 16px;"></i>
          Previous
        </button>

        <button
          type="button"
          class="tour-nav-next-btn text-caption font-weight-bold shadow-orange"
          :aria-label="isLastStep ? 'Finish guided tour' : 'Go to next step'"
          @click="isLastStep ? $emit('finish') : $emit('next')"
        >
          <span>{{ isLastStep ? 'Finish Tour' : 'Next Step' }}</span>
          <i :class="isLastStep ? 'mdi mdi-check-circle-outline ms-1' : 'mdi mdi-chevron-right ms-1'" style="font-size: 16px;"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  step: {
    type: Object,
    required: true
  },
  stepIndex: {
    type: Number,
    required: true
  },
  totalSteps: {
    type: Number,
    required: true
  },
  progressPct: {
    type: Number,
    default: 0
  },
  targetRect: {
    type: Object,
    default: null
  },
  isFirstStep: {
    type: Boolean,
    default: false
  },
  isLastStep: {
    type: Boolean,
    default: false
  }
});

defineEmits(['next', 'prev', 'skip', 'finish']);

const tooltipPositionStyle = computed(() => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const cardWidth = isMobile ? Math.min(window.innerWidth - 32, 380) : 420;

  // 1. Mobile screen behavior: dock gracefully at bottom center
  if (isMobile) {
    return {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: `${cardWidth}px`,
      maxWidth: 'calc(100vw - 32px)',
      zIndex: 9999
    };
  }

  // 2. Missing target or fallback: center in viewport
  if (!props.targetRect) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${cardWidth}px`,
      zIndex: 9999
    };
  }

  // 3. Desktop positioning relative to target element
  const rect = props.targetRect;
  const placement = props.step.placement || 'bottom';
  const margin = 16;

  let left = rect.x + (rect.width / 2) - (cardWidth / 2);
  // Clamp left within viewport margins
  left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, left));

  let top = 0;
  if (placement === 'top') {
    // Position above target
    top = Math.max(16, rect.y - 240);
  } else {
    // Position below target
    top = Math.min(window.innerHeight - 260, rect.bottom + margin);
  }

  return {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${cardWidth}px`,
    zIndex: 9999
  };
});
</script>

<style scoped>
.tour-tooltip-card {
  background-color: var(--color-surface-card) !important;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(41, 37, 31, 0.18), 0 4px 12px rgba(41, 37, 31, 0.08);
  overflow: hidden;
  animation: tooltip-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes tooltip-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.tour-progress-track {
  width: 100%;
  height: 3px;
  background-color: var(--color-border);
}

.tour-progress-fill {
  height: 100%;
  background-color: var(--color-primary-orange);
  transition: width 0.3s ease;
}

.tour-category-tag {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: var(--color-soft-orange);
  color: var(--color-primary-orange);
}

.tour-close-x-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.tour-close-x-btn:hover {
  background-color: rgba(41, 37, 31, 0.06);
  color: var(--color-text-primary);
}

.tour-skip-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.tour-skip-btn:hover {
  color: var(--color-text-primary);
  text-decoration: underline;
}

.tour-nav-prev-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  background-color: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tour-nav-prev-btn:hover {
  background-color: rgba(41, 37, 31, 0.04);
}

.tour-nav-next-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 8px;
  background-color: var(--color-primary-orange);
  color: #FFFFFF;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tour-nav-next-btn:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
}
</style>
