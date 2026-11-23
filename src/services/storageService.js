/**
 * Horizon LocalStorage Persistence Service
 * Implements versioned client-side storage (horizon_v1_*) with safe hydration,
 * schema migration scaffolding, and quota/corruption error boundaries.
 */

export const STORAGE_KEYS = {
  SCHEMA_META: 'horizon_v1_schema_meta',
  GOAL: 'horizon_v1_goal',
  SETTINGS: 'horizon_v1_settings'
};

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Creates default goal data structure conforming to DATABASE_AND_DATA_MODELS.md
 * @returns {object} Default empty goal object
 */
export function createDefaultGoal() {
  return {
    id: `goal-${Date.now()}`,
    title: '',
    description: '',
    category: 'Learning',
    targetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    totalDays: 15,
    templateId: 'alpine-peak',
    exportPreset: 'MOBILE_1080x1920',
    courseMetadata: null,
    milestones: [],
    streakDays: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Creates default user application settings
 * @returns {object} Default settings
 */
export function createDefaultSettings() {
  return {
    theme: 'dark',
    defaultExportFormat: 'MOBILE_1080x1920',
    showSafeZones: true,
    lastExportedAt: null
  };
}

export const storageService = {
  /**
   * Checks if LocalStorage is available and writable in the current environment
   * @returns {boolean}
   */
  isAvailable() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__horizon_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Initializes storage metadata and ensures schema integrity
   * @returns {{ success: boolean, initialized: boolean, version: number, error?: string }}
   */
  initStorage() {
    if (!this.isAvailable()) {
      return { success: false, initialized: false, version: 0, error: 'LocalStorage is unavailable or disabled' };
    }

    try {
      const metaRaw = window.localStorage.getItem(STORAGE_KEYS.SCHEMA_META);
      let meta = null;

      if (metaRaw) {
        try {
          meta = JSON.parse(metaRaw);
        } catch {
          // Corrupted meta: reinitialize
          meta = null;
        }
      }

      if (!meta || typeof meta.version !== 'number') {
        const newMeta = {
          version: CURRENT_SCHEMA_VERSION,
          initializedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        window.localStorage.setItem(STORAGE_KEYS.SCHEMA_META, JSON.stringify(newMeta));

        if (!window.localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
          window.localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(createDefaultSettings()));
        }

        return { success: true, initialized: true, version: CURRENT_SCHEMA_VERSION };
      }

      return { success: true, initialized: false, version: meta.version };
    } catch (err) {
      return { success: false, initialized: false, version: 0, error: err.message };
    }
  },

  /**
   * Loads the current active goal from LocalStorage
   * @returns {{ success: boolean, data: object|null, error?: string, wasCorrupted?: boolean }}
   */
  loadGoal() {
    if (!this.isAvailable()) {
      return { success: false, data: null, error: 'LocalStorage unavailable' };
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.GOAL);
      if (!raw) {
        return { success: true, data: null };
      }

      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !parsed.id) {
          // Corrupted data structure
          return { success: false, data: null, wasCorrupted: true, error: 'Corrupted goal structure' };
        }
        return { success: true, data: parsed };
      } catch {
        // Corrupted JSON syntax: fallback gracefully
        return { success: false, data: null, wasCorrupted: true, error: 'Invalid JSON in storage' };
      }
    } catch (err) {
      return { success: false, data: null, error: err.message };
    }
  },

  /**
   * Saves or replaces the current goal in LocalStorage
   * @param {object} goal - Goal data to persist
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  saveGoal(goal) {
    if (!this.isAvailable()) {
      return { success: false, error: 'LocalStorage unavailable' };
    }

    if (!goal || typeof goal !== 'object') {
      return { success: false, error: 'Invalid goal object' };
    }

    try {
      const payload = {
        ...goal,
        updatedAt: new Date().toISOString()
      };

      window.localStorage.setItem(STORAGE_KEYS.GOAL, JSON.stringify(payload));
      return { success: true, data: payload };
    } catch (err) {
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        return { success: false, error: 'LocalStorage quota exceeded' };
      }
      return { success: false, error: err.message };
    }
  },

  /**
   * Updates partial fields of the active goal
   * @param {object} partial - Partial fields to merge
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  updateGoal(partial) {
    const currentResult = this.loadGoal();
    if (!currentResult.success && !currentResult.data) {
      return { success: false, error: currentResult.error || 'Failed to load goal before update' };
    }

    const currentGoal = currentResult.data || createDefaultGoal();
    const updated = {
      ...currentGoal,
      ...partial,
      updatedAt: new Date().toISOString()
    };

    return this.saveGoal(updated);
  },

  /**
   * Deletes the active goal from LocalStorage
   * @returns {{ success: boolean, error?: string }}
   */
  deleteGoal() {
    if (!this.isAvailable()) {
      return { success: false, error: 'LocalStorage unavailable' };
    }

    try {
      window.localStorage.removeItem(STORAGE_KEYS.GOAL);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Loads application settings
   * @returns {object}
   */
  getSettings() {
    if (!this.isAvailable()) {
      return createDefaultSettings();
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) return createDefaultSettings();
      return { ...createDefaultSettings(), ...JSON.parse(raw) };
    } catch {
      return createDefaultSettings();
    }
  },

  /**
   * Saves application settings
   * @param {object} settings
   * @returns {{ success: boolean, error?: string }}
   */
  saveSettings(settings) {
    if (!this.isAvailable()) {
      return { success: false, error: 'LocalStorage unavailable' };
    }

    try {
      window.localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Clears all horizon_v1_* keys (useful for testing or full reset)
   */
  clearAll() {
    if (!this.isAvailable()) return;
    Object.values(STORAGE_KEYS).forEach(k => {
      window.localStorage.removeItem(k);
    });
  }
};
