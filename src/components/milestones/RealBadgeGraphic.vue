<template>
  <div class="luxury-badge-wrapper" :style="{ width: `${size}px`, height: `${Math.round(size * 1.13)}px` }">
    <svg
      :width="size"
      :height="Math.round(size * 1.13)"
      viewBox="0 0 76 86"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="luxury-badge-svg"
      :class="{ 'badge-unlocked': unlocked, 'badge-locked': !unlocked }"
      role="img"
      :aria-label="`${badgeKey}: ${unlocked ? 'Unlocked' : 'Locked'} Luxury Gold Badge`"
    >
      <defs>
        <!-- 3D Realistic Soft Drop Shadow for Entire Badge -->
        <filter :id="`luxury-shadow-${uid}`" x="-20%" y="-15%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.38" />
        </filter>

        <!-- Inner Bevel Shadow for Enamel Coin Face -->
        <filter :id="`coin-depth-${uid}`" x="-20%" y="-20%" width="140%" height="140%">
          <feComponentTransfer in="SourceAlpha">
            <feFuncA type="linear" slope="0.8" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feOffset dx="0" dy="1.5" />
          <feComposite operator="out" in2="SourceGraphic" result="inverse" />
          <feFlood flood-color="#000000" flood-opacity="0.6" result="color" />
          <feComposite operator="in" in2="inverse" result="shadow" />
          <feComposite operator="over" in2="SourceGraphic" />
        </filter>

        <!-- 24K Multi-Stop Luxury Gold Gradients (Reference: Freepik Luxury Gold Collection) -->
        <linearGradient :id="`gold-rim-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF8D6" />
          <stop offset="18%" stop-color="#FCD34D" />
          <stop offset="38%" stop-color="#F59E0B" />
          <stop offset="55%" stop-color="#FEF3C7" />
          <stop offset="72%" stop-color="#D97706" />
          <stop offset="88%" stop-color="#B45309" />
          <stop offset="100%" stop-color="#78350F" />
        </linearGradient>

        <linearGradient :id="`gold-highlight-${uid}`" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#B45309" />
          <stop offset="30%" stop-color="#F59E0B" />
          <stop offset="50%" stop-color="#FFFFFF" />
          <stop offset="70%" stop-color="#FBBF24" />
          <stop offset="100%" stop-color="#92400E" />
        </linearGradient>

        <linearGradient :id="`gold-fill-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FEF08A" />
          <stop offset="45%" stop-color="#F59E0B" />
          <stop offset="100%" stop-color="#B45309" />
        </linearGradient>

        <!-- Deep Obsidian / Onyx Center Enamel Disc -->
        <radialGradient :id="`onyx-core-${uid}`" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#282218" />
          <stop offset="55%" stop-color="#14110C" />
          <stop offset="100%" stop-color="#070604" />
        </radialGradient>

        <!-- Luxury Satin Ribbon Tails Gradients -->
        <linearGradient :id="`ribbon-left-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#78350F" />
          <stop offset="40%" stop-color="#B45309" />
          <stop offset="75%" stop-color="#D97706" />
          <stop offset="100%" stop-color="#451A03" />
        </linearGradient>
        <linearGradient :id="`ribbon-right-${uid}`" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#78350F" />
          <stop offset="40%" stop-color="#B45309" />
          <stop offset="75%" stop-color="#D97706" />
          <stop offset="100%" stop-color="#451A03" />
        </linearGradient>

        <!-- Antique Titanium / Brushed Platinum (Locked State) -->
        <linearGradient :id="`locked-metal-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F1F5F9" />
          <stop offset="25%" stop-color="#CBD5E1" />
          <stop offset="50%" stop-color="#94A3B8" />
          <stop offset="75%" stop-color="#64748B" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>
        <radialGradient :id="`locked-core-${uid}`" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#334155" />
          <stop offset="65%" stop-color="#1E293B" />
          <stop offset="100%" stop-color="#0F172A" />
        </radialGradient>
        <linearGradient :id="`locked-ribbon-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#64748B" />
          <stop offset="50%" stop-color="#475569" />
          <stop offset="100%" stop-color="#1E293B" />
        </linearGradient>
      </defs>

      <!-- ========================================================
           1. CASCADING LUXURY RIBBON TAILS (SWALLOWTAILS)
           ======================================================== -->
      <g :filter="`url(#luxury-shadow-${uid})`">
        <!-- Left Ribbon Tail -->
        <path
          d="M26 48 L13 80 L28 73 L34 54 Z"
          :fill="unlocked ? `url(#ribbon-left-${uid})` : `url(#locked-ribbon-${uid})`"
          stroke="rgba(0,0,0,0.3)"
          stroke-width="0.75"
        />
        <!-- Left Gold Edge Pinstripe -->
        <path
          d="M13 80 L26 48 M13 80 L28 73"
          :stroke="unlocked ? `url(#gold-highlight-${uid})` : '#94A3B8'"
          stroke-width="0.8"
        />

        <!-- Right Ribbon Tail -->
        <path
          d="M50 48 L63 80 L48 73 L42 54 Z"
          :fill="unlocked ? `url(#ribbon-right-${uid})` : `url(#locked-ribbon-${uid})`"
          stroke="rgba(0,0,0,0.3)"
          stroke-width="0.75"
        />
        <!-- Right Gold Edge Pinstripe -->
        <path
          d="M63 80 L50 48 M63 80 L48 73"
          :stroke="unlocked ? `url(#gold-highlight-${uid})` : '#94A3B8'"
          stroke-width="0.8"
        />

        <!-- Ribbon Center Fold Under-Medal Shadow -->
        <path
          d="M30 49 L38 56 L46 49 Z"
          fill="rgba(0, 0, 0, 0.45)"
        />
      </g>

      <!-- ========================================================
           2. 16-POINT SCALLOPED LUXURY ROSETTE BEZEL (COIN EMBLEM)
           ======================================================== -->
      <g :filter="`url(#luxury-shadow-${uid})`">
        <!-- 16-Point Scalloped Gold Medallion Edge -->
        <path
          d="M38 9 
             C41 9, 43 11, 46 11.5 C49 12, 51.5 11, 54 12.5 C56.5 14, 57.5 16.5, 59.5 18.5 C61.5 20.5, 64 21.5, 65.5 24 C67 26.5, 66 29, 66.5 32 C67 35, 69 37, 69 40 C69 43, 67 45, 66.5 48 C66 51, 67 53.5, 65.5 56 C64 58.5, 61.5 59.5, 59.5 61.5 C57.5 63.5, 56.5 66, 54 67.5 C51.5 69, 49 68, 46 68.5 C43 69, 41 71, 38 71 C35 71, 33 69, 30 68.5 C27 68, 24.5 69, 22 67.5 C19.5 66, 18.5 63.5, 16.5 61.5 C14.5 59.5, 12 58.5, 10.5 56 C9 53.5, 10 51, 9.5 48 C9 45, 7 43, 7 40 C7 37, 9 35, 9.5 32 C10 29, 9 26.5, 10.5 24 C12 21.5, 14.5 20.5, 16.5 18.5 C18.5 16.5, 19.5 14, 22 12.5 C24.5 11, 27 12, 30 11.5 C33 11, 35 9, 38 9 Z"
          :fill="unlocked ? `url(#gold-rim-${uid})` : `url(#locked-metal-${uid})`"
          stroke="rgba(0,0,0,0.35)"
          stroke-width="0.8"
        />

        <!-- Outer Polished Bevel Ring -->
        <circle
          cx="38"
          cy="40"
          r="25.5"
          fill="none"
          :stroke="unlocked ? `url(#gold-highlight-${uid})` : '#CBD5E1'"
          stroke-width="1.2"
        />

        <!-- Inner Beaded Pearl Filigree Ring (Reference: Luxury Gold Seals) -->
        <circle
          cx="38"
          cy="40"
          r="23"
          fill="none"
          :stroke="unlocked ? '#FFF8D6' : '#94A3B8'"
          stroke-width="1.8"
          stroke-dasharray="1.2 3.2"
          stroke-linecap="round"
          opacity="0.9"
        />

        <!-- Inner Gold Step Ridge -->
        <circle
          cx="38"
          cy="40"
          r="20.5"
          fill="none"
          :stroke="unlocked ? `url(#gold-rim-${uid})` : '#64748B'"
          stroke-width="0.8"
        />

        <!-- Deep Obsidian / Onyx Center Enamel Disc -->
        <circle
          cx="38"
          cy="40"
          r="19"
          :fill="unlocked ? `url(#onyx-core-${uid})` : `url(#locked-core-${uid})`"
          :filter="`url(#coin-depth-${uid})`"
        />
      </g>

      <!-- ========================================================
           3. CLASSICAL HERALDIC GOLDEN LAUREL WREATH
           ======================================================== -->
      <g :fill="unlocked ? `url(#gold-fill-${uid})` : '#94A3B8'" opacity="0.92">
        <!-- Left Laurel Branch -->
        <path d="M24 49 C23 45 23 40 25 36 C24 37 23 39 23 42 C22 45 23 48 24 49 Z" />
        <path d="M23 44 C20 44 19 41 21 39 C22 41 23 42 23 44 Z" />
        <path d="M25 39 C23 38 21 35 24 33 C25 35 25 37 25 39 Z" />
        <path d="M27 34 C25 32 24 29 27 28 C28 30 28 32 27 34 Z" />
        <path d="M30 30 C28 28 29 25 32 25 C32 27 31 29 30 30 Z" />

        <!-- Right Laurel Branch -->
        <path d="M52 49 C53 45 53 40 51 36 C52 37 53 39 53 42 C54 45 53 48 52 49 Z" />
        <path d="M53 44 C56 44 57 41 55 39 C54 41 53 42 53 44 Z" />
        <path d="M51 39 C53 38 55 35 52 33 C51 35 51 37 51 39 Z" />
        <path d="M49 34 C51 32 52 29 49 28 C48 30 48 32 49 34 Z" />
        <path d="M46 30 C48 28 47 25 44 25 C44 27 45 29 46 30 Z" />

        <!-- Bottom Laurel Ribbon Tie -->
        <circle cx="38" cy="51" r="1.5" />
      </g>

      <!-- ========================================================
           4. TIER-SPECIFIC ENGRAVED LUXURY GOLD INSIGNIA
           ======================================================== -->
      <g v-if="unlocked">
        <!-- ----------------------------------------------------
             TIER 1: FIRST STEP (Sprout Pioneer)
             1 Gold Star + Elegant Golden Sprout on Royal Pedestal
             ---------------------------------------------------- -->
        <g v-if="badgeKey === 'FIRST_STEP'">
          <!-- Top Centered Gold Star -->
          <polygon points="38,24 39.5,27.5 43,28 40.5,30 41,33.5 38,32 35,33.5 35.5,30 33,28 36.5,27.5" :fill="`url(#gold-highlight-${uid})`" />
          
          <!-- Golden Seedling Leaves -->
          <path
            d="M38 48 C38 41, 31 38, 29 33 C34 32, 39 35, 39 39 C40 34, 45 30, 49 31 C48 37, 43 41, 39 42 L39 48 Z"
            :fill="`url(#gold-fill-${uid})`"
          />
          <path
            d="M38 48 L38 39 C38 35 37 33 32 33.5 C34 36 37 37 38 39 Z"
            :fill="`url(#gold-highlight-${uid})`"
          />
          <!-- Pedestal Base -->
          <rect x="34" y="47.5" width="8" height="1.8" rx="0.9" :fill="`url(#gold-highlight-${uid})`" />
        </g>

        <!-- ----------------------------------------------------
             TIER 2: QUARTER WAY (Forest Compass)
             2 Gold Stars + 8-Point Multifaceted Mariner's Star
             ---------------------------------------------------- -->
        <g v-else-if="badgeKey === 'QUARTER_WAY'">
          <!-- 2 Gold Stars Flanking Top -->
          <polygon points="33,25 34,27.5 36.5,28 34.5,29.5 35,32 33,31 31,32 31.5,29.5 29.5,28 32,27.5" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="43,25 44,27.5 46.5,28 44.5,29.5 45,32 43,31 41,32 41.5,29.5 39.5,28 42,27.5" :fill="`url(#gold-highlight-${uid})`" />

          <!-- Multifaceted 8-Point Compass Star -->
          <!-- North Point -->
          <polygon points="38,27 38,40 41,38" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="38,27 35,38 38,40" :fill="`url(#gold-rim-${uid})`" />
          <!-- South Point -->
          <polygon points="38,53 35,42 38,40" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="38,53 38,40 41,42" :fill="`url(#gold-rim-${uid})`" />
          <!-- East Point -->
          <polygon points="51,40 38,40 40,37" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="51,40 40,43 38,40" :fill="`url(#gold-rim-${uid})`" />
          <!-- West Point -->
          <polygon points="25,40 36,37 38,40" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="25,40 38,40 36,43" :fill="`url(#gold-rim-${uid})`" />
          <!-- Diagonal Facets -->
          <polygon points="46,32 38,40 41,36" :fill="`url(#gold-highlight-${uid})`" opacity="0.85" />
          <polygon points="30,48 38,40 35,44" :fill="`url(#gold-highlight-${uid})`" opacity="0.85" />
          <polygon points="30,32 38,40 35,36" :fill="`url(#gold-rim-${uid})`" opacity="0.85" />
          <polygon points="46,48 38,40 41,44" :fill="`url(#gold-rim-${uid})`" opacity="0.85" />
          <!-- Center Pearl -->
          <circle cx="38" cy="40" r="2.2" :fill="`url(#gold-highlight-${uid})`" />
        </g>

        <!-- ----------------------------------------------------
             TIER 3: HALFWAY HERO (Mountain Ridge)
             3 Gold Stars + Dual Majestic Mountain Peak & Sunburst
             ---------------------------------------------------- -->
        <g v-else-if="badgeKey === 'HALFWAY'">
          <!-- 3 Arched Gold Stars -->
          <polygon points="38,23 39,25.5 41.5,26 39.5,27.5 40,30 38,29 36,30 36.5,27.5 34.5,26 37,25.5" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="31,25 32,27.5 34.5,28 32.5,29.5 33,32 31,31 29,32 29.5,29.5 27.5,28 30,27.5" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="45,25 46,27.5 48.5,28 46.5,29.5 47,32 45,31 43,32 43.5,29.5 41.5,28 44,27.5" :fill="`url(#gold-highlight-${uid})`" />

          <!-- Rising Golden Sun Behind Peaks -->
          <circle cx="38" cy="35" r="5" :fill="`url(#gold-highlight-${uid})`" opacity="0.8" />

          <!-- Left Minor Mountain Peak -->
          <polygon points="26,48 33,35 41,48" :fill="`url(#gold-rim-${uid})`" />
          <!-- Right Tall Mountain Peak -->
          <polygon points="33,48 40,29 48,48" :fill="`url(#gold-fill-${uid})`" />
          <!-- Faceted Sun-lit Ridge -->
          <polygon points="40,29 40,48 48,48" :fill="`url(#gold-highlight-${uid})`" opacity="0.85" />
          <polygon points="33,35 33,48 41,48" :fill="`url(#gold-highlight-${uid})`" opacity="0.6" />
          <!-- Baseline Plateau -->
          <rect x="25" y="47.5" width="26" height="1.5" :fill="`url(#gold-highlight-${uid})`" />
        </g>

        <!-- ----------------------------------------------------
             TIER 4: ALMOST THERE (Flowing River)
             4 Gold Stars + Winged Coronet & Faceted Diamond Star
             ---------------------------------------------------- -->
        <g v-else-if="badgeKey === 'ALMOST_THERE'">
          <!-- 4 Gold Stars Arched Across Header -->
          <polygon points="27,27 28,29 30.5,29.5 28.5,31 29,33.5 27,32.5 25,33.5 25.5,31 23.5,29.5 26,29" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="34,24 35,26 37.5,26.5 35.5,28 36,30.5 34,29.5 32,30.5 32.5,28 30.5,26.5 33,26" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="42,24 43,26 45.5,26.5 43.5,28 44,30.5 42,29.5 40,30.5 40.5,28 38.5,26.5 41,26" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="49,27 50,29 52.5,29.5 50.5,31 51,33.5 49,32.5 47,33.5 47.5,31 45.5,29.5 48,29" :fill="`url(#gold-highlight-${uid})`" />

          <!-- Left Majestic Golden Wing -->
          <path
            d="M38 41 C33 40, 26 38, 24 34 C28 36, 33 38, 36 39 C31 36, 26 33, 27 29 C30 33, 34 35, 38 37 Z"
            :fill="`url(#gold-fill-${uid})`"
          />
          <!-- Right Majestic Golden Wing -->
          <path
            d="M38 41 C43 40, 50 38, 52 34 C48 36, 43 38, 40 39 C45 36, 50 33, 49 29 C46 33, 42 35, 38 37 Z"
            :fill="`url(#gold-fill-${uid})`"
          />

          <!-- Central Sparkling Diamond Star -->
          <polygon points="38,32 40,38 46,40 40,42 38,48 36,42 30,40 36,38" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="38,32 38,48 40,42 46,40 40,38" fill="#FFFFFF" opacity="0.75" />
          <circle cx="38" cy="40" r="1.6" fill="#FFFFFF" />
        </g>

        <!-- ----------------------------------------------------
             TIER 5: GOAL ACHIEVER (Mastery Crown & Grand Crest)
             5 Arched Stars + 5-Point Emperor Crown & Triumph Banner
             ---------------------------------------------------- -->
        <g v-else-if="badgeKey === 'ACHIEVER'">
          <!-- 5 Arched Imperial Gold Stars at Apex -->
          <polygon points="23,32 24,34 26,34.5 24.5,36 25,38 23,37 21,38 21.5,36 20,34.5 22,34" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="29,27 30,29 32,29.5 30.5,31 31,33 29,32 27,33 27.5,31 26,29.5 28,29" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="38,23 39.5,25.5 42,26 40,28 40.5,30.5 38,29 35.5,30.5 36,28 34,26 36.5,25.5" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="47,27 48,29 50,29.5 48.5,31 49,33 47,32 45,33 45.5,31 44,29.5 46,29" :fill="`url(#gold-highlight-${uid})`" />
          <polygon points="53,32 54,34 56,34.5 54.5,36 55,38 53,37 51,38 51.5,36 50,34.5 52,34" :fill="`url(#gold-highlight-${uid})`" />

          <!-- Grand 5-Point Imperial Crown (Reference: Freepik Luxury Crests) -->
          <path
            d="M29 35 L32 43 L38 37 L44 43 L47 35 L45 46 C45 48, 41 49, 38 49 C35 49, 31 48, 31 46 Z"
            :fill="`url(#gold-fill-${uid})`"
            stroke="rgba(0,0,0,0.3)"
            stroke-width="0.6"
          />
          <!-- Crown Pearl Jewels -->
          <circle cx="29" cy="34.5" r="1.3" :fill="`url(#gold-highlight-${uid})`" />
          <circle cx="33.5" cy="39" r="1.1" :fill="`url(#gold-highlight-${uid})`" />
          <circle cx="38" cy="36" r="1.5" :fill="`url(#gold-highlight-${uid})`" />
          <circle cx="42.5" cy="39" r="1.1" :fill="`url(#gold-highlight-${uid})`" />
          <circle cx="47" cy="34.5" r="1.3" :fill="`url(#gold-highlight-${uid})`" />
          <!-- Crown Band Ermine Trim -->
          <rect x="31.5" y="45.5" width="13" height="2" rx="1" :fill="`url(#gold-highlight-${uid})`" />

          <!-- Triumphant Gold Laurel Swag Beneath Crown -->
          <path
            d="M27 48 C32 52, 44 52, 49 48 C45 50.5, 31 50.5, 27 48 Z"
            :fill="`url(#gold-highlight-${uid})`"
          />
        </g>
      </g>

      <!-- ========================================================
           5. LOCKED STATE: LUXURY ANTIQUE TITANIUM & SEAL
           ======================================================== -->
      <g v-else>
        <!-- Luxury Embossed Padlock Shackle -->
        <path
          d="M33 38 L33 34 C33 31.2 35.2 29 38 29 C40.8 29 43 31.2 43 34 L43 38"
          stroke="#CBD5E1"
          stroke-width="2.2"
          stroke-linecap="round"
          fill="none"
        />
        <!-- Embossed Metal Lock Body -->
        <rect
          x="30"
          y="37"
          width="16"
          height="13"
          rx="3"
          :fill="`url(#locked-metal-${uid})`"
          stroke="#E2E8F0"
          stroke-width="0.9"
        />
        <!-- Royal Keyhole -->
        <circle cx="38" cy="42" r="1.8" fill="#0F172A" />
        <polygon points="37.2,42.5 38.8,42.5 38.4,46.5 37.6,46.5" fill="#0F172A" />
        <!-- Metallic Reflection Sheen on Lock -->
        <path
          d="M31 38 L45 38 C45 39, 44 41, 41 41 L31 41 Z"
          fill="#FFFFFF"
          opacity="0.3"
        />
      </g>

      <!-- ========================================================
           6. CURVED HIGH-GLOSS SPECULAR GLASS GLINT (MINTED COIN)
           ======================================================== -->
      <path
        d="M23 29 C27 23, 49 23, 53 29 C47 25, 29 25, 23 29 Z"
        fill="#FFFFFF"
        :opacity="unlocked ? 0.4 : 0.15"
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
    default: 64
  }
});

// Unique ID for SVG gradient isolation
const uid = computed(() => {
  return `${props.badgeKey.toLowerCase()}-${props.unlocked ? 'unlocked' : 'locked'}`;
});
</script>

<style scoped>
.luxury-badge-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.luxury-badge-svg {
  overflow: visible;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.2));
}

.badge-unlocked {
  filter: drop-shadow(0 4px 12px rgba(217, 119, 6, 0.35));
}

.luxury-badge-wrapper:hover {
  transform: translateY(-3px) scale(1.08);
}
</style>
