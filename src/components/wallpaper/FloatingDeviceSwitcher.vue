<template>
  <div
    class="floating-device-switcher"
    :class="{ 'is-collapsed': isCollapsed }"
    role="toolbar"
    aria-label="Device wallpaper switcher"
  >
    <div class="switcher-dock-container">
      <!-- Main Switcher Buttons Pill -->
      <div class="switcher-pill-body">
        <!-- Mobile Device Switcher Button -->
        <button
          type="button"
          class="device-switcher-btn"
          :class="{ 'is-active': modelValue === 'MOBILE' }"
          aria-label="Switch to Mobile wallpaper (1080×1920)"
          :aria-pressed="modelValue === 'MOBILE'"
          title="Mobile Wallpaper (1080×1920)"
          @click="$emit('update:modelValue', 'MOBILE')"
        >
          <i class="mdi mdi-cellphone" style="font-size: 18px;" />
        </button>

        <!-- Desktop Device Switcher Button -->
        <button
          type="button"
          class="device-switcher-btn"
          :class="{ 'is-active': modelValue === 'DESKTOP' }"
          aria-label="Switch to Desktop wallpaper (1920×1080)"
          :aria-pressed="modelValue === 'DESKTOP'"
          title="Desktop Wallpaper (1920×1080)"
          @click="$emit('update:modelValue', 'DESKTOP')"
        >
          <i class="mdi mdi-monitor" style="font-size: 18px;" />
        </button>

        <!-- Subtle Slide-Out / Tuck Toggle Tab (Desktop Only) -->
        <button
          type="button"
          class="switcher-tuck-btn d-none d-md-flex"
          :aria-label="isCollapsed ? 'Expand device switcher' : 'Slide away device switcher'"
          :title="isCollapsed ? 'Expand switcher' : 'Slide away'"
          @click="isCollapsed = !isCollapsed"
        >
          <i :class="['mdi', isCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left']" style="font-size: 14px;" />
        </button>
      </div>

      <!-- Mini Edge Tab Handle when Collapsed -->
      <button
        v-if="isCollapsed"
        type="button"
        class="switcher-edge-tab d-none d-md-flex"
        title="Show device switcher"
        aria-label="Show device switcher"
        @click="isCollapsed = false"
      >
        <i
          :class="['mdi', modelValue === 'MOBILE' ? 'mdi-cellphone' : 'mdi-monitor']"
          style="font-size: 16px; color: var(--color-primary-orange, #E97824);"
        />
        <i class="mdi mdi-chevron-right" style="font-size: 12px; color: var(--color-primary-orange, #E97824);" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  modelValue: {
    type: String,
    default: 'MOBILE',
    validator: (val) => ['MOBILE', 'DESKTOP'].includes(val)
  }
});

defineEmits(['update:modelValue']);

const isCollapsed = ref(false);

defineExpose({
  isCollapsed
});
</script>

<style scoped>
.floating-device-switcher {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 25;
  pointer-events: auto;
  user-select: none;
  animation: slideInFromLeft 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInFromLeft {
  0% {
    transform: translateY(-50%) translateX(-50px);
    opacity: 0;
  }
  100% {
    transform: translateY(-50%) translateX(0);
    opacity: 1;
  }
}

.switcher-dock-container {
  display: flex;
  align-items: center;
  position: relative;
}

.switcher-pill-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 5px;
  background: rgba(255, 253, 248, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid var(--color-border, #E7DED0);
  box-shadow: 0 4px 16px rgba(41, 37, 31, 0.09), 0 1px 3px rgba(41, 37, 31, 0.05);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.floating-device-switcher.is-collapsed .switcher-pill-body {
  transform: translateX(-56px);
  opacity: 0;
  pointer-events: none;
}

.switcher-edge-tab {
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 6px 6px 14px;
  background: rgba(255, 253, 248, 0.96);
  border: 1px solid var(--color-border, #E7DED0);
  border-left: none;
  border-radius: 0 16px 16px 0;
  box-shadow: 2px 4px 12px rgba(233, 120, 36, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
  animation: slideTabOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideTabOut {
  from {
    transform: translateY(-50%) translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(-50%) translateX(0);
    opacity: 1;
  }
}

.switcher-edge-tab:hover {
  background: var(--color-soft-orange, #FCE8D8);
  padding-right: 8px;
}

.device-switcher-btn {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: none;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-text-secondary, #756D62);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.device-switcher-btn:hover:not(.is-active) {
  background: var(--color-soft-orange, #FCE8D8);
  color: var(--color-primary-orange, #E97824);
  transform: scale(1.05);
}

/* Active Highlight (Orange) */
.device-switcher-btn.is-active {
  background: var(--color-primary-orange, #E97824) !important;
  color: #FFFFFF !important;
  box-shadow: 0 2px 8px rgba(233, 120, 36, 0.38);
}

.device-switcher-btn.is-active:hover {
  background: var(--color-primary-hover, #D96718) !important;
  transform: scale(1.05);
}

.switcher-tuck-btn {
  width: 34px;
  height: 18px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-disabled, #A39A8D);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-top: -1px;
}

.switcher-tuck-btn:hover {
  color: var(--color-primary-orange, #E97824);
  background: rgba(233, 120, 36, 0.08);
}

/* Tablet & Mobile Breakpoint (< 1024px) */
@media (max-width: 1023px) {
  .floating-device-switcher {
    left: 12px;
    top: 12px;
    transform: none !important;
    animation: slideInFromTop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes slideInFromTop {
    0% {
      transform: translateY(-20px);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .switcher-pill-body {
    flex-direction: row;
    border-radius: 14px;
    gap: 4px;
    padding: 4px;
  }

  .device-switcher-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }
}
</style>
