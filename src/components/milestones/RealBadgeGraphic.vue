<template>
  <div class="real-badge-container" :style="{ width: `${size}px`, height: `${Math.round(size * 1.15)}px` }">
    <svg
      :width="size"
      :height="Math.round(size * 1.15)"
      viewBox="0 0 64 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="real-badge-svg"
      :class="{ 'badge-unlocked': unlocked, 'badge-locked': !unlocked }"
    >
      <defs>
        <!-- Filter for 3D depth and drop shadows -->
        <filter :id="`badge-shadow-${uid}`" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" flood-color="#000000" flood-opacity="0.32" />
        </filter>
        <filter :id="`inner-shadow-${uid}`" x="-20%" y="-20%" width="140%" height="140%">
          <feComponentTransfer in="SourceAlpha">
            <feFuncA type="linear" slope="0.7"/>
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feOffset dx="0" dy="1.5"/>
          <feComposite operator="out" in2="SourceGraphic" result="inverse"/>
          <feFlood flood-color="#000000" flood-opacity="0.4" result="color"/>
          <feComposite operator="in" in2="inverse" result="shadow"/>
          <feComposite operator="over" in2="SourceGraphic"/>
        </filter>

        <!-- Grayscale / Locked Medal Gradients -->
        <linearGradient :id="`locked-metal-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#94A3B8" />
          <stop offset="35%" stop-color="#CBD5E1" />
          <stop offset="70%" stop-color="#64748B" />
          <stop offset="100%" stop-color="#475569" />
        </linearGradient>
        <linearGradient :id="`locked-core-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#475569" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>
        <linearGradient :id="`locked-ribbon-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#64748B" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>

        <!-- Unlocked Gradients: FIRST_STEP (Bronze / Emerald Seedling) -->
        <linearGradient :id="`bronze-bezel-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FCD34D" />
          <stop offset="25%" stop-color="#D97706" />
          <stop offset="50%" stop-color="#FBBF24" />
          <stop offset="85%" stop-color="#B45309" />
          <stop offset="100%" stop-color="#78350F" />
        </linearGradient>
        <linearGradient :id="`emerald-ribbon-${uid}`" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#059669" />
          <stop offset="50%" stop-color="#10B981" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>
        <radialGradient :id="`emerald-core-${uid}`" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#064E3B" />
          <stop offset="70%" stop-color="#022C22" />
          <stop offset="100%" stop-color="#011B14" />
        </radialGradient>

        <!-- Unlocked Gradients: QUARTER_WAY (Silver / Cobalt Compass) -->
        <linearGradient :id="`silver-bezel-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="30%" stop-color="#E2E8F0" />
          <stop offset="55%" stop-color="#94A3B8" />
          <stop offset="85%" stop-color="#CBD5E1" />
          <stop offset="100%" stop-color="#64748B" />
        </linearGradient>
        <linearGradient :id="`cyan-ribbon-${uid}`" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0284C7" />
          <stop offset="50%" stop-color="#38BDF8" />
          <stop offset="100%" stop-color="#0369A1" />
        </linearGradient>
        <radialGradient :id="`cyan-core-${uid}`" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#082F49" />
          <stop offset="75%" stop-color="#0C4A6E" />
          <stop offset="100%" stop-color="#071E30" />
        </radialGradient>

        <!-- Unlocked Gradients: HALFWAY (Golden Steel / Mountain Ridge) -->
        <linearGradient :id="`gold-bezel-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FEF08A" />
          <stop offset="25%" stop-color="#F59E0B" />
          <stop offset="50%" stop-color="#FDE047" />
          <stop offset="85%" stop-color="#D97706" />
          <stop offset="100%" stop-color="#92400E" />
        </linearGradient>
        <linearGradient :id="`blue-ribbon-${uid}`" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#2563EB" />
          <stop offset="50%" stop-color="#60A5FA" />
          <stop offset="100%" stop-color="#1D4ED8" />
        </linearGradient>
        <radialGradient :id="`blue-core-${uid}`" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#172554" />
          <stop offset="75%" stop-color="#1E3A8A" />
          <stop offset="100%" stop-color="#0F172A" />
        </radialGradient>

        <!-- Unlocked Gradients: ALMOST_THERE (Amethyst / Purple Stream) -->
        <linearGradient :id="`purple-bezel-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F5D0FE" />
          <stop offset="25%" stop-color="#C084FC" />
          <stop offset="55%" stop-color="#A855F7" />
          <stop offset="85%" stop-color="#7E22CE" />
          <stop offset="100%" stop-color="#581C87" />
        </linearGradient>
        <linearGradient :id="`purple-ribbon-${uid}`" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#7C3AED" />
          <stop offset="50%" stop-color="#A78BFA" />
          <stop offset="100%" stop-color="#6D28D9" />
        </linearGradient>
        <radialGradient :id="`purple-core-${uid}`" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#2E1065" />
          <stop offset="75%" stop-color="#3B0764" />
          <stop offset="100%" stop-color="#19042E" />
        </radialGradient>

        <!-- Unlocked Gradients: ACHIEVER (Imperial Grand Gold Sunburst) -->
        <linearGradient :id="`grandgold-bezel-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFBEB" />
          <stop offset="20%" stop-color="#FCD34D" />
          <stop offset="45%" stop-color="#F59E0B" />
          <stop offset="75%" stop-color="#D97706" />
          <stop offset="100%" stop-color="#78350F" />
        </linearGradient>
        <linearGradient :id="`gold-ribbon-${uid}`" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#EA580C" />
          <stop offset="50%" stop-color="#F59E0B" />
          <stop offset="100%" stop-color="#C2410C" />
        </linearGradient>
        <radialGradient :id="`grandgold-core-${uid}`" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#451A03" />
          <stop offset="70%" stop-color="#78350F" />
          <stop offset="100%" stop-color="#270D02" />
        </radialGradient>
      </defs>

      <!-- 1. Real Ribbon Tails Hanging Below Medal -->
      <g :filter="`url(#badge-shadow-${uid})`">
        <!-- Left ribbon tail -->
        <path
          d="M20 38 L14 66 L23 60 L28 42 Z"
          :fill="unlocked ? ribbonFill : `url(#locked-ribbon-${uid})`"
          stroke="rgba(0,0,0,0.18)"
          stroke-width="0.75"
        />
        <!-- Right ribbon tail -->
        <path
          d="M44 38 L50 66 L41 60 L36 42 Z"
          :fill="unlocked ? ribbonFill : `url(#locked-ribbon-${uid})`"
          stroke="rgba(0,0,0,0.18)"
          stroke-width="0.75"
        />
        <!-- Ribbon center fold shadow -->
        <path
          d="M26 40 L32 46 L38 40 Z"
          fill="rgba(0,0,0,0.25)"
        />
      </g>

      <!-- 2. Starburst / Laurel Ray Trim for High Tiers -->
      <g v-if="unlocked && badgeKey === 'ACHIEVER'">
        <circle cx="32" cy="27" r="24" fill="none" stroke="#FDE68A" stroke-width="1.5" stroke-dasharray="2 3" opacity="0.8" />
        <!-- 8-point subtle starburst rim -->
        <path
          d="M32 2 L35 7 L40 4 L41 10 L47 9 L45 15 L51 17 L47 22 L52 27 L47 32 L51 37 L45 39 L47 45 L41 44 L40 50 L35 47 L32 52 L29 47 L24 50 L23 44 L17 45 L19 39 L13 37 L17 32 L12 27 L17 22 L13 17 L19 15 L17 9 L23 10 L24 4 L29 7 Z"
          fill="url(#grandgold-bezel-)"
          opacity="0.3"
        />
      </g>

      <!-- 3. Outer Metallic Medallion Body -->
      <g :filter="`url(#badge-shadow-${uid})`">
        <!-- Outer Gold/Bronze Rim -->
        <circle
          cx="32"
          cy="27"
          r="22"
          :fill="unlocked ? bezelFill : `url(#locked-metal-${uid})`"
          stroke="rgba(0,0,0,0.25)"
          stroke-width="1"
        />
        <!-- Beveled Outer Ridge Ring -->
        <circle
          cx="32"
          cy="27"
          r="19.5"
          fill="none"
          :stroke="unlocked ? '#FFFFFF' : '#CBD5E1'"
          stroke-width="0.9"
          stroke-opacity="0.55"
        />
        <circle
          cx="32"
          cy="27"
          r="18.5"
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          stroke-width="0.75"
        />

        <!-- Inner Core Disc -->
        <circle
          cx="32"
          cy="27"
          r="16.5"
          :fill="unlocked ? coreFill : `url(#locked-core-${uid})`"
        />
      </g>

      <!-- 4. Metallic Badge Insignia / Emblem -->
      <!-- UNLOCKED INSIGNIA -->
      <g v-if="unlocked">
        <!-- FIRST_STEP: Sprout / Seedling -->
        <g v-if="badgeKey === 'FIRST_STEP'">
          <path
            d="M32 37 C32 30, 26 27, 24 22 C28 22, 33 24, 33 27 C34 23, 38 18, 42 19 C42 24, 37 28, 34 29 L34 37 Z"
            fill="#34D399"
          />
          <path
            d="M32 37 L32 29 C32 26 31 24 27 23.5 C28 26 31 27 32 29 Z"
            fill="#A7F3D0"
          />
          <circle cx="32" cy="37" r="1.5" fill="#FCD34D" />
        </g>

        <!-- QUARTER_WAY: Compass Needle / Star -->
        <g v-else-if="badgeKey === 'QUARTER_WAY'">
          <!-- Outer Compass Ring -->
          <circle cx="32" cy="27" r="12" fill="none" stroke="#7DD3FC" stroke-width="0.8" opacity="0.6" stroke-dasharray="1.5 2" />
          <!-- Star/Needle -->
          <polygon points="32,16 35,25 43,27 35,29 32,38 29,29 21,27 29,25" fill="#38BDF8" />
          <polygon points="32,16 32,27 43,27" fill="#E0F2FE" />
          <polygon points="32,38 32,27 21,27" fill="#0284C7" />
          <circle cx="32" cy="27" r="2" fill="#FFFFFF" />
        </g>

        <!-- HALFWAY: Mountain Summit Ridge -->
        <g v-else-if="badgeKey === 'HALFWAY'">
          <!-- Background Sun Rays -->
          <circle cx="32" cy="22" r="4" fill="#FDE047" opacity="0.9" />
          <!-- Mountain peaks -->
          <polygon points="21,36 28,24 35,36" fill="#1E40AF" />
          <polygon points="28,24 35,36 32,36 29.5,30 27,33" fill="#60A5FA" />
          <!-- Big peak -->
          <polygon points="27,36 34,18 43,36" fill="#3B82F6" />
          <!-- Snowcap -->
          <polygon points="34,18 31.5,23 33,24 34,22.5 35.5,24 37,23" fill="#EFF6FF" />
        </g>

        <!-- ALMOST_THERE: Stream & Starlight -->
        <g v-else-if="badgeKey === 'ALMOST_THERE'">
          <path
            d="M21 34 C25 32, 29 35, 33 33 C37 31, 40 33, 43 32"
            stroke="#C084FC"
            stroke-width="2"
            stroke-linecap="round"
            fill="none"
          />
          <path
            d="M22 37 C26 35, 30 38, 34 36 C38 34, 40 36, 42 35"
            stroke="#E9D5FF"
            stroke-width="1.2"
            stroke-linecap="round"
            fill="none"
            opacity="0.8"
          />
          <!-- 4-point Diamond Star -->
          <polygon points="32,16 34,22 40,24 34,26 32,32 30,26 24,24 30,22" fill="#F0ABFC" />
          <polygon points="32,16 32,24 40,24" fill="#FFFFFF" />
        </g>

        <!-- ACHIEVER: Golden Trophy & Sunburst Crown -->
        <g v-else-if="badgeKey === 'ACHIEVER'">
          <!-- Laurel Leaves -->
          <path
            d="M23 32 C21 27 22 22 26 19 C25 22 25 26 27 28"
            stroke="#FDE047"
            stroke-width="1.2"
            fill="none"
          />
          <path
            d="M41 32 C43 27 42 22 38 19 C39 22 39 26 37 28"
            stroke="#FDE047"
            stroke-width="1.2"
            fill="none"
          />
          <!-- Center Crown / Trophy -->
          <path
            d="M26 21 L32 25 L38 21 L36 30 C36 33 33.5 34 32 34 C30.5 34 28 33 28 30 Z"
            fill="#FEF08A"
          />
          <path
            d="M30 34 L34 34 L35 37 L29 37 Z"
            fill="#F59E0B"
          />
          <!-- Sparkling Crest Star -->
          <polygon points="32,16 33.5,19 36,19.5 34,21 34.5,23.5 32,22 29.5,23.5 30,21 28,19.5 30.5,19" fill="#FFFFFF" />
        </g>
      </g>

      <!-- LOCKED INSIGNIA: Authentic Metallic Padlock & Silhouette -->
      <g v-else>
        <!-- Metallic Padlock Shackle -->
        <path
          d="M28 25 L28 22 C28 19.8 29.8 18 32 18 C34.2 18 36 19.8 36 22 L36 25"
          stroke="#94A3B8"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"
        />
        <!-- Padlock Body -->
        <rect
          x="26"
          y="24"
          width="12"
          height="10"
          rx="2"
          fill="#475569"
          stroke="#CBD5E1"
          stroke-width="0.8"
        />
        <!-- Keyhole -->
        <circle cx="32" cy="28" r="1.3" fill="#1E293B" />
        <path d="M31.4 28.5 L32.6 28.5 L32.3 31.5 L31.7 31.5 Z" fill="#1E293B" />
      </g>

      <!-- 5. 3D Bevel Highlight Glare / Specular Sheen across Top Curve -->
      <path
        d="M17 19 C20 12, 26 8, 33 8 C38 8, 43 10, 46 14 C41 12, 35 11, 29 13 C24 15, 20 18, 17 19 Z"
        fill="#FFFFFF"
        :opacity="unlocked ? 0.45 : 0.2"
      />
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  badgeKey: {
    type: String,
    required: true
  },
  unlocked: {
    type: Boolean,
    default: false
  },
  size: {
    type: Number,
    default: 56
  }
});

// Unique ID for SVG gradient isolation
const uid = computed(() => {
  return `${props.badgeKey.toLowerCase()}-${props.unlocked ? 'unlocked' : 'locked'}`;
});

const bezelFill = computed(() => {
  switch (props.badgeKey) {
    case 'FIRST_STEP':
      return `url(#bronze-bezel-${uid.value})`;
    case 'QUARTER_WAY':
      return `url(#silver-bezel-${uid.value})`;
    case 'HALFWAY':
      return `url(#gold-bezel-${uid.value})`;
    case 'ALMOST_THERE':
      return `url(#purple-bezel-${uid.value})`;
    case 'ACHIEVER':
      return `url(#grandgold-bezel-${uid.value})`;
    default:
      return `url(#gold-bezel-${uid.value})`;
  }
});

const coreFill = computed(() => {
  switch (props.badgeKey) {
    case 'FIRST_STEP':
      return `url(#emerald-core-${uid.value})`;
    case 'QUARTER_WAY':
      return `url(#cyan-core-${uid.value})`;
    case 'HALFWAY':
      return `url(#blue-core-${uid.value})`;
    case 'ALMOST_THERE':
      return `url(#purple-core-${uid.value})`;
    case 'ACHIEVER':
      return `url(#grandgold-core-${uid.value})`;
    default:
      return `url(#grandgold-core-${uid.value})`;
  }
});

const ribbonFill = computed(() => {
  switch (props.badgeKey) {
    case 'FIRST_STEP':
      return `url(#emerald-ribbon-${uid.value})`;
    case 'QUARTER_WAY':
      return `url(#cyan-ribbon-${uid.value})`;
    case 'HALFWAY':
      return `url(#blue-ribbon-${uid.value})`;
    case 'ALMOST_THERE':
      return `url(#purple-ribbon-${uid.value})`;
    case 'ACHIEVER':
      return `url(#gold-ribbon-${uid.value})`;
    default:
      return `url(#gold-ribbon-${uid.value})`;
  }
});
</script>

<style scoped>
.real-badge-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.real-badge-svg {
  overflow: visible;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.16));
}

.badge-unlocked {
  filter: drop-shadow(0 3px 8px rgba(233, 120, 36, 0.32));
}

.real-badge-container:hover {
  transform: translateY(-2px) scale(1.05);
}
</style>
