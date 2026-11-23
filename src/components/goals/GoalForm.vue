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
      <v-tooltip location="bottom" text="Instantly loads complete 15-day LLM Engineering Course (100% Offline Demo)">
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

    <!-- URL Ingestion Banner / Input -->
    <v-sheet color="surface-variant" class="pa-4 rounded-lg mb-4" border>
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
                <v-btn
                  v-bind="tooltipProps"
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
          class="font-weight-medium"
          @click="generatePlanNow"
        >
          Generate Milestone Plan
        </v-btn>
        <div class="d-flex gap-3 ms-auto">
          <v-btn
            type="submit"
            color="primary"
            size="large"
            variant="flat"
            prepend-icon="mdi-content-save"
            class="px-6 font-weight-bold"
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
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue';
import QuickSyllabusModal from './QuickSyllabusModal.vue';
import { createSampleLlmGoal } from '../../services/sampleCourse.js';
import { generateMilestonePlan } from '../../services/milestoneEngine.js';

const props = defineProps({
  goal: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['save-goal', 'plan-generated']);

const formRef = ref(null);
const courseUrl = ref('');
const isExtracting = ref(false);
const urlErrorMessage = ref('');
const urlImportNotice = ref('');
const isRestrictedFallback = ref(false);
const showSyllabusModal = ref(false);

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
    const response = await fetch('/api/course-info/extract', {
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
      if (result.partialData?.title && !props.goal.title) {
        props.goal.title = result.partialData.title;
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
 * Applies sections parsed from the Quick-Syllabus modal
 */
function handleApplySections(payload) {
  const sections = Array.isArray(payload) ? payload : (payload?.sections || []);
  const customTitle = typeof payload === 'object' && payload?.title ? payload.title.trim() : null;

  if (!sections || sections.length === 0) return;

  if (customTitle && (!props.goal.title || props.goal.title === '')) {
    props.goal.title = customTitle;
  }

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
</style>
