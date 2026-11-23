<template>
  <div class="tour-overlay-root">
    <!-- SVG Spotlight Mask Overlay -->
    <svg class="tour-svg-mask" aria-hidden="true">
      <defs>
        <mask id="tour-spotlight-mask">
          <!-- White fills whole screen (opaque overlay) -->
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <!-- Black cutout creates transparent window over target element -->
          <rect
            v-if="targetRect"
            :x="targetRect.x - padding"
            :y="targetRect.y - padding"
            :width="targetRect.width + (padding * 2)"
            :height="targetRect.height + (padding * 2)"
            :rx="radius"
            :ry="radius"
            fill="black"
          />
        </mask>
      </defs>

      <!-- Shaded backdrop with mask applied -->
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(15, 23, 42, 0.70)"
        mask="url(#tour-spotlight-mask)"
        class="tour-backdrop-rect"
        @click="$emit('overlay-click')"
      />
    </svg>

    <!-- Glowing Orange Spotlight Ring around target element -->
    <div
      v-if="targetRect"
      class="tour-spotlight-ring"
      :style="{
        top: `${targetRect.y - padding}px`,
        left: `${targetRect.x - padding}px`,
        width: `${targetRect.width + (padding * 2)}px`,
        height: `${targetRect.height + (padding * 2)}px`,
        borderRadius: `${radius}px`
      }"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

const props = defineProps({
  targetSelector: {
    type: String,
    default: ''
  },
  padding: {
    type: Number,
    default: 8
  },
  radius: {
    type: Number,
    default: 14
  }
});

const emit = defineEmits(['overlay-click', 'target-found', 'target-missing']);

const targetRect = ref(null);
let animationFrameId = null;
let scrollTimeoutId = null;

function updateTargetRect() {
  if (typeof document === 'undefined') return;
  if (!props.targetSelector) {
    targetRect.value = null;
    emit('target-missing');
    return;
  }

  const el = document.querySelector(props.targetSelector);
  if (el) {
    const rect = el.getBoundingClientRect();
    // Only update if element has visible dimensions
    if (rect.width > 0 && rect.height > 0) {
      targetRect.value = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      };
      emit('target-found', targetRect.value);
      return;
    }
  }

  targetRect.value = null;
  emit('target-missing');
}

function scrollToTarget() {
  if (!props.targetSelector) return;
  const el = document.querySelector(props.targetSelector);
  if (el) {
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      // Fallback if smooth scrolling fails
      el.scrollIntoView(true);
    }
  }
}

function onWindowScrollOrResize() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(() => {
    updateTargetRect();
  });
}

watch(
  () => props.targetSelector,
  async () => {
    await nextTick();
    scrollToTarget();
    // Wait slightly for scroll animation to settle
    if (scrollTimeoutId) clearTimeout(scrollTimeoutId);
    scrollTimeoutId = setTimeout(() => {
      updateTargetRect();
    }, 150);
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('resize', onWindowScrollOrResize, { passive: true });
  window.addEventListener('scroll', onWindowScrollOrResize, { passive: true });
  updateTargetRect();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowScrollOrResize);
  window.removeEventListener('scroll', onWindowScrollOrResize);
  if (scrollTimeoutId) clearTimeout(scrollTimeoutId);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
});

defineExpose({
  updateTargetRect,
  scrollToTarget,
  getTargetRect: () => targetRect.value
});
</script>

<style scoped>
.tour-overlay-root {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9990;
  pointer-events: none;
}

.tour-svg-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

.tour-backdrop-rect {
  pointer-events: auto;
  cursor: pointer;
}

.tour-spotlight-ring {
  position: absolute;
  pointer-events: none;
  border: 2px solid var(--color-primary-orange);
  box-shadow: 0 0 0 4px rgba(233, 120, 36, 0.25), 0 0 20px rgba(233, 120, 36, 0.35);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  animation: pulse-ring 2s infinite ease-in-out;
}

@keyframes pulse-ring {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(233, 120, 36, 0.2), 0 0 15px rgba(233, 120, 36, 0.25);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(233, 120, 36, 0.35), 0 0 24px rgba(233, 120, 36, 0.45);
  }
}
</style>
