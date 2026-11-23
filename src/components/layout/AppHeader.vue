<template>
  <v-app-bar
    color="surface"
    density="comfortable"
    border="b"
    class="px-3 px-sm-5 app-header-bar"
    elevation="0"
  >
    <!-- Brand Logo and Identity (Aligned Section Header Row) -->
    <div class="section-header-row me-3">
      <v-avatar color="primary" size="36" class="brand-avatar flex-shrink-0">
        <v-icon icon="mdi-image-filter-hdr" color="white" size="20" />
      </v-avatar>

      <div class="section-header-content">
        <div class="d-flex align-center gap-2">
          <span class="text-h6 font-weight-bold tracking-wide brand-title">Horizon</span>
          <v-chip
            size="x-small"
            color="primary"
            variant="tonal"
            class="font-weight-bold text-uppercase d-none d-sm-inline-flex"
          >
            Contest MVP
          </v-chip>
        </div>
        <span class="section-header-subtitle d-none d-sm-inline">
          Turn Your Deadlines Into Daily Motivation
        </span>
      </div>
    </div>

    <v-spacer />

    <!-- Action: Preview Wallpaper / Dashboard Switch (Flat Icon Button) -->
    <div class="d-flex align-center me-2">
      <v-tooltip location="bottom" :text="currentView !== 'preview' ? 'Preview Mobile Wallpaper' : 'Back to Dashboard'">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            variant="flat"
            color="primary"
            size="small"
            :icon="currentView !== 'preview' ? 'mdi-cellphone' : 'mdi-view-dashboard'"
            class="view-switch-btn font-weight-bold shadow-orange"
            :aria-label="currentView !== 'preview' ? 'Preview Mobile Wallpaper' : 'Back to Dashboard'"
            @click="currentView !== 'preview' ? $emit('open-preview') : $emit('back-to-dashboard')"
          />
        </template>
      </v-tooltip>
    </div>

    <!-- Server IP & API Status Badge -->
    <div class="d-none d-lg-flex align-center me-3">
      <v-tooltip location="bottom" :text="`Backend Server: ${serverStatusText} (Configured in src/config/ipConfig.js)`">
        <template #activator="{ props }">
          <v-chip
            v-bind="props"
            size="small"
            variant="tonal"
            :color="isServerOnline ? 'primary' : 'medium-emphasis'"
            class="font-weight-medium"
          >
            <v-icon
              :icon="isServerOnline ? 'mdi-server-network' : 'mdi-server-network-off'"
              start
              size="16"
            />
            {{ displayServerIp }}
          </v-chip>
        </template>
      </v-tooltip>
    </div>

    <!-- Storage Status Badge -->
    <div class="d-none d-md-flex align-center me-3">
      <v-tooltip location="bottom" text="Client-side LocalStorage is active. Zero personal data leaves your device.">
        <template #activator="{ props }">
          <v-chip
            v-bind="props"
            size="small"
            variant="tonal"
            :color="storageStatus.isSupported ? 'success' : 'error'"
            class="font-weight-medium"
          >
            <v-icon
              :icon="storageStatus.isSupported ? 'mdi-database-check-outline' : 'mdi-database-alert-outline'"
              start
              size="16"
            />
            {{ storageStatus.isSupported ? 'Local Storage' : 'Offline' }}
          </v-chip>
        </template>
      </v-tooltip>
    </div>

    <!-- Take Guided Tour Action Button -->
    <v-tooltip location="bottom" text="Take Guided Tour">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-compass-outline"
          size="small"
          variant="text"
          color="primary"
          class="me-1"
          aria-label="Take Guided Tour"
          @click="$emit('start-tour')"
        />
      </template>
    </v-tooltip>

    <!-- Quick Reset Button -->
    <v-tooltip location="bottom" text="Reset active goal to default">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-refresh"
          size="small"
          variant="text"
          color="medium-emphasis"
          @click="$emit('reset-goal')"
        />
      </template>
    </v-tooltip>
  </v-app-bar>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { IP_CONFIG, getServerBaseUrl } from '../../config/ipConfig.js';
import { checkServerHealth } from '../../services/apiClient.js';

const props = defineProps({
  storageStatus: {
    type: Object,
    required: true
  },
  isDemoMode: {
    type: Boolean,
    default: false
  },
  currentView: {
    type: String,
    default: 'dashboard'
  }
});

defineEmits(['reset-goal', 'start-demo', 'exit-demo', 'open-preview', 'back-to-dashboard', 'start-tour']);

const isServerOnline = ref(false);

const displayServerIp = computed(() => {
  return `${IP_CONFIG.serverIp}:${IP_CONFIG.serverPort}`;
});

const serverStatusText = computed(() => {
  const base = getServerBaseUrl() || 'Relative Proxy (/api)';
  return `${base} (${isServerOnline.value ? 'Online' : 'Checking / Standby'})`;
});

onMounted(async () => {
  try {
    const health = await checkServerHealth();
    isServerOnline.value = health.online;
  } catch {
    isServerOnline.value = false;
  }
});
</script>

<style scoped>
.app-header-bar {
  border-bottom: 1px solid var(--color-border) !important;
  background-color: var(--color-surface-card) !important;
}

.brand-avatar {
  background-color: var(--color-primary-orange) !important;
  box-shadow: 0 2px 6px rgba(233, 120, 36, 0.25);
}

.brand-title {
  color: var(--color-text-primary) !important;
  line-height: 1.2 !important;
}

.cursor-pointer {
  cursor: pointer;
}

.view-switch-btn {
  border-radius: 8px !important;
}
</style>
