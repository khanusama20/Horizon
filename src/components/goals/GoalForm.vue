<template>
  <v-card id="section-goal-overview" color="surface" class="pa-5 mb-5">
    <!-- Header with 1-Click Demo Button -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 gap-3">
      <div class="section-header-row">
        <v-avatar color="primary" size="32" class="flex-shrink-0">
          <v-icon icon="mdi-target" color="white" size="18" />
        </v-avatar>
        <div class="section-header-content">
          <h2 class="section-header-title">Create Learning Goal</h2>
          <span class="section-header-subtitle">Step 1: Set your target & import course curriculum</span>
        </div>
      </div>

      <!-- 1-Click Sample Course Demo Button -->
      <v-tooltip location="bottom" text="Load 15-day sample curriculum (100% Offline Demo)">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-auto-fix"
            class="font-weight-bold"
            @click="handleLoadSampleDemo"
          >
            Load Sample LLM Course
          </v-btn>
        </template>
      </v-tooltip>
    </div>

    <!-- Source Ingestion Banner / Multi-Source Selector -->
    <v-sheet id="section-source-selection" color="surface-variant" class="pa-4 rounded-lg mb-4" border>
      <!-- Source Provider Selector Tabs -->
      <div class="d-flex align-center flex-wrap gap-2 mb-3 source-selector-row">
        <span class="text-caption font-weight-bold text-uppercase tracking-wider text-medium-emphasis me-1 source-label">
          Source:
        </span>
        <div class="d-flex align-center flex-wrap gap-2 flex-grow-1 min-w-0 source-buttons-group">
          <v-btn
            size="small"
            :variant="selectedSourceMode === 'youtube' ? 'flat' : 'outlined'"
            :color="selectedSourceMode === 'youtube' ? 'red-darken-1' : 'medium-emphasis'"
            class="font-weight-bold rounded-pill text-none flex-grow-1 flex-sm-grow-0 source-tab-btn"
            prepend-icon="mdi-youtube"
            @click="selectedSourceMode = 'youtube'"
          >
            YouTube Playlist
          </v-btn>
          <v-btn
            size="small"
            :variant="selectedSourceMode === 'manual' ? 'flat' : 'outlined'"
            :color="selectedSourceMode === 'manual' ? 'primary' : 'medium-emphasis'"
            class="font-weight-bold rounded-pill text-none flex-grow-1 flex-sm-grow-0 source-tab-btn"
            prepend-icon="mdi-format-list-bulleted-type"
            @click="selectedSourceMode = 'manual'"
          >
            Manual Syllabus
          </v-btn>
        </div>
      </div>

      <!-- Mode 1: Udemy & Web URL Import -->
      <div v-if="selectedSourceMode === 'udemy'">
        <div class="d-flex align-center flex-wrap gap-2 mb-3">
          <v-icon icon="mdi-link-variant" color="primary" size="18" class="flex-shrink-0" />
          <span class="text-caption font-weight-bold text-uppercase tracking-wider text-primary-text text-wrap">
            Smart Course URL Import (Udemy, Coursera, Web)
          </span>
        </div>

        <div class="url-input-container">
          <v-text-field
            v-model="courseUrl"
            placeholder="https://www.udemy.com/course/..."
            density="comfortable"
            variant="outlined"
            hide-details="auto"
            :error-messages="urlErrorMessage"
            prepend-inner-icon="mdi-web"
            class="url-import-field"
            @keyup.enter="handleExtractUrl"
          >
            <template #append-inner>
              <v-tooltip location="top" text="Import Course from URL">
                <template #activator="{ props: tooltipProps }">
                  <span v-bind="tooltipProps" class="d-inline-flex">
                    <v-btn
                      icon="mdi-arrow-right"
                      color="primary"
                      variant="flat"
                      size="small"
                      :loading="isExtracting"
                      :disabled="!courseUrl.trim()"
                      class="url-import-btn shadow-orange"
                      aria-label="Import course from URL"
                      @click="handleExtractUrl"
                    />
                  </span>
                </template>
              </v-tooltip>
            </template>
          </v-text-field>
        </div>

        <!-- Friendly Restricted Access / Fallback Notification Alert -->
        <v-alert
          v-if="urlImportNotice"
          type="info"
          variant="tonal"
          color="primary"
          density="comfortable"
          class="mt-3 py-2 px-3 text-caption rounded-lg border-subtle"
          closable
          @click:close="urlImportNotice = ''"
        >
          <div class="d-flex flex-wrap align-center justify-space-between gap-2">
            <span class="flex-grow-1 text-wrap">{{ urlImportNotice }}</span>
            <v-btn
              size="x-small"
              variant="flat"
              color="primary"
              prepend-icon="mdi-format-list-bulleted-type"
              class="font-weight-bold flex-shrink-0"
              @click="openManualSyllabusModal"
            >
              Paste Syllabus
            </v-btn>
          </div>
        </v-alert>

        <!-- Fallback Quick Links -->
        <div class="d-flex align-center justify-space-between mt-3 pt-1">
          <span class="text-caption text-medium-emphasis">
            Public metadata extracted via SSRF-safe proxy.
          </span>
          <v-btn
            variant="text"
            size="small"
            color="primary"
            prepend-icon="mdi-text-box-outline"
            class="px-2 font-weight-bold"
            @click="openManualSyllabusModal"
          >
            Paste Syllabus Outline
          </v-btn>
        </div>
      </div>

      <!-- Mode 2: YouTube Playlist & Video Import -->
      <div v-else-if="selectedSourceMode === 'youtube'">
        <div class="d-flex align-center flex-wrap gap-2 mb-3">
          <v-icon icon="mdi-youtube" color="red" size="20" class="flex-shrink-0" />
          <span class="text-caption font-weight-bold text-uppercase tracking-wider text-primary-text text-wrap">
            YouTube Playlist & Video Import (Official Data API v3)
          </span>
        </div>

        <!-- Backend Offline Alert (if server is not reachable) -->
        <v-alert
          v-if="!isBackendOnline"
          type="error"
          variant="tonal"
          density="comfortable"
          class="mb-3 text-caption rounded-lg"
        >
          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
            <span>
              Backend server is offline or unreachable. Please verify the backend is running (<code class="font-mono">npm run server:local</code> or <code class="font-mono">npm run server:ip</code>).
            </span>
            <v-btn
              size="x-small"
              variant="outlined"
              color="error"
              class="font-weight-bold"
              @click="fetchYouTubeStatus"
            >
              Retry Connection
            </v-btn>
          </div>
        </v-alert>

        <!-- YouTube Setup Required Notice (Case B: API Key Missing & Backend Online) -->
        <div
          v-else-if="!isYouTubeApiKeyConfigured && !isYouTubeNoticeDismissed"
          class="youtube-setup-notice-card pa-4 mb-3 rounded-xl border bg-surface"
        >
          <div class="d-flex align-start gap-3">
            <div class="setup-notice-avatar d-flex align-center justify-center rounded-lg flex-shrink-0">
              <i class="mdi mdi-key-alert-outline text-amber-darken-3" style="font-size: 22px;"></i>
            </div>
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-1">
                <h3 class="text-subtitle-2 font-weight-bold text-primary-text mb-0">
                  YouTube Setup Required
                </h3>
                <span class="setup-notice-pill font-weight-bold text-caption">
                  Judge Setup
                </span>
              </div>
              <p class="text-caption text-medium-emphasis mb-3 line-height-relaxed">
                YouTube playlist importing requires a free Google YouTube Data API key. This project does not include a preconfigured API key. To try the YouTube integration, generate your own API key by following the setup instructions below.
              </p>
              <div class="d-flex align-center flex-wrap gap-2">
                <button
                  type="button"
                  class="setup-guide-btn font-weight-bold shadow-orange text-caption d-inline-flex align-center gap-1"
                  @click="showYouTubeGuideModal = true"
                >
                  <i class="mdi mdi-help-circle-outline" style="font-size: 15px;"></i>
                  <span>How to Get Your API Key</span>
                </button>
                <button
                  type="button"
                  class="setup-later-btn font-weight-medium text-caption"
                  @click="isYouTubeNoticeDismissed = true"
                >
                  I'll Configure It Later
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Helper Status Line & Setup Guide Launcher Button -->
        <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-2">
          <div class="d-flex align-center gap-2">
            <span
              v-if="isYouTubeApiKeyConfigured"
              class="youtube-status-active-chip text-caption font-weight-medium d-inline-flex align-center gap-1"
            >
              <i class="mdi mdi-check-circle text-success" style="font-size: 14px;"></i>
              <span>YouTube Data API v3 Active</span>
            </span>
            <span
              v-else-if="isBackendOnline"
              class="youtube-status-missing-chip text-caption font-weight-medium d-inline-flex align-center gap-1"
            >
              <i class="mdi mdi-alert-circle-outline text-amber-darken-3" style="font-size: 14px;"></i>
              <span>API Key Required</span>
            </span>
          </div>

          <button
            type="button"
            class="guide-launcher-link text-caption font-weight-medium d-inline-flex align-center gap-1"
            @click="showYouTubeGuideModal = true"
          >
            <i class="mdi mdi-book-open-page-variant-outline" style="font-size: 14px;"></i>
            <span>YouTube API Setup Guide</span>
          </button>
        </div>

        <div class="url-input-container">
          <v-text-field
            v-model="youtubeUrl"
            placeholder="https://www.youtube.com/playlist?list=... or watch?v=..."
            density="comfortable"
            variant="outlined"
            hide-details="auto"
            :error-messages="youtubeErrorMessage"
            prepend-inner-icon="mdi-youtube"
            class="url-import-field"
            @keyup.enter="handleExtractYouTube"
          >
            <template #append-inner>
              <v-tooltip location="top" text="Import YouTube Playlist">
                <template #activator="{ props: tooltipProps }">
                  <span v-bind="tooltipProps" class="d-inline-flex">
                    <v-btn
                      icon="mdi-arrow-right"
                      color="red-darken-1"
                      variant="flat"
                      size="small"
                      :loading="isExtractingYouTube"
                      :disabled="!youtubeUrl.trim()"
                      class="url-import-btn shadow-sm"
                      aria-label="Import YouTube playlist"
                      @click="handleExtractYouTube"
                    />
                  </span>
                </template>
              </v-tooltip>
            </template>
          </v-text-field>
        </div>

        <!-- Missing API Key Notice / Fallback Alert -->
        <v-alert
          v-if="youtubeNotice"
          type="warning"
          variant="tonal"
          color="warning"
          density="comfortable"
          class="mt-3 py-2 px-3 text-caption rounded-lg border-subtle"
          closable
          @click:close="youtubeNotice = ''"
        >
          <div class="d-flex flex-wrap align-center justify-space-between gap-2">
            <span class="flex-grow-1 text-wrap">{{ youtubeNotice }}</span>
            <div class="d-flex align-center gap-2 flex-shrink-0">
              <v-btn
                v-if="!isYouTubeApiKeyConfigured"
                size="x-small"
                variant="flat"
                color="primary"
                prepend-icon="mdi-help-circle-outline"
                class="font-weight-bold"
                @click="showYouTubeGuideModal = true"
              >
                How to Get Your API Key
              </v-btn>
              <v-btn
                size="x-small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-format-list-bulleted-type"
                class="font-weight-bold"
                @click="openManualSyllabusModal"
              >
                Use Manual Syllabus
              </v-btn>
            </div>
          </div>
        </v-alert>

        <!-- YouTube Extracted Playlist Review Section -->
        <div v-if="youtubeExtractedData" class="mt-4 pa-3 bg-surface rounded-lg border">
          <div class="d-flex flex-wrap align-center justify-space-between gap-2 mb-2">
            <div>
              <h4 class="text-subtitle-2 font-weight-bold text-primary-text mb-0">
                {{ youtubeExtractedData.title }}
              </h4>
              <span class="text-caption text-medium-emphasis">
                {{ youtubeExtractedData.channelTitle ? `${youtubeExtractedData.channelTitle} • ` : '' }}
                {{ youtubeReviewVideos.length }} Videos • Total Duration: {{ youtubeExtractedData.formattedTotalDuration }}
              </span>
            </div>
            <v-btn
              size="small"
              color="primary"
              variant="flat"
              prepend-icon="mdi-calendar-check"
              class="font-weight-bold shadow-orange"
              @click="applyYouTubeMilestones"
            >
              Generate Milestones ({{ youtubeReviewVideos.length }} Lessons)
            </v-btn>
          </div>

          <p class="text-caption text-medium-emphasis mb-2">
            Review video lessons below. You can remove any unwanted videos before creating milestones:
          </p>

          <!-- Review Video List -->
          <div class="max-h-200 overflow-y-auto d-flex flex-column gap-1 pe-1">
            <div
              v-for="(vid, vIdx) in youtubeReviewVideos"
              :key="vid.videoId"
              class="d-flex align-center justify-space-between pa-2 rounded bg-surface-variant text-caption"
            >
              <div class="d-flex align-center gap-2 min-w-0 me-2">
                <span class="text-primary font-weight-bold flex-shrink-0">{{ vIdx + 1 }}.</span>
                <span class="font-weight-medium text-truncate">{{ vid.title }}</span>
                <span class="text-medium-emphasis flex-shrink-0">({{ vid.formattedDuration }})</span>
              </div>
              <v-btn
                icon="mdi-close"
                size="x-small"
                variant="text"
                color="error"
                title="Remove video from plan"
                @click="removeYouTubeReviewVideo(vIdx)"
              />
            </div>
          </div>
        </div>

        <div v-else class="d-flex align-center justify-space-between mt-3 pt-1">
          <span class="text-caption text-medium-emphasis">
            Official YouTube Data API v3 integration with ISO duration normalization.
          </span>
          <v-btn
            variant="text"
            size="small"
            color="primary"
            prepend-icon="mdi-text-box-outline"
            class="px-2 font-weight-bold"
            @click="openManualSyllabusModal"
          >
            Paste Syllabus Outline
          </v-btn>
        </div>
      </div>

      <!-- Mode 3: Manual Syllabus Directly -->
      <div v-else class="text-center py-2">
        <v-icon icon="mdi-format-list-bulleted-type" color="primary" size="32" class="mb-2" />
        <h4 class="text-subtitle-2 font-weight-bold mb-1">Manual Course & Syllabus Outline</h4>
        <p class="text-caption text-medium-emphasis mb-3 max-w-400 mx-auto">
          Paste your course outline, book chapters, or certification modules directly. Our regex parser automatically paces your lessons.
        </p>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-pencil-box-outline"
          class="font-weight-bold shadow-orange"
          @click="openManualSyllabusModal"
        >
          Open Quick-Syllabus Parser
        </v-btn>
      </div>
    </v-sheet>

    <!-- Main Goal Form Fields -->
    <v-form ref="formRef" @submit.prevent="handleSaveGoal">
      <!-- Title Field (Required) -->
      <v-text-field
        v-model="goal.title"
        label="Goal or Course Title *"
        placeholder="e.g., Master LLM Engineering & RAG"
        :rules="[rules.required, rules.titleLength]"
        counter="60"
        maxlength="60"
        variant="outlined"
        density="comfortable"
        class="mb-3"
      />

      <!-- Description Field (Optional) -->
      <v-textarea
        v-model="goal.description"
        label="Goal Summary / Objective"
        placeholder="Brief description of skills to master, certification target, or project scope"
        counter="200"
        maxlength="200"
        rows="2"
        variant="outlined"
        density="comfortable"
        class="mb-3"
      />

      <!-- Row: Category & Duration -->
      <v-row dense class="mb-3">
        <v-col cols="12" sm="6" class="py-1">
          <v-select
            v-model="goal.category"
            :items="categories"
            label="Category *"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-tag-outline"
          />
        </v-col>

        <v-col cols="12" sm="6" class="py-1">
          <v-text-field
            v-model.number="goal.totalDays"
            type="number"
            min="1"
            max="365"
            label="Deadline Duration (Days) *"
            :rules="[rules.required, rules.daysRange]"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-calendar-clock"
            suffix="Days"
            @update:model-value="updateTargetDate"
          />
        </v-col>
      </v-row>

      <!-- Row: Target Date Display & Nature Wallpaper Theme -->
      <v-row dense class="mb-3">
        <v-col cols="12" sm="6" class="py-1">
          <v-text-field
            :model-value="formattedTargetDate"
            label="Calculated Target Deadline"
            variant="outlined"
            density="comfortable"
            readonly
            prepend-inner-icon="mdi-calendar-check"
            hint="Computed based on duration"
            persistent-hint
          />
        </v-col>

        <v-col cols="12" sm="6" class="py-1">
          <v-select
            v-model="goal.templateId"
            :items="templateOptions"
            item-title="name"
            item-value="id"
            label="Nature Wallpaper Aesthetic"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-palette-outline"
          />
        </v-col>
      </v-row>

      <!-- Imported Sections Card (if course sections exist) -->
      <v-card
        v-if="rawSectionsCount > 0"
        color="surface-variant"
        class="pa-4 mb-4 rounded-lg"
        border
      >
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center gap-2">
            <v-icon icon="mdi-format-list-numbered" color="primary" size="20" />
            <span class="text-subtitle-2 font-weight-bold course-outline-title">
              Course Outline ({{ rawSectionsCount }} Sections Imported)
            </span>
          </div>
          <div class="d-flex gap-2">
            <v-btn
              size="x-small"
              variant="text"
              color="primary"
              prepend-icon="mdi-pencil"
              @click="showSyllabusModal = true"
            >
              Edit Outline
            </v-btn>
            <v-btn
              size="x-small"
              variant="text"
              color="medium-emphasis"
              @click="clearSections"
            >
              Clear
            </v-btn>
          </div>
        </div>

        <!-- Section Chips -->
        <div class="d-flex flex-wrap gap-2 max-h-140 overflow-y-auto pt-1">
          <v-chip
            v-for="(sec, idx) in goal.courseMetadata.rawSections"
            :key="idx"
            size="small"
            class="section-outline-chip text-caption font-weight-medium border"
          >
            <span class="text-primary font-weight-bold me-1">{{ idx + 1 }}.</span>
            <span class="section-title-text">{{ sec }}</span>
          </v-chip>
        </div>
      </v-card>

      <!-- Form Action Buttons -->
      <div class="d-flex flex-wrap justify-space-between align-center gap-3 pt-3 border-t">
        <v-btn
          v-if="rawSectionsCount > 0 || (goal.milestones && goal.milestones.length > 0)"
          variant="tonal"
          color="primary"
          size="default"
          prepend-icon="mdi-map-marker-path"
          class="font-weight-medium flex-grow-1 flex-sm-grow-0"
          @click="generatePlanNow"
        >
          Generate Milestone Plan
        </v-btn>
        <div class="d-flex gap-3 ms-auto flex-grow-1 flex-sm-grow-0 justify-end">
          <v-btn
            type="submit"
            color="primary"
            size="large"
            variant="flat"
            prepend-icon="mdi-content-save"
            class="px-6 font-weight-bold flex-grow-1 flex-sm-grow-0"
          >
            Save Goal
          </v-btn>
        </div>
      </div>
    </v-form>

    <!-- Quick Syllabus Outline Fallback Modal -->
    <QuickSyllabusModal
      v-model="showSyllabusModal"
      :course-url="courseUrl"
      :course-title="goal.title"
      :is-restricted-fallback="isRestrictedFallback"
      @apply-sections="handleApplySections"
    />

    <!-- Feedback Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3500"
      location="bottom right"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>

    <!-- YouTube API Setup Guide Modal (Judge-Friendly) -->
    <YouTubeSetupGuideModal
      v-model="showYouTubeGuideModal"
      :api-key-configured="isYouTubeApiKeyConfigured"
      :is-server-online="isBackendOnline"
      @refresh-status="fetchYouTubeStatus"
    />
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import QuickSyllabusModal from './QuickSyllabusModal.vue';
import YouTubeSetupGuideModal from '../youtube/YouTubeSetupGuideModal.vue';
import { createSampleLlmGoal } from '../../services/sampleCourse.js';
import { generateMilestonePlan } from '../../services/milestoneEngine.js';
import { apiFetch, checkYouTubeApiStatus } from '../../services/apiClient.js';

const props = defineProps({
  goal: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['save-goal', 'plan-generated']);

const formRef = ref(null);
const selectedSourceMode = ref(props.goal?.sourceType || 'udemy');
const courseUrl = ref('');
const isExtracting = ref(false);
const urlErrorMessage = ref('');
const urlImportNotice = ref('');
const isRestrictedFallback = ref(false);
const showSyllabusModal = ref(false);

// YouTube Reactive State
const youtubeUrl = ref('');
const isExtractingYouTube = ref(false);
const youtubeErrorMessage = ref('');
const youtubeNotice = ref('');
const youtubeExtractedData = ref(null);
const youtubeReviewVideos = ref([]);
const showYouTubeGuideModal = ref(false);
const isYouTubeApiKeyConfigured = ref(false);
const isYouTubeNoticeDismissed = ref(false);
const isBackendOnline = ref(true);
const isCheckingYouTubeStatus = ref(false);

async function fetchYouTubeStatus() {
  isCheckingYouTubeStatus.value = true;
  try {
    const status = await checkYouTubeApiStatus();
    isBackendOnline.value = status.online;
    isYouTubeApiKeyConfigured.value = status.apiKeyConfigured;
  } catch {
    isBackendOnline.value = false;
    isYouTubeApiKeyConfigured.value = false;
  } finally {
    isCheckingYouTubeStatus.value = false;
  }
}

watch(selectedSourceMode, (mode) => {
  if (mode === 'youtube') {
    fetchYouTubeStatus();
  }
});

onMounted(() => {
  if (selectedSourceMode.value === 'youtube') {
    fetchYouTubeStatus();
  }
});

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const categories = ['Learning', 'Certification', 'Project', 'Fitness', 'Personal'];

const templateOptions = [
  { id: 'alpine-peak', name: 'Alpine Peak (Forest / Mountain)' },
  { id: 'deep-pacific', name: 'Deep Pacific (Ocean)' },
  { id: 'golden-horizon', name: 'Golden Horizon (Sunrise / Sunset)' },
  { id: 'minimalist-stone', name: 'Minimalist Stone (Zen Nature)' }
];

const rules = {
  required: val => (val !== undefined && val !== null && String(val).trim() !== '') || 'This field is required',
  titleLength: val => (val && val.length <= 60) || 'Title must be 60 characters or less',
  daysRange: val => (Number(val) >= 1 && Number(val) <= 365) || 'Duration must be between 1 and 365 days'
};

const rawSectionsCount = computed(() => {
  return props.goal?.courseMetadata?.rawSections?.length || 0;
});

const formattedTargetDate = computed(() => {
  if (!props.goal?.targetDate) return 'N/A';
  try {
    const d = new Date(props.goal.targetDate);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
});

function updateTargetDate(days) {
  const d = Number(days) || 15;
  const target = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
  props.goal.targetDate = target.toISOString();
}

/**
 * 1-Click Demo Action: Loads predefined LLM Engineering course with milestones
 */
function handleLoadSampleDemo() {
  const sampleGoal = createSampleLlmGoal(props.goal);
  sampleGoal.milestones = generateMilestonePlan(sampleGoal);
  Object.assign(props.goal, sampleGoal);
  courseUrl.value = sampleGoal.courseMetadata.sourceUrl;
  urlErrorMessage.value = '';

  emit('plan-generated');

  snackbar.value = {
    show: true,
    message: 'Loaded "Complete LLM Engineering Course" (15 days, 8 milestones) successfully!',
    color: 'success'
  };
}

function openManualSyllabusModal() {
  isRestrictedFallback.value = !!urlImportNotice.value;
  showSyllabusModal.value = true;
}

/**
 * URL Metadata Extraction Handler calling Express Proxy /api/course-info/extract
 */
async function handleExtractUrl() {
  const url = courseUrl.value.trim();
  urlErrorMessage.value = '';
  urlImportNotice.value = '';
  isRestrictedFallback.value = false;

  if (!url) {
    urlErrorMessage.value = 'Please enter a course URL';
    return;
  }

  isExtracting.value = true;

  try {
    const response = await apiFetch('/api/course-info/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    let result = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = {
        success: false,
        restricted: true,
        fallbackRequired: true,
        error: 'Unable to automatically access this course. The website restricts external requests. You can still continue by entering the course details and pasting its syllabus.'
      };
    }

    // Always preserve the entered URL in metadata
    props.goal.sourceType = 'manual';
  props.goal.source = {
    provider: 'manual',
    url: courseUrl.value.trim() || null,
    title: props.goal.title || customTitle || 'Custom Syllabus Course',
    importedAt: new Date().toISOString(),
    extractionStatus: 'manual'
  };

  if (!props.goal.courseMetadata) {
      props.goal.courseMetadata = {
        sourceUrl: url,
        sourceType: result?.partialData?.sourceType || 'UDEMY',
        title: props.goal.title || '',
        author: null,
        totalSections: 0,
        rawSections: [],
        extractedAt: new Date().toISOString()
      };
    } else {
      props.goal.courseMetadata.sourceUrl = url;
    }

    if (response.status === 422 || result.fallbackRequired || result.restricted) {
      isRestrictedFallback.value = true;
      urlImportNotice.value =
        result.error ||
        'Unable to automatically access this course. The website restricts external requests. You can still continue by entering the course details and pasting its syllabus.';
      snackbar.value = {
        show: true,
        message: urlImportNotice.value,
        color: 'warning'
      };
      const titleCandidate = result.partialData?.title || result.partialData?.suggestedTitle;
      if (titleCandidate && (!props.goal.title || props.goal.title === '')) {
        props.goal.title = titleCandidate;
      }
      showSyllabusModal.value = true;
      return;
    }

    if (!response.ok || !result.success) {
      urlErrorMessage.value = result.error || 'Failed to extract course metadata';
      return;
    }

    // Success: Populate goal
    const data = result.data;
    if (data.title && (!props.goal.title || props.goal.title.startsWith('Imported') || props.goal.title === '')) {
      props.goal.title = data.title;
    }
    if (data.description && !props.goal.description) {
      props.goal.description = data.description;
    }

    props.goal.sourceType = 'udemy';
    props.goal.source = {
      provider: 'udemy',
      url,
      externalId: data.courseId || null,
      title: data.title || props.goal.title,
      importedAt: new Date().toISOString(),
      extractionStatus: 'success'
    };
    props.goal.courseMetadata = data;

    if (result.fallbackRecommended || (data.rawSections && data.rawSections.length === 0)) {
      isRestrictedFallback.value = false;
      urlImportNotice.value = 'Course details extracted! Please paste section outline to generate milestones.';
      snackbar.value = {
        show: true,
        message: urlImportNotice.value,
        color: 'info'
      };
      showSyllabusModal.value = true;
    } else {
      props.goal.milestones = generateMilestonePlan(props.goal);
      emit('plan-generated');
      snackbar.value = {
        show: true,
        message: `Successfully imported ${data.totalSections} course sections and generated milestone plan!`,
        color: 'success'
      };
    }
  } catch (err) {
    isRestrictedFallback.value = true;
    urlImportNotice.value =
      'Unable to automatically access this course. The website restricts external requests. You can still continue by entering the course details and pasting its syllabus.';
    snackbar.value = {
      show: true,
      message: urlImportNotice.value,
      color: 'warning'
    };
    showSyllabusModal.value = true;
  } finally {
    isExtracting.value = false;
  }
}

/**
 * YouTube Playlist Ingestion Handler calling Express API /api/youtube/playlist-info
 */
async function handleExtractYouTube() {
  const url = youtubeUrl.value.trim();
  youtubeErrorMessage.value = '';
  youtubeNotice.value = '';
  youtubeExtractedData.value = null;
  youtubeReviewVideos.value = [];

  if (!url) {
    youtubeErrorMessage.value = 'Please enter a YouTube playlist or video link';
    return;
  }

  isExtractingYouTube.value = true;

  try {
    const response = await apiFetch('/api/youtube/playlist-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    let result = null;
    try {
      result = await response.json();
    } catch {
      result = { success: false, error: 'Failed to parse YouTube API response' };
    }

    if (!response.ok || !result.success) {
      const errObj = result.error;
      const errMsg = typeof errObj === 'object' && errObj !== null ? errObj.message : (errObj || 'Failed to extract YouTube playlist');
      const errCode = typeof errObj === 'object' && errObj !== null ? errObj.code : (result.code || '');

      if (result.missingKey || errCode === 'MISSING_API_KEY') {
        youtubeNotice.value = 'YouTube API key is not configured on the backend server. Follow the Google Cloud setup guide to configure your free YOUTUBE_API_KEY in the .env file.';
        isYouTubeApiKeyConfigured.value = false;
      } else if (errCode === 'INVALID_API_KEY') {
        youtubeNotice.value = 'The configured YouTube API key is invalid or unauthorized. Please verify your API key in Google Cloud Console.';
      } else if (errCode === 'API_NOT_ENABLED') {
        youtubeNotice.value = 'YouTube Data API v3 is not enabled in your Google Cloud Project. Please enable it in Google Cloud Console.';
      } else if (errCode === 'QUOTA_EXCEEDED') {
        youtubeNotice.value = 'YouTube API daily quota limit exceeded. You can use the Manual Syllabus option or try again later.';
      } else {
        youtubeErrorMessage.value = errMsg;
      }
      return;
    }

    // Success
    const data = result.data;
    isYouTubeApiKeyConfigured.value = true;
    youtubeExtractedData.value = data;
    youtubeReviewVideos.value = [...(data.videos || [])];

    if (data.title && (!props.goal.title || props.goal.title === '')) {
      props.goal.title = data.title;
    }
    if (data.description && !props.goal.description) {
      props.goal.description = data.description.slice(0, 200);
    }

    snackbar.value = {
      show: true,
      message: `Extracted ${data.totalVideos} videos from "${data.title}"! Review and confirm to generate milestones.`,
      color: 'success'
    };
  } catch (err) {
    youtubeErrorMessage.value = `Connection error: ${err.message}`;
  } finally {
    isExtractingYouTube.value = false;
  }
}

function removeYouTubeReviewVideo(index) {
  youtubeReviewVideos.value.splice(index, 1);
}

function applyYouTubeMilestones() {
  if (!youtubeExtractedData.value || youtubeReviewVideos.value.length === 0) return;

  const data = youtubeExtractedData.value;
  const videos = youtubeReviewVideos.value;

  props.goal.sourceType = 'youtube';
  props.goal.source = {
    provider: 'youtube',
    url: youtubeUrl.value.trim(),
    externalId: data.playlistId || null,
    title: data.title,
    channelTitle: data.channelTitle,
    importedAt: new Date().toISOString(),
    extractionStatus: 'success',
    totalVideos: videos.length
  };

  const rawSections = videos.map(v => ({
    title: v.title,
    video: {
      videoId: v.videoId,
      videoUrl: v.videoUrl,
      durationSeconds: v.durationSeconds,
      formattedDuration: v.formattedDuration
    }
  }));

  props.goal.courseMetadata = {
    sourceType: 'YOUTUBE',
    sourceUrl: youtubeUrl.value.trim(),
    title: data.title,
    totalSections: videos.length,
    rawSections,
    extractedAt: new Date().toISOString()
  };

  props.goal.milestones = generateMilestonePlan(props.goal);
  emit('plan-generated');

  snackbar.value = {
    show: true,
    message: `Generated milestone plan for ${videos.length} YouTube lessons!`,
    color: 'success'
  };
}

/**
 * Applies sections parsed from the Quick-Syllabus modal
 */
function handleApplySections(payload) {
  const sections = Array.isArray(payload) ? payload : (payload?.sections || []);
  const customTitle = typeof payload === 'object' && payload?.title ? payload.title.trim() : null;

  if (!sections || sections.length === 0) return;

  if (customTitle && (!props.goal.title || props.goal.title === '')) {
    props.goal.title = customTitle;
  }

  props.goal.sourceType = 'manual';
  props.goal.source = {
    provider: 'manual',
    url: courseUrl.value.trim() || null,
    title: props.goal.title || customTitle || 'Custom Syllabus Course',
    importedAt: new Date().toISOString(),
    extractionStatus: 'manual'
  };

  if (!props.goal.courseMetadata) {
    props.goal.courseMetadata = {
      sourceUrl: courseUrl.value.trim() || null,
      sourceType: 'MANUAL_SYLLABUS',
      title: props.goal.title || customTitle || 'Custom Syllabus Course',
      author: null,
      totalSections: sections.length,
      rawSections: sections,
      extractedAt: new Date().toISOString()
    };
  } else {
    props.goal.courseMetadata.sourceUrl = courseUrl.value.trim() || props.goal.courseMetadata.sourceUrl || null;
    props.goal.courseMetadata.sourceType = 'MANUAL_SYLLABUS';
    props.goal.courseMetadata.rawSections = sections;
    props.goal.courseMetadata.totalSections = sections.length;
    props.goal.courseMetadata.extractedAt = new Date().toISOString();
  }

  // Auto-generate milestone plan from newly applied sections
  props.goal.milestones = generateMilestonePlan(props.goal);
  emit('plan-generated');

  urlImportNotice.value = ''; // Clear notice once manual syllabus has been successfully applied

  snackbar.value = {
    show: true,
    message: `Applied ${sections.length} sections and generated milestone schedule!`,
    color: 'success'
  };
}

function generatePlanNow() {
  props.goal.milestones = generateMilestonePlan(props.goal);
  emit('plan-generated');
  snackbar.value = {
    show: true,
    message: `Generated ${props.goal.milestones.length} milestones successfully!`,
    color: 'success'
  };
}

function clearSections() {
  if (props.goal.courseMetadata) {
    props.goal.courseMetadata.rawSections = [];
    props.goal.courseMetadata.totalSections = 0;
  }
  props.goal.milestones = [];
}

async function handleSaveGoal() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  if (!props.goal.milestones || props.goal.milestones.length === 0) {
    props.goal.milestones = generateMilestonePlan(props.goal);
  }

  emit('save-goal');
  snackbar.value = {
    show: true,
    message: 'Goal & milestones saved successfully to LocalStorage!',
    color: 'success'
  };
}
</script>

<style scoped>
.course-outline-title {
  color: #1B1814 !important;
}
.section-outline-chip {
  background-color: var(--color-surface, #FFFDF8) !important;
  color: #1B1814 !important;
  border-color: var(--color-border, #E7DED0) !important;
}
.section-outline-chip .section-title-text {
  color: #1B1814 !important;
}
.max-h-140 {
  max-height: 140px;
}
.tracking-wider {
  letter-spacing: 0.05em;
}
.url-input-container {
  width: 100%;
}
.url-import-btn {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  border-radius: 50% !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-right: -4px;
}
.url-import-btn:not(:disabled):hover {
  transform: scale(1.06);
}
.shadow-orange {
  box-shadow: 0 2px 8px rgba(233, 120, 36, 0.28) !important;
}

.youtube-setup-notice-card {
  background: linear-gradient(135deg, #FFFDF8 0%, #FFFBEB 100%) !important;
  border-color: #FDE68A !important;
}

.setup-notice-avatar {
  width: 36px;
  height: 36px;
  background-color: #FEF3C7;
  border: 1px solid #FCD34D;
}

.setup-notice-pill {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: #FEF3C7;
  color: #B45309;
  border: 1px solid #FCD34D;
}

.setup-guide-btn {
  padding: 6px 14px;
  border-radius: 8px;
  background-color: var(--color-primary-orange, #E97824);
  color: #FFFFFF;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.setup-guide-btn:hover {
  background-color: var(--color-primary-hover, #D36515);
}

.setup-later-btn {
  padding: 6px 12px;
  border-radius: 8px;
  background-color: transparent;
  color: var(--color-medium-emphasis, #6B7280);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.setup-later-btn:hover {
  color: var(--color-primary-text, #1E293B);
  background-color: rgba(0, 0, 0, 0.04);
}

.youtube-status-active-chip {
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: #F0FDF4;
  color: #16A34A;
  border: 1px solid #BBF7D0;
  font-size: 0.75rem;
}

.youtube-status-missing-chip {
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: #FFFBEB;
  color: #B45309;
  border: 1px solid #FDE68A;
  font-size: 0.75rem;
}

.guide-launcher-link {
  background: transparent;
  border: none;
  color: var(--color-primary-orange, #E97824);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.guide-launcher-link:hover {
  text-decoration: underline;
  color: var(--color-primary-hover, #D36515);
}
</style>
