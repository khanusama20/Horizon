<template>
  <v-footer
    color="surface"
    border="t"
    class="py-4 px-4 px-md-6 d-flex flex-column gap-3 text-caption text-medium-emphasis app-footer-bar"
  >
    <div class="d-flex flex-wrap justify-space-between align-center gap-3 w-100 max-width-1400 mx-auto">
      <div class="d-flex align-center gap-2">
        <v-avatar color="primary" size="24" class="me-1">
          <v-icon icon="mdi-image-filter-hdr" color="white" size="14" />
        </v-avatar>
        <span class="font-weight-bold text-primary-text">Horizon</span>
        <span class="text-medium-emphasis">— Turn Your Deadlines Into Daily Motivation.</span>
      </div>

      <div class="d-flex flex-wrap align-center gap-2 text-caption">
        <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
          Contest MVP
        </v-chip>
        <span>•</span>
        <span>Client-Side LocalStorage</span>
        <span>•</span>
        <span>Handshake AI Skills Studio × Google Contest</span>
      </div>
    </div>

    <!-- Product Note on Static PNG Wallpapers -->
    <div class="w-100 max-width-1400 mx-auto pt-2 border-top-subtle d-flex flex-wrap justify-space-between align-center gap-2">
      <div class="d-flex align-center text-caption text-disabled gap-2">
        <v-icon icon="mdi-information-outline" size="14" color="primary" class="flex-shrink-0" />
        <span>Wallpapers are exported as high-resolution static PNGs. Re-export whenever you complete milestones to refresh your visual progress.</span>
      </div>
      <span class="text-caption text-disabled">Plan your progress. Celebrate every milestone. Keep your goal in sight.</span>
    </div>
  </v-footer>
</template>

<script setup>
</script>

<style scoped>
.app-footer-bar {
  border-top: 1px solid var(--color-border) !important;
  background-color: var(--color-surface-card) !important;
}

.max-width-1400 {
  max-width: 1400px;
}

.border-top-subtle {
  border-top: 1px solid var(--color-border);
}
</style>
