<template>
  <v-card id="section-milestones" color="surface" class="pa-5 mb-5">
    <!-- Header with Progress Summary -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 gap-3">
      <div class="section-header-row">
        <v-avatar color="primary" size="32" class="flex-shrink-0">
          <v-icon icon="mdi-map-marker-path" color="white" size="18" />
        </v-avatar>
        <div class="section-header-content">
          <h2 class="section-header-title">Milestone Roadmap</h2>
          <span class="section-header-subtitle">
            {{ completedCount }} of {{ totalMilestones }} Milestones Completed ({{ progressPct }}%)
          </span>
        </div>
      </div>

      <!-- Action: Regenerate Plan Button -->
      <v-btn
        v-if="totalMilestones > 0"
        variant="tonal"
        color="primary"
        size="small"
        prepend-icon="mdi-refresh"
        class="font-weight-bold"
        @click="$emit('regenerate-plan')"
      >
        Regenerate Schedule
      </v-btn>
    </div>

    <!-- Overall Progress Linear Bar -->
    <div class="mb-4">
      <div class="d-flex justify-space-between text-caption font-weight-bold text-primary-text mb-2">
        <span>Journey Completion</span>
        <span class="text-primary font-weight-bold">{{ progressPct }}%</span>
      </div>
      <v-progress-linear
        :model-value="progressPct"
        height="8"
        rounded
        color="primary"
        bg-color="surface-variant"
      />
    </div>

    <!-- Empty State (No milestones generated yet) -->
    <v-sheet
      v-if="totalMilestones === 0"
      color="surface-variant"
      class="pa-6 rounded-lg text-center border-dashed"
    >
      <v-icon icon="mdi-calendar-multiselect" size="40" color="primary" class="mb-2" />
      <h3 class="text-subtitle-1 font-weight-bold text-primary-text mb-1">No Milestone Plan Generated Yet</h3>
      <p class="text-caption text-medium-emphasis max-w-400 mx-auto mb-4">
        Ready to turn your goal into daily milestones. Click below to automatically pace your imported sections across your target deadline.
      </p>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-auto-fix"
        class="font-weight-bold"
        @click="$emit('regenerate-plan')"
      >
        Generate Milestone Plan
      </v-btn>
    </v-sheet>

    <!-- Milestone Cards Chronological List -->
    <div v-else class="d-flex flex-column gap-3">
      <v-card
        v-for="(milestone, idx) in sortedMilestones"
        :key="milestone.id"
        :color="milestone.status === 'completed' ? 'surface-variant' : 'surface'"
        :class="[
          'pa-3 rounded-lg border transition-all',
          milestone.status === 'completed' ? 'border-completed opacity-70' : (isNextFocus(milestone) ? 'border-focus' : 'border-subtle')
        ]"
      >
        <div class="d-flex align-start justify-space-between">
          <!-- Left: Checkbox Toggle & Title -->
          <div class="d-flex align-start gap-2 flex-grow-1 me-2">
            <v-btn
              :icon="milestone.status === 'completed' ? 'mdi-checkbox-marked-circle' : 'mdi-checkbox-blank-circle-outline'"
              :color="milestone.status === 'completed' ? 'success' : 'medium-emphasis'"
              variant="text"
              size="small"
              class="me-1 flex-shrink-0"
              @click="toggleComplete(milestone.id)"
            />

            <div class="pt-1">
              <div class="d-flex align-center flex-wrap gap-2 mb-1">
                <!-- Milestone Order Badge -->
                <span class="text-caption font-weight-bold text-primary">
                  #{{ milestone.order }}
                </span>

                <!-- Section Title -->
                <span
                  :class="[
                    'text-body-2 font-weight-bold',
                    milestone.status === 'completed' ? 'text-decoration-line-through text-medium-emphasis' : 'text-primary-text'
                  ]"
                >
                  {{ milestone.title }}
                </span>

                <!-- Current Focus Chip -->
                <v-chip
                  v-if="isNextFocus(milestone)"
                  size="x-small"
                  color="primary"
                  variant="flat"
                  class="font-weight-bold"
                >
                  Current Focus
                </v-chip>
              </div>

              <!-- Sub-description if bundled -->
              <p
                v-if="milestone.description"
                class="text-caption text-medium-emphasis mb-2"
              >
                {{ milestone.description }}
              </p>

              <!-- Meta Row: Due Date & Type Badge -->
              <div class="d-flex align-center flex-wrap gap-3 text-caption mt-2">
                <!-- Due Date -->
                <div class="d-flex align-center text-medium-emphasis">
                  <v-icon icon="mdi-calendar-outline" size="14" class="me-1" />
                  <span>Day {{ milestone.targetDay }} • {{ formatDueDate(milestone.dueDate) }}</span>
                </div>

                <!-- Type Chip -->
                <v-chip
                  size="x-small"
                  :color="typeColor(milestone.type)"
                  variant="tonal"
                  class="font-weight-medium text-capitalize text-white"
                >
                  <v-icon :icon="typeIcon(milestone.type)" start size="12" />
                  {{ milestone.type }}
                </v-chip>

                <!-- Completed Timestamp -->
                <span
                  v-if="milestone.status === 'completed' && milestone.completedAt"
                  class="text-caption text-success font-weight-light"
                >
                  Done {{ formatCompletedDate(milestone.completedAt) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right: Basic Reorder Buttons -->
          <div class="d-flex flex-column flex-shrink-0 ms-1">
            <v-btn
              icon="mdi-chevron-up"
              size="x-small"
              variant="text"
              color="medium-emphasis"
              :disabled="idx === 0"
              @click="moveMilestone(idx, -1)"
            />
            <v-btn
              icon="mdi-chevron-down"
              size="x-small"
              variant="text"
              color="medium-emphasis"
              :disabled="idx === sortedMilestones.length - 1"
              @click="moveMilestone(idx, 1)"
            />
          </div>
        </div>
      </v-card>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { calculateProgress, toggleMilestoneState } from '../../services/milestoneEngine.js';

const props = defineProps({
  milestones: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['update:milestones', 'regenerate-plan']);

const totalMilestones = computed(() => props.milestones.length);

const completedCount = computed(() => {
  return props.milestones.filter(m => m.status === 'completed' || m.completed === true).length;
});

const progressPct = computed(() => {
  return calculateProgress(props.milestones);
});

const sortedMilestones = computed(() => {
  return [...props.milestones].sort((a, b) => a.order - b.order);
});

/**
 * Identifies the first non-completed milestone as the active current focus
 */
function isNextFocus(milestone) {
  if (milestone.status === 'completed' || milestone.completed) return false;
  const firstPending = sortedMilestones.value.find(m => m.status !== 'completed' && !m.completed);
  return firstPending && firstPending.id === milestone.id;
}

function typeColor(type) {
  if (type === 'assessment') return 'warning';
  if (type === 'review') return 'secondary';
  return 'primary';
}

function typeIcon(type) {
  if (type === 'assessment') return 'mdi-clipboard-check-outline';
  if (type === 'review') return 'mdi-book-sync-outline';
  return 'mdi-book-open-page-variant-outline';
}

function formatDueDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatCompletedDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function toggleComplete(milestoneId) {
  const updated = toggleMilestoneState(props.milestones, milestoneId);
  emit('update:milestones', updated);
}

/**
 * Reorders milestone up (-1) or down (+1) and updates order indices
 */
function moveMilestone(currentIndex, delta) {
  const targetIndex = currentIndex + delta;
  const list = [...sortedMilestones.value];
  if (targetIndex < 0 || targetIndex >= list.length) return;

  const temp = list[currentIndex];
  list[currentIndex] = list[targetIndex];
  list[targetIndex] = temp;

  // Re-index orders to 1..M
  const reindexed = list.map((m, idx) => ({
    ...m,
    order: idx + 1
  }));

  emit('update:milestones', reindexed);
}
</script>

<style scoped>
.border-subtle {
  border: 1px solid var(--color-border);
}
.border-completed {
  border: 1px solid rgba(63, 128, 97, 0.35);
  background-color: var(--color-bg-secondary) !important;
}
.border-focus {
  border: 1.5px solid var(--color-primary-orange) !important;
  background-color: #FFFDF8 !important;
  box-shadow: 0 2px 10px rgba(233, 120, 36, 0.12);
}
.border-dashed {
  border: 1.5px dashed var(--color-border);
}
.opacity-70 {
  opacity: 0.8;
}
.transition-all {
  transition: all 0.2s ease;
}
.max-w-400 {
  max-width: 400px;
}
</style>
