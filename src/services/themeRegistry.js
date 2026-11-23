/**
 * Horizon Centralized Nature Theme Registry
 * Provides procedural landscape rendering functions and color palettes
 * for the 4 core handcrafted nature themes.
 */

export const THEME_REGISTRY = {
  'alpine-peak': {
    id: 'alpine-peak',
    name: 'Alpine Peak',
    category: 'Forest & Mountain',
    description: 'Majestic layered mountain ridges shrouded in cool mist with pine silhouettes and cold atmospheric lighting.',
    palette: {
      primaryText: '#F8FAFC',
      secondaryText: '#94A3B8',
      accentColor: '#10B981', // Emerald
      progressFill: '#10B981',
      progressTrack: 'rgba(255, 255, 255, 0.12)',
      cardBackground: 'rgba(15, 23, 42, 0.65)',
      cardBorder: 'rgba(255, 255, 255, 0.12)',
      badgeGlow: 'rgba(16, 185, 129, 0.25)',
      previewGradient: ['#060B14', '#0E1B2E', '#10B981']
    },
    drawBackground(ctx, width, height, orientation = 'mobile') {
      // 1. Deep Alpine Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#040810');
      skyGrad.addColorStop(0.35, '#0A1424');
      skyGrad.addColorStop(0.70, '#132338');
      skyGrad.addColorStop(1, '#1A2E44');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Cold Emerald Horizon Aurora Glow
      const glowGrad = ctx.createRadialGradient(width * 0.2, height * 0.35, 20, width * 0.2, height * 0.35, width * 0.7);
      glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
      glowGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.08)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Subtle Atmospheric Stars / Snow Dust
      ctx.fillStyle = 'rgba(248, 250, 252, 0.4)';
      const seedPoints = [
        [0.15, 0.08, 1.5], [0.35, 0.12, 2], [0.65, 0.06, 1.2],
        [0.82, 0.14, 1.8], [0.48, 0.18, 1.2], [0.90, 0.22, 1.5],
        [0.22, 0.25, 1.6], [0.75, 0.28, 1.4]
      ];
      seedPoints.forEach(([px, py, r]) => {
        ctx.beginPath();
        ctx.arc(width * px, height * py, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Distant Mountain Range (Layer 1 - Soft Slate Silhouette)
      const yDistant = height * (orientation === 'mobile' ? 0.60 : 0.55);
      ctx.fillStyle = '#111D2E';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yDistant + 40);
      ctx.lineTo(width * 0.18, yDistant - 30);
      ctx.lineTo(width * 0.36, yDistant + 20);
      ctx.lineTo(width * 0.54, yDistant - 60);
      ctx.lineTo(width * 0.72, yDistant + 10);
      ctx.lineTo(width * 0.88, yDistant - 40);
      ctx.lineTo(width, yDistant + 20);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // 5. Midground Ridge (Layer 2 - Deep Navy Mountain with Sharp Crests)
      const yMid = height * (orientation === 'mobile' ? 0.70 : 0.66);
      ctx.fillStyle = '#0B1422';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yMid);
      ctx.lineTo(width * 0.25, yMid - 70);
      ctx.lineTo(width * 0.45, yMid + 15);
      ctx.lineTo(width * 0.70, yMid - 85);
      ctx.lineTo(width * 0.85, yMid - 10);
      ctx.lineTo(width, yMid - 50);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // 6. Foreground Alpine Slope with Pine Tree Silhouettes (Layer 3)
      const yFore = height * (orientation === 'mobile' ? 0.80 : 0.78);
      ctx.fillStyle = '#060B12';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yFore + 20);
      ctx.bezierCurveTo(width * 0.3, yFore - 20, width * 0.7, yFore + 30, width, yFore - 15);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Draw stylized pine trees along the ridge
      ctx.fillStyle = '#04070B';
      const treePositions = [0.08, 0.14, 0.20, 0.28, 0.62, 0.68, 0.75, 0.84, 0.92];
      treePositions.forEach(p => {
        const tx = width * p;
        const ty = yFore + Math.sin(p * Math.PI) * 20;
        const th = height * 0.045;
        const tw = width * 0.025;

        ctx.beginPath();
        ctx.moveTo(tx, ty - th);
        ctx.lineTo(tx - tw, ty);
        ctx.lineTo(tx + tw, ty);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(tx, ty - th * 0.6);
        ctx.lineTo(tx - tw * 1.3, ty + th * 0.2);
        ctx.lineTo(tx + tw * 1.3, ty + th * 0.2);
        ctx.closePath();
        ctx.fill();
      });
    }
  },

  'deep-pacific': {
    id: 'deep-pacific',
    name: 'Deep Pacific',
    category: 'Ocean & Water',
    description: 'Abyssal navy depths with luminous turquoise caustic light rays and calm rolling ocean swells.',
    palette: {
      primaryText: '#F0FDFA',
      secondaryText: '#99F6E4',
      accentColor: '#06B6D4', // Cyan
      progressFill: '#06B6D4',
      progressTrack: 'rgba(255, 255, 255, 0.12)',
      cardBackground: 'rgba(4, 26, 47, 0.70)',
      cardBorder: 'rgba(6, 182, 212, 0.20)',
      badgeGlow: 'rgba(6, 182, 212, 0.25)',
      previewGradient: ['#020A12', '#04223A', '#06B6D4']
    },
    drawBackground(ctx, width, height, orientation = 'mobile') {
      // 1. Deep Ocean Gradient
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
      oceanGrad.addColorStop(0, '#010810');
      oceanGrad.addColorStop(0.35, '#02182B');
      oceanGrad.addColorStop(0.70, '#042A45');
      oceanGrad.addColorStop(1, '#05385C');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Angled Oceanic Light Rays (Caustics from surface)
      ctx.save();
      const rayGrad = ctx.createLinearGradient(width * 0.4, 0, width * 0.8, height * 0.7);
      rayGrad.addColorStop(0, 'rgba(6, 182, 212, 0.18)');
      rayGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.06)');
      rayGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = rayGrad;

      // Ray 1
      ctx.beginPath();
      ctx.moveTo(width * 0.35, 0);
      ctx.lineTo(width * 0.50, 0);
      ctx.lineTo(width * 0.85, height * 0.85);
      ctx.lineTo(width * 0.65, height * 0.85);
      ctx.closePath();
      ctx.fill();

      // Ray 2
      ctx.beginPath();
      ctx.moveTo(width * 0.60, 0);
      ctx.lineTo(width * 0.72, 0);
      ctx.lineTo(width * 1.05, height * 0.75);
      ctx.lineTo(width * 0.90, height * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 3. Layer 1 Background Ocean Swell
      const yWave1 = height * (orientation === 'mobile' ? 0.64 : 0.60);
      ctx.fillStyle = '#031E33';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yWave1);
      ctx.bezierCurveTo(width * 0.3, yWave1 - 35, width * 0.65, yWave1 + 35, width, yWave1 - 10);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // 4. Layer 2 Rolling Sea Swell with Cyan Edge Foam
      const yWave2 = height * (orientation === 'mobile' ? 0.74 : 0.70);
      ctx.fillStyle = '#021524';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yWave2 + 20);
      ctx.bezierCurveTo(width * 0.35, yWave2 - 40, width * 0.75, yWave2 + 25, width, yWave2 - 30);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Subtle bioluminescent foam rim
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, yWave2 + 20);
      ctx.bezierCurveTo(width * 0.35, yWave2 - 40, width * 0.75, yWave2 + 25, width, yWave2 - 30);
      ctx.stroke();

      // 5. Layer 3 Foreground Deep Trench Abyss
      const yWave3 = height * (orientation === 'mobile' ? 0.83 : 0.80);
      ctx.fillStyle = '#010B14';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yWave3);
      ctx.bezierCurveTo(width * 0.4, yWave3 + 25, width * 0.6, yWave3 - 25, width, yWave3 + 15);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }
  },

  'golden-horizon': {
    id: 'golden-horizon',
    name: 'Golden Horizon',
    category: 'Sunrise & Sunset',
    description: 'Vibrant sunrise breaking over layered silhouetted hills with a large glowing sun orb and warm amber sky.',
    palette: {
      primaryText: '#FFFBEB',
      secondaryText: '#FDE68A',
      accentColor: '#F59E0B', // Amber
      progressFill: '#F59E0B',
      progressTrack: 'rgba(255, 255, 255, 0.14)',
      cardBackground: 'rgba(38, 14, 22, 0.68)',
      cardBorder: 'rgba(245, 158, 11, 0.25)',
      badgeGlow: 'rgba(245, 158, 11, 0.30)',
      previewGradient: ['#1C0B2B', '#9A3412', '#F59E0B']
    },
    drawBackground(ctx, width, height, orientation = 'mobile') {
      // 1. Rich Twilight to Amber Sunrise Gradient
      const dawnGrad = ctx.createLinearGradient(0, 0, 0, height);
      dawnGrad.addColorStop(0, '#12051E');
      dawnGrad.addColorStop(0.25, '#2D0D2E');
      dawnGrad.addColorStop(0.50, '#6B1E38');
      dawnGrad.addColorStop(0.70, '#B44322');
      dawnGrad.addColorStop(0.85, '#D97706');
      dawnGrad.addColorStop(1, '#78350F');
      ctx.fillStyle = dawnGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Large Glowing Sun Orb on Horizon
      const sunX = width * (orientation === 'mobile' ? 0.50 : 0.35);
      const sunY = height * (orientation === 'mobile' ? 0.52 : 0.48);
      const sunRadius = width * (orientation === 'mobile' ? 0.22 : 0.16);

      // Sun Outer Atmospheric Glow
      const haloGrad = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.4, sunX, sunY, sunRadius * 2.8);
      haloGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      haloGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.22)');
      haloGrad.addColorStop(0.8, 'rgba(217, 119, 6, 0.08)');
      haloGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Sun Disc Core
      const sunCoreGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
      sunCoreGrad.addColorStop(0, '#FEF08A');
      sunCoreGrad.addColorStop(1, '#F59E0B');
      ctx.fillStyle = sunCoreGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Layer 1 Distant Horizon Ridge Silhouette
      const yHill1 = height * (orientation === 'mobile' ? 0.65 : 0.60);
      ctx.fillStyle = '#451221';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yHill1);
      ctx.bezierCurveTo(width * 0.25, yHill1 - 30, width * 0.65, yHill1 + 25, width, yHill1 - 15);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // 4. Layer 2 Rolling Midground Hills
      const yHill2 = height * (orientation === 'mobile' ? 0.74 : 0.70);
      ctx.fillStyle = '#2A0A15';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yHill2 + 15);
      ctx.bezierCurveTo(width * 0.35, yHill2 + 35, width * 0.70, yHill2 - 40, width, yHill2);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // 5. Layer 3 Foreground Twilight Silhouette
      const yHill3 = height * (orientation === 'mobile' ? 0.83 : 0.80);
      ctx.fillStyle = '#14030B';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yHill3);
      ctx.bezierCurveTo(width * 0.45, yHill3 - 25, width * 0.75, yHill3 + 20, width, yHill3 - 10);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }
  },

  'minimalist-stone': {
    id: 'minimalist-stone',
    name: 'Minimalist Stone',
    category: 'Zen & Minimal Nature',
    description: 'Clean zen aesthetic with smooth geometric river stone curves, neutral slate gradients, and distraction-free contour lines.',
    palette: {
      primaryText: '#F1F5F9',
      secondaryText: '#CBD5E1',
      accentColor: '#38BDF8', // Sky/Silver
      progressFill: '#38BDF8',
      progressTrack: 'rgba(255, 255, 255, 0.10)',
      cardBackground: 'rgba(24, 28, 36, 0.72)',
      cardBorder: 'rgba(255, 255, 255, 0.10)',
      badgeGlow: 'rgba(56, 189, 248, 0.20)',
      previewGradient: ['#0B0D11', '#1E232B', '#64748B']
    },
    drawBackground(ctx, width, height, orientation = 'mobile') {
      // 1. Subtle Zen Charcoal Gradient
      const zenGrad = ctx.createLinearGradient(0, 0, 0, height);
      zenGrad.addColorStop(0, '#0A0C10');
      zenGrad.addColorStop(0.40, '#141820');
      zenGrad.addColorStop(0.75, '#1C222C');
      zenGrad.addColorStop(1, '#252D3A');
      ctx.fillStyle = zenGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Delicate Minimalist Zen Contour Arcs
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.45, (width * 0.25) * i * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Layer 1 Abstract Smooth Stone Mound
      const yStone1 = height * (orientation === 'mobile' ? 0.63 : 0.58);
      ctx.fillStyle = '#181E26';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yStone1 + 40);
      ctx.bezierCurveTo(width * 0.35, yStone1 - 50, width * 0.70, yStone1 + 20, width, yStone1 - 25);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // 4. Layer 2 Smooth River Pebble Curved Silhouette
      const yStone2 = height * (orientation === 'mobile' ? 0.73 : 0.68);
      ctx.fillStyle = '#11151B';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yStone2 - 10);
      ctx.bezierCurveTo(width * 0.30, yStone2 + 30, width * 0.65, yStone2 - 45, width, yStone2 + 20);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // 5. Layer 3 Foreground Base Foundation
      const yStone3 = height * (orientation === 'mobile' ? 0.82 : 0.78);
      ctx.fillStyle = '#090B0E';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, yStone3);
      ctx.bezierCurveTo(width * 0.45, yStone3 - 20, width * 0.75, yStone3 + 15, width, yStone3 - 10);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Minimalist accent horizon rule
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.15, yStone3 + 30);
      ctx.lineTo(width * 0.85, yStone3 + 30);
      ctx.stroke();
    }
  }
};

/**
 * 8 Curated Luxury Minimalist Color Themes (Point 6: 5 to 10 options only)
 * Elegant solid/duo-tone color palettes for high-focus distraction-free wallpapers
 */
export const ELEGANT_COLORS = [
  {
    id: 'color-obsidian',
    name: 'Midnight Obsidian',
    category: 'Curated Colors',
    colors: ['#0B0F19', '#1E293B'],
    description: 'Deep luxury slate black with soft atmospheric ambient depth.',
    accent: '#E97824'
  },
  {
    id: 'color-emerald',
    name: 'Imperial Emerald',
    category: 'Curated Colors',
    colors: ['#022C22', '#064E3B'],
    description: 'Deep royal forest velvet with rich jewel-toned depth.',
    accent: '#10B981'
  },
  {
    id: 'color-sapphire',
    name: 'Deep Sapphire',
    category: 'Curated Colors',
    colors: ['#082F49', '#0C4A6E'],
    description: 'Moody celestial navy blue with clean architectural contrast.',
    accent: '#38BDF8'
  },
  {
    id: 'color-burgundy',
    name: 'Burgundy Velvet',
    category: 'Curated Colors',
    colors: ['#3B0718', '#831843'],
    description: 'Regal dark wine with subtle rose-gold ambient lighting.',
    accent: '#FB7185'
  },
  {
    id: 'color-amber',
    name: 'Sunset Amber',
    category: 'Curated Colors',
    colors: ['#451A03', '#9A3412'],
    description: 'Warm burnished copper and glowing horizon amber.',
    accent: '#F59E0B'
  },
  {
    id: 'color-espresso',
    name: 'Warm Espresso',
    category: 'Curated Colors',
    colors: ['#1B1814', '#3E342B'],
    description: 'Dark roasted coffee bean and warm brushed bronze.',
    accent: '#FCE8D8'
  },
  {
    id: 'color-slate',
    name: 'Nordic Slate',
    category: 'Curated Colors',
    colors: ['#18202F', '#334155'],
    description: 'Cool architectural graphite with clean, understated luxury.',
    accent: '#94A3B8'
  },
  {
    id: 'color-amethyst',
    name: 'Royal Amethyst',
    category: 'Curated Colors',
    colors: ['#2E1065', '#581C87'],
    description: 'Majestic deep violet with subtle starlight illumination.',
    accent: '#C084FC'
  }
];

// Dynamically register each curated color into THEME_REGISTRY
ELEGANT_COLORS.forEach(c => {
  THEME_REGISTRY[c.id] = {
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    isColorTheme: true,
    palette: {
      primaryText: '#F8FAFC',
      secondaryText: '#CBD5E1',
      accentColor: c.accent,
      progressFill: c.accent,
      progressTrack: 'rgba(255, 255, 255, 0.14)',
      cardBackground: 'rgba(15, 23, 42, 0.68)',
      cardBorder: 'rgba(255, 255, 255, 0.15)',
      badgeGlow: 'rgba(255, 255, 255, 0.15)',
      previewGradient: c.colors
    },
    drawBackground(ctx, width, height) {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, c.colors[0]);
      grad.addColorStop(1, c.colors[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric vignette
      const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.15, width / 2, height / 2, width * 0.85);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    }
  };
});

/**
 * Retrieves a registered theme by ID, falling back to 'alpine-peak'
 * @param {string} themeId - Theme identifier
 * @returns {object} Theme definition
 */
export function getTheme(themeId) {
  return THEME_REGISTRY[themeId] || THEME_REGISTRY['alpine-peak'];
}

/**
 * Returns array of all available nature procedural themes for UI selection
 * @returns {Array<object>}
 */
export function getAllThemes() {
  return Object.values(THEME_REGISTRY).filter(t => !t.isColorTheme);
}

/**
 * Returns array of all curated elegant color themes (8 options)
 * @returns {Array<object>}
 */
export function getAllColorThemes() {
  return Object.values(THEME_REGISTRY).filter(t => t.isColorTheme);
}
