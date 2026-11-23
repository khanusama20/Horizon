/**
 * Horizon Interactive Tour Guide Composable
 * Manages tour state machine, step progression, and LocalStorage persistence.
 * States:
 *   - 'invitation_pending': New user invitation banner displayed below toolbar
 *   - 'tour_in_progress': Interactive step-by-step tour active
 *   - 'tour_completed': Tour finished or skipped; banner hidden on future visits
 *   - 'invitation_dismissed': User chose "I'll Explore Myself"; banner hidden
 */

import { ref, computed } from 'vue';
import { TOUR_STEPS } from '../services/tourSteps.js';

export const TOUR_STORAGE_KEY = 'horizon_v1_tour_state';

export const TOUR_STATES = {
  INVITATION_PENDING: 'invitation_pending',
  TOUR_IN_PROGRESS: 'tour_in_progress',
  TOUR_COMPLETED: 'tour_completed',
  INVITATION_DISMISSED: 'invitation_dismissed'
};

// Singleton reactive state shared across all components
const tourState = ref(TOUR_STATES.INVITATION_PENDING);
const currentStepIndex = ref(0);
const isInitialized = ref(false);

/**
 * Initializes state safely from LocalStorage
 */
export function initTourState() {
  if (isInitialized.value) return;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(TOUR_STORAGE_KEY);
      if (stored && Object.values(TOUR_STATES).includes(stored)) {
        // If it was left mid-tour, resume as pending so user isn't startled by an overlay on page load
        if (stored === TOUR_STATES.TOUR_IN_PROGRESS) {
          tourState.value = TOUR_STATES.INVITATION_PENDING;
        } else {
          tourState.value = stored;
        }
      } else {
        tourState.value = TOUR_STATES.INVITATION_PENDING;
      }
    }
  } catch {
    tourState.value = TOUR_STATES.INVITATION_PENDING;
  }

  isInitialized.value = true;
}

/**
 * Persists tour state to LocalStorage
 * @param {string} newState
 */
function persistTourState(newState) {
  tourState.value = newState;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TOUR_STORAGE_KEY, newState);
    }
  } catch {
    // Ignore LocalStorage quota/restricted errors
  }
}

export function useTourGuide() {
  initTourState();

  const isTourActive = computed(() => tourState.value === TOUR_STATES.TOUR_IN_PROGRESS);
  const showInvitation = computed(() => tourState.value === TOUR_STATES.INVITATION_PENDING);
  const totalSteps = computed(() => TOUR_STEPS.length);
  const currentStep = computed(() => TOUR_STEPS[currentStepIndex.value] || TOUR_STEPS[0]);
  const isFirstStep = computed(() => currentStepIndex.value === 0);
  const isLastStep = computed(() => currentStepIndex.value === TOUR_STEPS.length - 1);
  const progressPct = computed(() => Math.round(((currentStepIndex.value + 1) / TOUR_STEPS.length) * 100));

  function startTour() {
    currentStepIndex.value = 0;
    persistTourState(TOUR_STATES.TOUR_IN_PROGRESS);
  }

  function dismissInvitation() {
    persistTourState(TOUR_STATES.INVITATION_DISMISSED);
  }

  function nextStep() {
    if (currentStepIndex.value < TOUR_STEPS.length - 1) {
      currentStepIndex.value++;
    } else {
      finishTour();
    }
  }

  function prevStep() {
    if (currentStepIndex.value > 0) {
      currentStepIndex.value--;
    }
  }

  function goToStep(index) {
    if (index >= 0 && index < TOUR_STEPS.length) {
      currentStepIndex.value = index;
    }
  }

  function skipTour() {
    persistTourState(TOUR_STATES.TOUR_COMPLETED);
  }

  function finishTour() {
    persistTourState(TOUR_STATES.TOUR_COMPLETED);
  }

  function restartTour() {
    currentStepIndex.value = 0;
    persistTourState(TOUR_STATES.TOUR_IN_PROGRESS);
  }

  function resetTourToPending() {
    currentStepIndex.value = 0;
    persistTourState(TOUR_STATES.INVITATION_PENDING);
  }

  return {
    // State
    tourState,
    isTourActive,
    showInvitation,
    currentStepIndex,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    progressPct,
    steps: TOUR_STEPS,

    // Actions
    startTour,
    dismissInvitation,
    nextStep,
    prevStep,
    goToStep,
    skipTour,
    finishTour,
    restartTour,
    resetTourToPending,
    resetTour: resetTourToPending
  };
}
