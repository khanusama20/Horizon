<template>
  <Transition name="banner-slide">
    <div
      v-if="showInvitation"
      class="tour-invitation-banner pa-3 pa-sm-4 rounded-xl mb-4 border shadow-sm"
      role="region"
      aria-label="Horizon Guided Tour Invitation"
    >
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <!-- Left: Compass Avatar + Heading & Description -->
        <div class="d-flex align-center gap-3 min-w-0 flex-grow-1">
          <div class="tour-avatar-badge flex-shrink-0 d-flex align-center justify-center rounded-circle">
            <i class="mdi mdi-compass-outline text-white" style="font-size: 22px;"></i>
          </div>

          <div class="min-w-0">
            <div class="d-flex align-center gap-2 mb-1 flex-wrap">
              <h3 class="text-subtitle-1 font-weight-bold mb-0 text-primary-text">
                New to Horizon?
              </h3>
              <span class="tour-chip font-weight-bold">
                Optional 2-Min Tour
              </span>
            </div>
            <p class="text-caption text-medium-emphasis mb-0 line-height-relaxed max-w-700">
              Would you like a complete guided tour? Learn how to create goals, import courses, track milestones, unlock achievements, customize your wallpaper, and export it.
            </p>
          </div>
        </div>

        <!-- Right: Action Buttons -->
        <div class="d-flex align-center gap-2 flex-wrap tour-actions-wrapper">
          <button
            type="button"
            class="tour-secondary-btn font-weight-medium text-caption"
            aria-label="Dismiss tour invitation and explore on your own"
            @click="dismissInvitation"
          >
            I'll Explore Myself
          </button>

          <button
            type="button"
            class="tour-primary-btn font-weight-bold shadow-orange text-caption"
            aria-label="Start guided interactive tour"
            @click="startTour"
          >
            <i class="mdi mdi-play-circle-outline me-1" style="font-size: 16px;"></i>
            Start Tour
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useTourGuide } from '../../composables/useTourGuide.js';

const { showInvitation, startTour, dismissInvitation } = useTourGuide();
</script>

<style scoped>
.tour-invitation-banner {
  background: linear-gradient(135deg, #FFFDF8 0%, #FAF5EC 100%) !important;
  border: 1px solid var(--color-border) !important;
  transition: all 0.25s ease;
}

.tour-avatar-badge {
  width: 40px;
  height: 40px;
  background-color: var(--color-primary-orange) !important;
  box-shadow: 0 2px 6px rgba(233, 120, 36, 0.25);
}

.tour-chip {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: var(--color-soft-orange);
  color: var(--color-primary-orange);
  border: 1px solid rgba(233, 120, 36, 0.2);
}

.tour-primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 16px;
  border-radius: 8px;
  background-color: var(--color-primary-orange);
  color: #FFFFFF;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tour-primary-btn:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
}

.tour-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 14px;
  border-radius: 8px;
  background-color: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tour-secondary-btn:hover {
  background-color: rgba(41, 37, 31, 0.04);
  color: var(--color-text-primary);
}

.max-w-700 {
  max-width: 700px;
}

.line-height-relaxed {
  line-height: 1.45 !important;
}

/* Slide Transition */
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.3s ease;
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.tour-actions-wrapper {
  margin-left: auto;
}

@media (max-width: 599.98px) {
  .tour-actions-wrapper {
    width: 100% !important;
    margin-left: 0 !important;
    margin-top: 8px !important;
    display: flex !important;
    gap: 8px !important;
  }
  .tour-actions-wrapper .tour-primary-btn,
  .tour-actions-wrapper .tour-secondary-btn {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    text-align: center !important;
    padding: 8px 6px !important;
    font-size: 0.75rem !important;
    white-space: nowrap !important;
  }
}
</style>
