<template>
  <v-card id="section-badges" color="surface" class="pa-5 mb-5">
    <div class="d-flex align-center justify-space-between mb-4 gap-3">
      <div class="section-header-row">
        <v-avatar color="primary" size="32" class="flex-shrink-0">
          <v-icon icon="mdi-trophy-variant" color="white" size="18" />
        </v-avatar>
        <div class="section-header-content">
          <h2 class="section-header-title">Achievements & Badges</h2>
          <span class="section-header-subtitle">Unlock 5 nature milestone rewards as your deadline approaches</span>
        </div>
      </div>
      <v-chip size="small" color="primary" variant="tonal" class="font-weight-bold">
        {{ unlockedCount }} / 5 Unlocked
      </v-chip>
    </div>

    <!-- Motivational Stage & Quote Banner -->
    <v-sheet
      color="surface-variant"
      class="pa-3 rounded-lg mb-4 d-flex align-start gap-3 border"
    >
      <v-icon icon="mdi-format-quote-open" color="primary" size="22" class="mt-n1 me-1 flex-shrink-0" />
      <div>
        <p class="text-caption font-italic text-primary-text mb-1">
          "{{ motivation.quote }}"
        </p>
        <div class="d-flex align-center gap-1">
          <v-icon icon="mdi-hiking" size="14" color="primary" />
          <span class="text-caption text-medium-emphasis font-weight-medium">
            Stage: {{ motivation.stage }}
          </span>
        </div>
      </div>
    </v-sheet>

    <!-- 5 Nature Badges Row -->
    <v-row dense>
      <v-col
        v-for="badge in badges"
        :key="badge.key"
        cols="12"
        sm="6"
        md="2"
        class="flex-grow-1"
      >
        <v-tooltip location="top" :text="badge.description">
          <template #activator="{ props }">
            <v-sheet
              v-bind="props"
              :color="badge.unlocked ? 'surface' : 'surface-variant'"
              :class="[
                'pa-3 rounded-lg text-center h-100 transition-all border d-flex flex-column align-center justify-space-between',
                badge.unlocked ? 'border-unlocked-badge' : 'border-locked-badge'
              ]"
            >
              <div class="mb-2 d-flex justify-center align-center">
                <RealBadgeGraphic
                  :badge-key="badge.key"
                  :unlocked="badge.unlocked"
                  :size="52"
                />
              </div>

              <div class="text-caption font-weight-bold text-primary-text text-truncate w-100">
                {{ badge.name }}
              </div>
              <div class="text-caption text-medium-emphasis font-weight-light text-truncate w-100 mb-1" style="font-size: 0.725rem !important;">
                {{ badge.natureSymbol }}
              </div>

              <v-chip
                size="x-small"
                :color="badge.unlocked ? 'success' : 'surface'"
                :variant="badge.unlocked ? 'tonal' : 'outlined'"
                class="mt-2 font-weight-medium"
              >
                <v-icon v-if="badge.unlocked" icon="mdi-check" start size="10" />
                {{ badge.unlocked ? 'Unlocked' : (badge.thresholdPct ? `${badge.thresholdPct}%` : '1st Step') }}
              </v-chip>
            </v-sheet>
          </template>
        </v-tooltip>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { evaluateBadges, getMotivationalQuote } from '../../services/badgeEngine.js';
import { calculateProgress } from '../../services/milestoneEngine.js';
import RealBadgeGraphic from './RealBadgeGraphic.vue';

const props = defineProps({
  milestones: {
    type: Array,
    required: true
  }
});

const progressPct = computed(() => {
  return calculateProgress(props.milestones);
});

const badges = computed(() => {
  return evaluateBadges(props.milestones);
});

const unlockedCount = computed(() => {
  return badges.value.filter(b => b.unlocked).length;
});

const motivation = computed(() => {
  return getMotivationalQuote(progressPct.value);
});
</script>

<style scoped>
.border-unlocked-badge {
  border: 1.5px solid var(--color-primary-orange) !important;
  box-shadow: 0 2px 8px rgba(233, 120, 36, 0.12);
}

.border-locked-badge {
  border: 1px solid var(--color-border) !important;
  opacity: 0.75;
}

.transition-all {
  transition: all 0.2s ease-in-out;
}
</style>
