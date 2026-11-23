import { ref, watch, onMounted, getCurrentInstance } from 'vue';
import { storageService, createDefaultGoal, createDefaultSettings } from '../services/storageService.js';

/**
 * Vue 3 Composable for Horizon Reactive LocalStorage Persistence
 * Automatically synchronizes reactive goal state with versioned storage,
 * while safely isolating Contest Demo Presentation Mode to prevent overwriting user data.
 */
export function useStorage() {
  const goal = ref(createDefaultGoal());
  const settings = ref(createDefaultSettings());
  const isDemoMode = ref(false);
  let realGoalBackup = null;

  const storageStatus = ref({
    isSupported: true,
    isHydrated: false,
    hasCorruptedData: false,
    lastSavedAt: null,
    errorMessage: null
  });

  let isHydrating = false;
  let saveDebounceTimer = null;

  /**
   * Hydrates state from LocalStorage
   */
  function hydrate() {
    isHydrating = true;
    try {
      if (!storageService.isAvailable()) {
        storageStatus.value.isSupported = false;
        storageStatus.value.errorMessage = 'Browser LocalStorage is disabled or unavailable';
        isHydrating = false;
        return;
      }

      // Initialize storage metadata
      storageService.initStorage();

      // Load settings
      settings.value = storageService.getSettings();

      // Load active goal
      const result = storageService.loadGoal();
      if (result.success && result.data) {
        goal.value = result.data;
        storageStatus.value.lastSavedAt = result.data.updatedAt || null;
      } else if (result.wasCorrupted) {
        storageStatus.value.hasCorruptedData = true;
        storageStatus.value.errorMessage = 'Previous goal data was corrupted and was safely reset';
        goal.value = createDefaultGoal();
      } else {
        // No saved goal yet; use default
        goal.value = createDefaultGoal();
      }

      storageStatus.value.isHydrated = true;
    } catch (err) {
      storageStatus.value.errorMessage = err.message;
    } finally {
      isHydrating = false;
    }
  }

  /**
   * Explicitly persists current goal to LocalStorage (bypassed if in demo mode)
   */
  function persistNow() {
    // Safety guard: Demo data must NEVER overwrite real user data in LocalStorage
    if (isDemoMode.value) return;
    if (!storageStatus.value.isSupported) return;

    const result = storageService.saveGoal(goal.value);
    if (result.success) {
      storageStatus.value.lastSavedAt = result.data.updatedAt;
      storageStatus.value.errorMessage = null;
    } else {
      storageStatus.value.errorMessage = result.error || 'Failed to save goal';
    }
  }

  /**
   * Resets active goal to clean default and removes from LocalStorage
   */
  function resetGoal() {
    goal.value = createDefaultGoal();
    if (!isDemoMode.value) {
      storageService.deleteGoal();
      storageStatus.value.lastSavedAt = null;
      storageStatus.value.hasCorruptedData = false;
    }
  }

  /**
   * Activates Demo Presentation Mode: saves user data backup and switches to demo goal
   * @param {object} demoGoal - Realistic populated sample goal
   */
  function enterDemoMode(demoGoal) {
    if (!isDemoMode.value) {
      realGoalBackup = JSON.parse(JSON.stringify(goal.value));
    }
    isDemoMode.value = true;
    goal.value = JSON.parse(JSON.stringify(demoGoal));
  }

  /**
   * Exits Demo Presentation Mode: cleanly restores user's original goal data
   */
  function exitDemoMode() {
    if (realGoalBackup) {
      goal.value = JSON.parse(JSON.stringify(realGoalBackup));
      realGoalBackup = null;
    }
    isDemoMode.value = false;
    // Persist restored real data
    persistNow();
  }

  // Watch for mutations and auto-save with 250ms debounce (bypassed during demo mode)
  watch(
    goal,
    () => {
      if (isHydrating || isDemoMode.value) return;
      if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(() => {
        persistNow();
      }, 250);
    },
    { deep: true }
  );

  if (getCurrentInstance()) {
    onMounted(() => {
      hydrate();
    });
  } else {
    hydrate();
  }

  return {
    goal,
    settings,
    storageStatus,
    isDemoMode,
    hydrate,
    persistNow,
    resetGoal,
    enterDemoMode,
    exitDemoMode
  };
}
