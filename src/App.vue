<template>
  <v-app class="horizon-app-root">
    <!-- App Navigation Header -->
    <AppHeader
      :storage-status="storageStatus"
      :is-demo-mode="isDemoMode"
      :current-view="currentView"
      @start-demo="handleStartDemo"
      @exit-demo="handleExitDemo"
      @reset-goal="showResetDialog = true"
      @open-preview="openMobilePreview"
      @back-to-dashboard="handleBackToDashboard"
    />

    <!-- Main Workspace Container: View-Switching between Dashboard & Mobile Preview -->
    <v-main class="bg-background studio-main-wrapper">
      <Transition name="view-fade" mode="out-in">
        <!-- ======================================================== -->
        <!-- VIEW A: MAIN DASHBOARD (Goal Management & Progress)      -->
        <!-- ======================================================== -->
        <div
          v-if="currentView === 'dashboard'"
          key="dashboard-view"
          ref="dashboardScrollContainer"
          class="dashboard-scroll-container"
        >
          <div class="dashboard-content-wrapper">
            <!-- Error & Storage Warnings -->
            <v-alert
              v-if="storageStatus.hasCorruptedData"
              type="warning"
              variant="tonal"
              closable
              class="mb-4"
              title="Storage Recovery Notice"
              text="Corrupted data was detected in your browser storage and was safely re-initialized."
            />

            <v-alert
              v-if="!storageStatus.isSupported"
              type="error"
              variant="tonal"
              class="mb-4"
              title="LocalStorage Unavailable"
              text="Your browser has LocalStorage disabled or is in restricted private mode."
            />

            <!-- 1. First-Time User Onboarding & Value Proposition Hero -->
            <v-sheet
              v-if="showIntroBanner && !isDemoMode"
              color="surface"
              class="intro-hero-banner pa-4 rounded-xl mb-5 border"
            >
              <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-3">
                <div class="section-header-row flex-grow-1 me-2 min-w-0">
                  <v-avatar color="primary" size="36" class="shadow-orange flex-shrink-0">
                    <v-icon icon="mdi-compass-outline" color="white" size="20" />
                  </v-avatar>
                  <div class="section-header-content min-w-0">
                    <h1 class="section-header-title text-wrap">
                      Turn Your Deadlines Into Daily Motivation
                    </h1>
                    <p class="section-header-subtitle text-wrap">
                      Plan your progress. Celebrate every milestone. Keep your goal in sight on your phone & desktop.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Visual Stepper: 4-Step Guided Roadmap -->
              <VisualStepper :active-step="currentWorkflowStep" class="mt-2" />
            </v-sheet>

            <!-- 2. Goal Creation Form & Course Ingestion -->
            <GoalForm
              :goal="goal"
              @save-goal="persistNow"
              @plan-generated="persistNow"
            />

            <!-- 4. Interactive Milestone Roadmap Checklist -->
            <MilestoneList
              :milestones="goal.milestones || []"
              @update:milestones="handleUpdateMilestones"
              @regenerate-plan="handleRegeneratePlan"
            />

            <!-- 5. Gamified Nature Achievement Badges Showcase -->
            <BadgeShowcase
              :milestones="goal.milestones || []"
            />

            <!-- 6. Nature Themes Selector -->
            <ThemeSelector
              v-model="goal.templateId"
            />

            <!-- 7. Dedicated Mobile Wallpaper Preview Launcher Card -->
            <DashboardPreviewCard
              :goal="goal"
              @open-preview="openMobilePreview"
            />

            <!-- 8. Complete Wallpaper Export Controls (Preset, Safe Zones & Download) -->
            <WallpaperExportControls
              :goal="goal"
              :preset="currentPreset"
              :show-safe-zones="showSafeZones"
              @update:preset="currentPreset = $event"
              @update:show-safe-zones="showSafeZones = $event"
            />

            <!-- 9. Collapsible Developer Diagnostics & LocalStorage Inspector -->
            <v-expansion-panels class="mb-5">
              <v-expansion-panel color="surface" class="border">
                <v-expansion-panel-title class="py-2 px-4">
                  <div class="section-header-row">
                    <v-icon icon="mdi-code-json" color="primary" size="20" class="flex-shrink-0" />
                    <span class="text-caption font-weight-bold text-primary-text">Technical Diagnostics & LocalStorage Inspector</span>
                    <v-chip size="x-small" color="primary" variant="tonal" class="ms-1">
                      {{ isDemoMode ? 'Demo Mode Active' : 'Auto-Sync' }}
                    </v-chip>
                  </div>
                </v-expansion-panel-title>

                <v-expansion-panel-text class="px-4 pb-4">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <span class="text-caption font-weight-bold text-primary-text">Active Reactive State:</span>
                    <span class="text-caption text-medium-emphasis">Key: horizon_v1_goal</span>
                  </div>
                  <div class="bg-surface-variant pa-3 rounded text-caption font-mono overflow-auto max-h-200 border">
                    <pre>{{ formattedJson }}</pre>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <!-- Dashboard Footer Note -->
            <div class="d-flex flex-wrap justify-space-between align-center pt-2 pb-4 text-caption text-disabled border-top-subtle">
              <span>Horizon • 100% Client-Side LocalStorage</span>
              <span>Plan your progress. Keep your goal in sight.</span>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- VIEW B: DEDICATED FULL-SCREEN MOBILE WALLPAPER PREVIEW   -->
        <!-- ======================================================== -->
        <MobileWallpaperPreviewPage
          v-else-if="currentView === 'preview'"
          key="mobile-preview-view"
          :goal="goal"
          @back="handleBackToDashboard"
        />
      </Transition>
    </v-main>

    <!-- Reset Confirmation Dialog -->
    <v-dialog v-model="showResetDialog" max-width="420">
      <v-card color="surface" class="pa-4">
        <v-card-item class="px-2 pb-3 pt-1">
          <template #prepend>
            <v-avatar color="error" variant="tonal" size="36" class="me-3">
              <v-icon icon="mdi-alert-circle-outline" color="error" size="20" />
            </v-avatar>
          </template>
          <v-card-title class="section-header-title text-h6 font-weight-bold">
            Reset Active Goal?
          </v-card-title>
          <v-card-subtitle class="section-header-subtitle text-caption text-medium-emphasis">
            This action cannot be undone.
          </v-card-subtitle>
        </v-card-item>
        <v-card-text class="text-medium-emphasis px-2 py-2">
          This will clear the current goal from your browser LocalStorage and reset Horizon to a clean slate.
        </v-card-text>
        <v-card-actions class="px-2 pb-2 pt-2 gap-2">
          <v-spacer />
          <v-btn variant="text" color="medium-emphasis" @click="showResetDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="handleConfirmReset">Reset Goal</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Studio Quick Feedback Snackbar -->
    <v-snackbar
      v-model="studioSnackbar.show"
      :color="studioSnackbar.color"
      :timeout="4000"
      location="bottom right"
    >
      {{ studioSnackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="studioSnackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import AppHeader from './components/layout/AppHeader.vue';
import VisualStepper from './components/layout/VisualStepper.vue';
import GoalForm from './components/goals/GoalForm.vue';
import MilestoneList from './components/milestones/MilestoneList.vue';
import BadgeShowcase from './components/milestones/BadgeShowcase.vue';
import ThemeSelector from './components/wallpaper/ThemeSelector.vue';
import DashboardPreviewCard from './components/wallpaper/DashboardPreviewCard.vue';
import MobileWallpaperPreviewPage from './components/wallpaper/MobileWallpaperPreviewPage.vue';
import WallpaperExportControls from './components/wallpaper/WallpaperExportControls.vue';
import DemoPresentationMode from './components/demo/DemoPresentationMode.vue';
import { generateMilestonePlan } from './services/milestoneEngine.js';
import { createDemoGoal } from './services/demoDataService.js';
import {
  wallpaperExportService,
  generateWallpaperFilename
} from './services/wallpaperExportService.js';
import { useStorage } from './composables/useStorage.js';

const {
  goal,
  storageStatus,
  isDemoMode,
  persistNow,
  resetGoal,
  enterDemoMode,
  exitDemoMode
} = useStorage();

// View switching state ('dashboard' | 'preview')
const currentView = ref('dashboard');
const dashboardScrollContainer = ref(null);
let savedScrollTop = 0;

const showIntroBanner = ref(true);
const showResetDialog = ref(false);
const currentPreset = ref('MOBILE');
const showSafeZones = ref(false);
const activeDemoStepId = ref(null);

const currentWorkflowStep = computed(() => {
  if (isDemoMode.value && activeDemoStepId.value) {
    if (activeDemoStepId.value === 'step-goal') return 1;
    if (activeDemoStepId.value === 'step-milestones') return 2;
    if (activeDemoStepId.value === 'step-badges') return 3;
    return 4;
  }

  // Standard user journey progression:
  if (!goal.value?.title || !goal.value?.courseSections?.length) {
    return 1;
  }
  if (!goal.value?.milestones || goal.value.milestones.length === 0) {
    return 2;
  }
  const completedCount = goal.value.milestones.filter(m => m.completed).length;
  if (completedCount === goal.value.milestones.length && goal.value.milestones.length > 0) {
    return 4;
  }
  return 3;
});

const studioSnackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const formattedJson = computed(() => {
  return JSON.stringify(goal.value, null, 2);
});

const expectedFilename = computed(() => {
  return generateWallpaperFilename(goal.value, goal.value?.templateId, currentPreset.value);
});

function handleStartDemo() {
  const demoGoal = createDemoGoal();
  activeDemoStepId.value = 'step-goal';
  enterDemoMode(demoGoal);
}

function handleExitDemo() {
  activeDemoStepId.value = null;
  exitDemoMode();
}

function handleResetDemo() {
  const demoGoal = createDemoGoal();
  activeDemoStepId.value = 'step-goal';
  enterDemoMode(demoGoal);
}

function handleStepChanged(step) {
  activeDemoStepId.value = step?.id || null;
}

function handleUpdateMilestones(updatedMilestones) {
  goal.value.milestones = updatedMilestones;
  persistNow();
}

function handleRegeneratePlan() {
  goal.value.milestones = generateMilestonePlan(goal.value);
  persistNow();
}

function handleConfirmReset() {
  resetGoal();
  showResetDialog.value = false;
}

function openMobilePreview() {
  if (dashboardScrollContainer.value) {
    savedScrollTop = dashboardScrollContainer.value.scrollTop;
  } else if (typeof window !== 'undefined') {
    savedScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  }
  currentView.value = 'preview';
}

function handleBackToDashboard() {
  currentView.value = 'dashboard';
  nextTick(() => {
    if (dashboardScrollContainer.value) {
      dashboardScrollContainer.value.scrollTop = savedScrollTop;
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: savedScrollTop, behavior: 'instant' });
    }
  });
}
</script>

<style scoped>
.horizon-app-root {
  min-height: 100vh;
  min-height: 100dvh;
  background-color: var(--color-bg-page) !important;
  color: var(--color-text-primary) !important;
  overflow: hidden;
}

.studio-main-wrapper {
  height: calc(100vh - 64px);
  height: calc(100dvh - 64px);
  background-color: var(--color-bg-page) !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Dashboard Scroll Container */
.dashboard-scroll-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--color-bg-page);
}

.dashboard-content-wrapper {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  width: 100%;
}

/* View Transition: Smooth Subtle Slide & Fade */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.view-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Intro Hero Banner */
.intro-hero-banner {
  background: linear-gradient(135deg, #FFFDF8 0%, #FDF6EE 100%) !important;
  border: 1.5px solid #FCE8D8 !important;
  box-shadow: 0 4px 14px rgba(233, 120, 36, 0.08);
}

.shadow-orange {
  box-shadow: 0 2px 8px rgba(233, 120, 36, 0.25);
}

.border-subtle {
  border: 1px solid var(--color-border);
}

.border-top-subtle {
  border-top: 1px solid var(--color-border);
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.line-height-tight {
  line-height: 1.2;
}

.max-h-200 {
  max-height: 200px;
}

@media (max-width: 600px) {
  .dashboard-content-wrapper {
    padding: 14px 12px 36px;
  }
  .intro-hero-banner {
    padding: 12px !important;
  }
}
</style>
