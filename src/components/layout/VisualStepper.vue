<template>
  <div
    class="visual-stepper-container"
    role="region"
    aria-label="Workflow progress guide"
  >
    <div class="visual-stepper" role="group" aria-label="Visual workflow roadmap">
      <div
        v-for="(step, idx) in steps"
        :key="step.number"
        class="stepper-step"
        :class="{
          'is-active': step.number === activeStep,
          'is-completed': step.number < activeStep,
          'is-upcoming': step.number > activeStep
        }"
        :data-testid="`stepper-step-${step.number}`"
      >
        <div class="stepper-track-row">
          <!-- Leading connecting line (hidden on first step) -->
          <div
            class="stepper-line stepper-line-start"
            :class="{
              'stepper-line--filled': step.number <= activeStep,
              'is-hidden': idx === 0
            }"
          />

          <!-- Step indicator circle with number -->
          <div
            class="stepper-circle"
            :class="{
              'stepper-circle--active': step.number === activeStep,
              'stepper-circle--completed': step.number < activeStep,
              'stepper-circle--upcoming': step.number > activeStep
            }"
            :aria-current="step.number === activeStep ? 'step' : undefined"
          >
            <span class="stepper-circle-number">{{ step.number }}</span>
          </div>

          <!-- Trailing connecting line (hidden on last step) -->
          <div
            class="stepper-line stepper-line-end"
            :class="{
              'stepper-line--filled': step.number < activeStep,
              'is-hidden': idx === steps.length - 1
            }"
          />
        </div>

        <!-- Step content labels -->
        <div class="stepper-content">
          <div class="stepper-title">{{ step.title }}</div>
          <div v-if="step.caption" class="stepper-caption">{{ step.caption }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeStep: {
    type: Number,
    default: 1,
    validator: (val) => val >= 1
  },
  steps: {
    type: Array,
    default: () => [
      {
        number: 1,
        title: 'Curriculum',
        caption: 'Input goal or paste course URL.'
      },
      {
        number: 2,
        title: 'Paced Plan',
        caption: 'Distributes modules evenly to deadline.'
      },
      {
        number: 3,
        title: 'Badges',
        caption: 'Unlock 5 nature badges as you achieve.'
      },
      {
        number: 4,
        title: 'Wallpaper',
        caption: 'Export static PNG with countdown HUD.'
      }
    ]
  }
});
</script>

<style scoped>
.visual-stepper-container {
  width: 100%;
  pointer-events: none !important;
  user-select: none !important;
}

.visual-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  position: relative;
  padding: 6px 0 2px;
}

.stepper-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
  position: relative;
}

.stepper-track-row {
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  position: relative;
}

.stepper-line {
  flex: 1;
  height: 2px;
  background-color: var(--color-border, #E7DED0);
  transition: background-color 0.25s ease;
}

.stepper-line--filled {
  background-color: var(--color-primary-orange, #E97824);
}

.stepper-line.is-hidden {
  visibility: hidden;
  opacity: 0;
}

.stepper-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
  transition: all 0.25s ease;
  z-index: 2;
  box-sizing: border-box;
}

.stepper-circle-number {
  font-family: inherit;
  display: inline-block;
  line-height: 1;
}

/* Active / Current Step */
.stepper-circle--active {
  background-color: var(--color-primary-orange, #E97824);
  color: #FFFFFF;
  border: 2px solid var(--color-primary-orange, #E97824);
  box-shadow: 0 2px 8px rgba(233, 120, 36, 0.35);
}

/* Completed Steps */
.stepper-circle--completed {
  background-color: var(--color-soft-orange, #FCE8D8);
  color: var(--color-primary-orange, #E97824);
  border: 2px solid var(--color-primary-orange, #E97824);
}

/* Upcoming / Neutral Steps */
.stepper-circle--upcoming {
  background-color: var(--color-surface-card, #FFFDF8);
  color: var(--color-text-secondary, #756D62);
  border: 1.5px solid var(--color-border, #E7DED0);
}

.stepper-content {
  margin-top: 6px;
  width: 100%;
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stepper-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-primary, #29251F);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.is-active .stepper-title {
  color: var(--color-primary-orange, #E97824);
  font-weight: 700;
}

.is-completed .stepper-title {
  color: var(--color-text-primary, #29251F);
  font-weight: 600;
}

.stepper-caption {
  font-size: 0.7rem;
  color: var(--color-text-secondary, #756D62);
  line-height: 1.3;
  margin-top: 2px;
  max-width: 130px;
}

/* Responsive Breakpoints */
@media (max-width: 600px) {
  .visual-stepper {
    padding: 4px 0 0;
  }

  .stepper-track-row {
    height: 26px;
  }

  .stepper-circle {
    width: 26px;
    height: 26px;
    font-size: 0.75rem;
  }

  .stepper-content {
    margin-top: 4px;
    padding: 0 2px;
  }

  .stepper-title {
    font-size: 0.6875rem;
    letter-spacing: -0.01em;
  }

  /* Suppress long secondary descriptions on small mobile viewports to prevent awkward multiline wrapping */
  .stepper-caption {
    display: none;
  }
}
</style>
