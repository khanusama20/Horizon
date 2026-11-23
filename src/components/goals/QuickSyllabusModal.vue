<template>
  <v-dialog :model-value="modelValue" max-width="650" @update:model-value="$emit('update:modelValue', $event)">
    <v-card color="surface" class="pa-4">
      <!-- Modal Header -->
      <v-card-item class="px-2 pb-3 pt-1">
        <template #prepend>
          <v-avatar color="primary" size="36" class="me-3">
            <v-icon icon="mdi-format-list-bulleted-type" color="white" size="20" />
          </v-avatar>
        </template>
        <v-card-title class="section-header-title text-h6 font-weight-bold">
          Quick-Syllabus Text Parser
        </v-card-title>
        <v-card-subtitle class="section-header-subtitle text-caption text-medium-emphasis">
          Paste course modules, Roman numerals, or bullet points to instantly extract clean sections.
        </v-card-subtitle>
        <template #append>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            color="medium-emphasis"
            aria-label="Close dialog"
            title="Close"
            @click="$emit('update:modelValue', false)"
          />
        </template>
      </v-card-item>

      <v-card-text class="pt-2 px-2">
        <!-- Restricted Access / Fallback Informational Banner -->
        <v-alert
          v-if="isRestrictedFallback"
          type="info"
          variant="tonal"
          color="primary"
          density="comfortable"
          class="mb-3 py-2 px-3 text-caption rounded-lg"
        >
          <div class="d-flex align-center gap-2 mb-1">
            <v-icon icon="mdi-shield-alert-outline" color="primary" size="18" />
            <span class="font-weight-bold text-primary-text">Website Access Restricted</span>
          </div>
          <p class="mb-1 text-medium-emphasis">
            The external website restricts automated requests. You can continue seamlessly by confirming the course title and pasting its syllabus outline below.
          </p>
          <div v-if="courseUrl" class="text-caption font-mono text-medium-emphasis text-truncate">
            Course URL: {{ courseUrl }}
          </div>
        </v-alert>

        <!-- Course Title Input -->
        <v-text-field
          v-model="modalCourseTitle"
          label="Course / Goal Title"
          placeholder="e.g., Master Full-Stack LLM Engineering"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-format-title"
          class="mb-3"
          hint="Confirm or enter course title"
          persistent-hint
        />

        <!-- Quick Sample Helper Bar -->
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="text-caption text-medium-emphasis">Paste curriculum outline text below:</span>
          <div class="d-flex gap-2">
            <v-btn
              size="x-small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-auto-fix"
              class="font-weight-bold"
              @click="loadSampleText"
            >
              Insert Sample Syllabus
            </v-btn>
            <v-btn
              v-if="rawText"
              size="x-small"
              variant="text"
              color="medium-emphasis"
              @click="rawText = ''"
            >
              Clear
            </v-btn>
          </div>
        </div>

        <!-- Textarea for Outline -->
        <v-textarea
          v-model="rawText"
          rows="6"
          variant="outlined"
          density="comfortable"
          placeholder="1. Foundations and First Projects (45 mins)&#10;2. Frontier APIs and Customer Service Chatbots&#10;- Retrieval-Augmented Generation (RAG)&#10;Section IV: Fine-Tuning..."
          hint="Supports numbered lists, Roman numerals, Markdown bullets, and auto-strips timestamps."
          persistent-hint
          class="mb-3 font-mono text-body-2"
        />

        <!-- Live Parsed Preview Box -->
        <v-sheet
          color="surface-variant"
          class="pa-3 rounded-lg border mb-3"
        >
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="d-flex align-center">
              <v-icon
                :icon="parsedSections.length > 0 ? 'mdi-check-circle' : 'mdi-information-outline'"
                :color="parsedSections.length > 0 ? 'success' : 'medium-emphasis'"
                size="16"
                class="me-2"
              />
              <span class="text-caption font-weight-bold text-primary-text">
                Parsed Sections Preview ({{ parsedSections.length }})
              </span>
            </div>
            <v-chip
              v-if="parsedSections.length > 0"
              size="x-small"
              color="success"
              variant="tonal"
              class="font-weight-bold"
            >
              Ready to Import
            </v-chip>
          </div>

          <!-- Empty State -->
          <div v-if="parsedSections.length === 0" class="text-caption text-disabled text-center py-4">
            Paste curriculum text above or click "Insert Sample Syllabus" to see preview.
          </div>

          <!-- Parsed Sections Chip List -->
          <div v-else class="d-flex flex-wrap gap-2 max-h-160 overflow-y-auto pt-1">
            <v-chip
              v-for="(sec, idx) in parsedSections"
              :key="idx"
              size="small"
              color="surface"
              variant="flat"
              class="text-caption border font-weight-medium"
            >
              <span class="text-primary font-weight-bold me-1">{{ idx + 1 }}.</span>
              {{ sec }}
            </v-chip>
          </div>
        </v-sheet>
      </v-card-text>

      <!-- Modal Actions -->
      <v-card-actions class="px-2 pb-2 pt-2 gap-2">
        <v-spacer />
        <v-btn
          variant="text"
          color="medium-emphasis"
          @click="$emit('update:modelValue', false)"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-import"
          :disabled="parsedSections.length === 0"
          @click="applyParsedSections"
        >
          Import {{ parsedSections.length }} Sections
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { parseSyllabusText, SAMPLE_SYLLABUS_TEXT } from '../../services/syllabusParser.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  courseUrl: {
    type: String,
    default: ''
  },
  courseTitle: {
    type: String,
    default: ''
  },
  isRestrictedFallback: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'apply-sections']);

const rawText = ref('');
const modalCourseTitle = ref(props.courseTitle || '');

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      modalCourseTitle.value = props.courseTitle || '';
    }
  }
);

watch(
  () => props.courseTitle,
  (newTitle) => {
    if (newTitle) {
      modalCourseTitle.value = newTitle;
    }
  }
);

const parsedSections = computed(() => {
  return parseSyllabusText(rawText.value);
});

function loadSampleText() {
  rawText.value = SAMPLE_SYLLABUS_TEXT;
}

function applyParsedSections() {
  if (parsedSections.value.length === 0) return;
  emit('apply-sections', {
    sections: parsedSections.value,
    title: modalCourseTitle.value.trim()
  });
  emit('update:modelValue', false);
  rawText.value = '';
}
</script>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.max-h-160 {
  max-height: 160px;
}
</style>
