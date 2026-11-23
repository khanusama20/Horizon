/**
 * Horizon Canvas Wallpaper Engine
 * High-resolution 2D Canvas rendering engine for static nature-inspired and custom wallpapers.
 * Supports exact mobile (1080x1920) and desktop (1920x1080) dimensions,
 * proportional responsive typography, mobile lock-screen safe zones (0-28% top, 29-84% main, 85-97% footer),
 * center-crop cover background rendering without distortion, font preloading,
 * and comprehensive goal progress, achievement badge, and milestone analytics overlay.
 */

import { getTheme } from './themeRegistry.js';
import { calculateProgress } from './milestoneEngine.js';
import { evaluateBadges, getMotivationalQuote } from './badgeEngine.js';

export const CANVAS_DIMENSIONS = {
  MOBILE: { width: 1080, height: 1920, orientation: 'mobile', label: 'Standard Mobile (1080×1920, 9:16)' },
  MOTOROLA_EDGE: { width: 1080, height: 2400, orientation: 'mobile', label: 'Motorola Edge 50 Fusion (1080×2400, 9:20)' },
  MOBILE_COMPACT: { width: 720, height: 1600, orientation: 'mobile', label: 'Compact Mobile (720×1600, 9:20)' },
  DESKTOP: { width: 1920, height: 1080, orientation: 'desktop', label: 'Desktop Full HD (1920×1080, 16:9)' }
};

export const SAFE_ZONES = {
  MOBILE: {
    topReserved: 280, // Legacy top reserved constant
    topSafePct: 0.28, // Top 0-28% reserved for OS clock, status bar, and notifications
    mainStartPct: 0.29, // Main content 29-84% (Goal info, progress, badges, milestones)
    mainEndPct: 0.84,
    footerStartPct: 0.85, // Footer 85-97% (Motivational quote & branding)
    footerEndPct: 0.97,
    bottomReserved: 200, // Bottom controls & home gesture bar
    sideMargin: 80,
    contentTop: 280,
    contentBottom: 1720,
    contentHeight: 1440
  },
  MOTOROLA_EDGE: {
    topReserved: 300,
    topSafePct: 0.15,
    bottomReserved: 160,
    sideMargin: 70,
    contentTop: 300,
    contentBottom: 2240,
    contentHeight: 1940
  },
  MOBILE_COMPACT: {
    topReserved: 200,
    topSafePct: 0.15,
    bottomReserved: 120,
    sideMargin: 50,
    contentTop: 200,
    contentBottom: 1480,
    contentHeight: 1280
  },
  DESKTOP: {
    topReserved: 80, // Menu bar
    bottomReserved: 80, // Taskbar / Dock
    sideMargin: 100,
    contentTop: 80,
    contentBottom: 1000,
    contentHeight: 920
  }
};

/**
 * Reusable Canvas 2D Rendering Engine
 */
export class CanvasWallpaperEngine {
  /**
   * Ensures web fonts are fully loaded before executing canvas text operations
   * @returns {Promise<void>}
   */
  static async waitForFonts() {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Fallback gracefully if font loading promise rejects
      }
    }
  }

  /**
   * Calculates source crop coordinates for center-crop / cover scaling to fill target canvas
   * preserving source image aspect ratio without any stretching or distortion.
   * 
   * @param {number} imgWidth - Source image natural width
   * @param {number} imgHeight - Source image natural height
   * @param {number} canvasWidth - Target canvas width
   * @param {number} canvasHeight - Target canvas height
   * @returns {{ sx: number, sy: number, sWidth: number, sHeight: number, dx: number, dy: number, dWidth: number, dHeight: number }}
   */
  static calculateCoverCrop(imgWidth, imgHeight, canvasWidth, canvasHeight) {
    if (!imgWidth || !imgHeight || !canvasWidth || !canvasHeight) {
      return {
        sx: 0,
        sy: 0,
        sWidth: imgWidth || 1,
        sHeight: imgHeight || 1,
        dx: 0,
        dy: 0,
        dWidth: canvasWidth || 1,
        dHeight: canvasHeight || 1
      };
    }

    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let sWidth, sHeight, sx, sy;

    if (imgRatio > canvasRatio) {
      // Source image is wider than target canvas -> crop left and right edges
      sHeight = imgHeight;
      sWidth = Math.round(imgHeight * canvasRatio);
      sx = Math.round((imgWidth - sWidth) / 2);
      sy = 0;
    } else {
      // Source image is taller than target canvas -> crop top and bottom edges
      sWidth = imgWidth;
      sHeight = Math.round(imgWidth / canvasRatio);
      sx = 0;
      sy = Math.round((imgHeight - sHeight) / 2);
    }

    return {
      sx,
      sy,
      sWidth,
      sHeight,
      dx: 0,
      dy: 0,
      dWidth: canvasWidth,
      dHeight: canvasHeight
    };
  }

  /**
   * Helper to draw rounded rectangles
   */
  static drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Helper to wrap and draw text within max width, with optional line clamping
   */
  static wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    if (!text) return y;
    const words = String(text).split(' ');
    let line = '';
    let currentY = y;
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        linesDrawn++;
        if (linesDrawn === maxLines) {
          // Truncate remaining text with ellipsis on final permitted line
          let truncated = line.trim();
          while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
          }
          ctx.fillText(truncated + '...', x, currentY);
          return currentY + lineHeight;
        }
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line.trim().length > 0 && linesDrawn < maxLines) {
      ctx.fillText(line.trim(), x, currentY);
      currentY += lineHeight;
    }

    return currentY;
  }

  /**
   * Automatically fits font size and wraps text within maxWidth and maxLines
   * Decreases font size down to minFontSize before applying ellipsis truncation.
   * 
   * @param {CanvasRenderingContext2D} ctx - 2D context
   * @param {string} text - Input text string
   * @param {number} x - Left coordinate
   * @param {number} y - Top coordinate
   * @param {number} maxWidth - Maximum width available for text
   * @param {number} initialFontSize - Starting font size
   * @param {number} minFontSize - Minimum font size floor
   * @param {string} fontPrimary - Font family string
   * @param {number} [maxLines=2] - Maximum permitted lines
   * @param {string} [fontWeight='800'] - Font weight
   * @returns {number} Y-coordinate following the drawn text block
   */
  static fitAndWrapText(ctx, text, x, y, maxWidth, initialFontSize, minFontSize, fontPrimary, maxLines = 2, fontWeight = '800') {
    if (!text) return y;

    let fontSize = initialFontSize;
    let computedLines = [];

    while (fontSize >= minFontSize) {
      ctx.font = `${fontWeight} ${fontSize}px ${fontPrimary}`;
      const words = String(text).split(' ');
      computedLines = [];
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
          computedLines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        computedLines.push(currentLine);
      }

      if (computedLines.length <= maxLines) {
        break;
      }
      fontSize -= 2;
    }

    ctx.font = `${fontWeight} ${fontSize}px ${fontPrimary}`;
    const lineHeight = Math.round(fontSize * 1.25);
    let currentY = y;

    const linesToDraw = computedLines.slice(0, maxLines);
    for (let i = 0; i < linesToDraw.length; i++) {
      let lineText = linesToDraw[i];
      if (i === maxLines - 1 && computedLines.length > maxLines) {
        while (ctx.measureText(lineText + '...').width > maxWidth && lineText.length > 0) {
          lineText = lineText.slice(0, -1).trim();
        }
        lineText += '...';
      }
      ctx.fillText(lineText, x, currentY);
      currentY += lineHeight;
    }

    return currentY;
  }

  /**
   * Helper to draw a circular progress ring
   */
  static drawProgressRing(ctx, cx, cy, radius, lineWidth, progressPct, fillColor, trackColor) {
    // 1. Background Track
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = trackColor;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Animated Progress Arc
    if (progressPct > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * (Math.min(100, Math.max(0, progressPct)) / 100));
      ctx.strokeStyle = fillColor;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.stroke();
      ctx.lineCap = 'butt'; // reset
    }
  }

  /**
   * Applies a configurable dark gradient overlay over background images to maximize text readability.
   */
  static drawGradientOverlay(ctx, width, height, overlayConfig = {}) {
    const scrim = ctx.createLinearGradient(0, 0, 0, height);
    const topAlpha = overlayConfig.topAlpha ?? 0.65;
    const midAlpha1 = overlayConfig.midAlpha1 ?? 0.45;
    const midAlpha2 = overlayConfig.midAlpha2 ?? 0.60;
    const bottomAlpha = overlayConfig.bottomAlpha ?? 0.88;

    scrim.addColorStop(0, `rgba(11, 15, 25, ${topAlpha})`);
    scrim.addColorStop(0.28, `rgba(11, 15, 25, ${midAlpha1})`); // Clock zone transition
    scrim.addColorStop(0.70, `rgba(11, 15, 25, ${midAlpha2})`);
    scrim.addColorStop(1, `rgba(11, 15, 25, ${bottomAlpha})`);

    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Renders a user-uploaded custom photo background with high-quality cover scaling (center-crop)
   * without stretching or distortion, and applies a dark atmospheric readability scrim.
   */
  static async drawCustomImageBackground(ctx, width, height, imageUrl, fallbackTheme, options = {}) {
    try {
      const img = await this.loadImage(imageUrl);
      const crop = this.calculateCoverCrop(img.width, img.height, width, height);
      ctx.drawImage(img, crop.sx, crop.sy, crop.sWidth, crop.sHeight, crop.dx, crop.dy, crop.dWidth, crop.dHeight);

      // Atmospheric dark scrim overlay to guarantee contrast for text, countdown, and badges
      this.drawGradientOverlay(ctx, width, height, options);
    } catch {
      if (fallbackTheme && typeof fallbackTheme.drawBackground === 'function') {
        fallbackTheme.drawBackground(ctx, width, height);
      } else {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, width, height);
      }
    }
  }

  /**
   * Renders a user-selected custom color background with subtle vignette depth
   */
  static drawColorBackground(ctx, width, height, color) {
    ctx.fillStyle = color || '#0F172A';
    ctx.fillRect(0, 0, width, height);

    // Subtle vignette overlay to add depth
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.85);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.40)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  static loadImage(src) {
    return new Promise((resolve, reject) => {
      if (typeof Image === 'undefined') {
        return resolve({ width: 1000, height: 1000 });
      }

      const img = new Image();
      // CRITICAL FIX: Only set crossOrigin = 'anonymous' for external http/https requests!
      // Setting crossOrigin on blob: or data: URIs in Chromium/Safari triggers CORS / security load errors!
      if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
        img.crossOrigin = 'anonymous';
      }

      let settled = false;
      const onDone = () => {
        if (settled) return;
        settled = true;
        resolve(img);
      };

      const onError = (e) => {
        if (settled) return;
        settled = true;
        reject(e || new Error('Image failed to load'));
      };

      img.onload = onDone;
      img.onerror = onError;

      // In modern browsers, decode() provides faster and reliable GPU-ready decoding
      if (typeof img.decode === 'function') {
        img.decode().then(onDone).catch(() => {
          // Fall back to onload if decode promise rejects
        });
      }

      // In happy-dom / test environment where DOM load events don't fire for mock URLs:
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
        setTimeout(() => {
          if (!settled) {
            settled = true;
            if (!img.width) img.width = 1080;
            if (!img.height) img.height = 1920;
            resolve(img);
          }
        }, 80);
      }

      img.src = src;

      // Check if image is already complete (e.g. data URI or cached)
      if (img.complete && (img.naturalWidth || img.width)) {
        onDone();
      }
    });
  }

  /**
   * Helper to draw safe-zone debug overlay guidelines
   */
  static drawSafeZoneDebug(ctx, width, height, safeZone) {
    ctx.save();
    // Top reserved area (0 - 28% for mobile)
    const topH = Math.round(height * (safeZone.topSafePct || 0.28));
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)'; // Red translucent
    ctx.fillRect(0, 0, width, topH);

    // Bottom reserved area (97 - 100%)
    const botH = Math.round(height * (1 - (safeZone.footerEndPct || 0.97)));
    ctx.fillRect(0, height - botH, width, botH);

    // Guidelines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);

    ctx.beginPath();
    ctx.moveTo(0, topH);
    ctx.lineTo(width, topH);
    ctx.moveTo(0, height - botH);
    ctx.lineTo(width, height - botH);
    ctx.stroke();

    // Labels
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#EF4444';
    ctx.fillText(`TOP SAFE ZONE (0 - 28% / ${topH}px) [OS Clock / Notifications]`, 40, Math.max(35, topH - 20));
    ctx.fillText(`BOTTOM SAFE ZONE (${height - botH}px - ${height}px) [Home Indicator / Controls]`, 40, height - 20);
    ctx.restore();
  }

  /**
   * Main rendering function: draws complete wallpaper onto supplied canvas element
   * @param {HTMLCanvasElement} canvas - Target Canvas DOM element
   * @param {object} options - Render configuration
   * @param {object} options.goal - Active Goal record
   * @param {'MOBILE'|'DESKTOP'} [options.preset='MOBILE'] - Resolution preset
   * @param {boolean} [options.debugSafeZones=false] - Whether to draw safe-zone debug overlay
   * @returns {Promise<{ success: boolean, width: number, height: number, error?: string }>}
   */
  static async renderWallpaper(canvas, { goal, preset = 'MOBILE', debugSafeZones = false } = {}) {
    if (!canvas) {
      return { success: false, width: 0, height: 0, error: 'Target canvas element is null' };
    }

    try {
      // 1. Wait for web fonts to avoid font baseline shift
      await this.waitForFonts();

      let dim;
      let safeZone;
      const upperPreset = String(preset || 'MOBILE').toUpperCase();

      if (upperPreset === 'DESKTOP') {
        dim = CANVAS_DIMENSIONS.DESKTOP;
        safeZone = SAFE_ZONES.DESKTOP;
      } else if (upperPreset === 'MOTOROLA_EDGE' || upperPreset === 'EDGE_50_FUSION' || upperPreset === 'MOBILE_TALL') {
        dim = CANVAS_DIMENSIONS.MOTOROLA_EDGE;
        safeZone = SAFE_ZONES.MOTOROLA_EDGE || SAFE_ZONES.MOBILE;
      } else if (upperPreset === 'MOBILE_COMPACT') {
        dim = CANVAS_DIMENSIONS.MOBILE_COMPACT;
        safeZone = SAFE_ZONES.MOBILE_COMPACT || SAFE_ZONES.MOBILE;
      } else {
        dim = CANVAS_DIMENSIONS.MOBILE;
        safeZone = SAFE_ZONES.MOBILE;
      }

      // 2. Set Canvas dimensions strictly
      canvas.width = dim.width;
      canvas.height = dim.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { success: false, width: dim.width, height: dim.height, error: 'Failed to acquire 2D context' };
      }

      ctx.clearRect(0, 0, dim.width, dim.height);

      // 3. Resolve Theme and Apply Optional Custom Colors
      const themeId = goal?.templateId || 'alpine-peak';
      const theme = getTheme(themeId);
      const palette = { ...theme.palette };

      if (goal?.customColors) {
        const c = goal.customColors;
        if (c.heading) palette.primaryText = c.heading;
        if (c.body) palette.secondaryText = c.body;
        if (c.accent) {
          palette.accentColor = c.accent;
          palette.progressFill = c.accent;
        }
        if (c.card) palette.cardBackground = c.card;
      }

      // 4. Draw Background: Custom Uploaded Photo, Custom Color, or Procedural Nature Theme
      if (goal?.customImageUrl || goal?.customImage) {
        await this.drawCustomImageBackground(ctx, dim.width, dim.height, goal.customImageUrl || goal.customImage, theme);
      } else if (goal?.customColors?.background) {
        this.drawColorBackground(ctx, dim.width, dim.height, goal.customColors.background);
      } else {
        theme.drawBackground(ctx, dim.width, dim.height, dim.orientation);
      }

      // 5. Extract Progress and Milestone State
      const milestones = goal?.milestones || [];
      const progressPct = calculateProgress(milestones);
      const badges = evaluateBadges(milestones);
      const motivation = getMotivationalQuote(progressPct);

      // Current focus milestone (first non-completed)
      const sortedMilestones = [...milestones].sort((a, b) => (a.order || 0) - (b.order || 0));
      const activeMilestone = sortedMilestones.find(m => m.status !== 'completed' && !m.completed) || sortedMilestones[sortedMilestones.length - 1];
      const upcomingMilestone = sortedMilestones.find(m => m.status !== 'completed' && !m.completed && m.id !== activeMilestone?.id);

      // Calculate Days Remaining
      let daysRemaining = goal?.totalDays || 15;
      if (goal?.targetDate) {
        try {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const target = new Date(goal.targetDate);
          target.setHours(0, 0, 0, 0);
          const diff = Math.round((target - now) / (1000 * 60 * 60 * 24));
          daysRemaining = diff >= 0 ? diff : 0;
        } catch {
          daysRemaining = goal?.totalDays || 15;
        }
      }

      // 6. Render Layout by Orientation
      if (dim.orientation === 'mobile') {
        this.renderMobileLayout(ctx, dim.width, dim.height, safeZone, {
          goal,
          palette,
          daysRemaining,
          progressPct,
          activeMilestone,
          upcomingMilestone,
          badges,
          motivation
        });
      } else {
        this.renderDesktopLayout(ctx, dim.width, dim.height, safeZone, {
          goal,
          palette,
          daysRemaining,
          progressPct,
          activeMilestone,
          upcomingMilestone,
          badges,
          motivation
        });
      }

      // 7. Optional Safe-Zone Debug Overlay
      if (debugSafeZones) {
        this.drawSafeZoneDebug(ctx, dim.width, dim.height, safeZone);
      }

      return { success: true, width: dim.width, height: dim.height };
    } catch (err) {
      return { success: false, width: 0, height: 0, error: err.message };
    }
  }

  /**
   * Renders an authentic Luxury Gold Medallion badge on Canvas
   * Features:
   * - Cascading satin ribbon swallowtail tails
   * - 16-point scalloped luxury gold rosette bezel
   * - Metallic gold multi-stop specular bevel highlights
   * - Deep obsidian/onyx center enamel coin face
   * - Distinct vector emblem glyphs for each milestone tier:
   *   * FIRST_STEP: Golden Sprout of Genesis
   *   * QUARTER_WAY: Golden Navigator's Compass Rose
   *   * HALFWAY_HERO: Golden Twin Mountain Peaks with Summit Flag
   *   * ALMOST_THERE: Blazing Beacon / Torch of Triumph
   *   * ACHIEVER: Imperial Laureled Sovereign Crown
   * - Locked state: Brushed antique platinum/titanium with dark slate enamel
   * 
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} radius - Medallion coin radius
   * @param {object} badge - Badge data model
   * @param {object} palette - Theme palette
   */
  static drawLuxuryBadge(ctx, cx, cy, radius, badge, palette) {
    const isUnlocked = Boolean(badge.unlocked);
    ctx.save();

    // 1. Cascading Satin Ribbon Tails (Swallowtails)
    const ribbonLen = radius * 1.5;
    const ribbonSpread = radius * 0.75;

    // Left Ribbon Tail
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.35, cy + radius * 0.4);
    ctx.lineTo(cx - ribbonSpread, cy + ribbonLen);
    ctx.lineTo(cx - radius * 0.35, cy + ribbonLen - radius * 0.22);
    ctx.lineTo(cx - radius * 0.1, cy + radius * 0.5);
    ctx.closePath();

    const leftRibbonGrad = ctx.createLinearGradient(cx - ribbonSpread, cy, cx, cy + ribbonLen);
    if (isUnlocked) {
      leftRibbonGrad.addColorStop(0, '#78350F');
      leftRibbonGrad.addColorStop(0.4, '#B45309');
      leftRibbonGrad.addColorStop(0.75, '#D97706');
      leftRibbonGrad.addColorStop(1, '#451A03');
    } else {
      leftRibbonGrad.addColorStop(0, '#475569');
      leftRibbonGrad.addColorStop(0.5, '#334155');
      leftRibbonGrad.addColorStop(1, '#1E293B');
    }
    ctx.fillStyle = leftRibbonGrad;
    ctx.fill();
    ctx.strokeStyle = isUnlocked ? '#FEF3C7' : '#94A3B8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Right Ribbon Tail
    ctx.beginPath();
    ctx.moveTo(cx + radius * 0.35, cy + radius * 0.4);
    ctx.lineTo(cx + ribbonSpread, cy + ribbonLen);
    ctx.lineTo(cx + radius * 0.35, cy + ribbonLen - radius * 0.22);
    ctx.lineTo(cx + radius * 0.1, cy + radius * 0.5);
    ctx.closePath();

    const rightRibbonGrad = ctx.createLinearGradient(cx + ribbonSpread, cy, cx, cy + ribbonLen);
    if (isUnlocked) {
      rightRibbonGrad.addColorStop(0, '#78350F');
      rightRibbonGrad.addColorStop(0.4, '#B45309');
      rightRibbonGrad.addColorStop(0.75, '#D97706');
      rightRibbonGrad.addColorStop(1, '#451A03');
    } else {
      rightRibbonGrad.addColorStop(0, '#475569');
      rightRibbonGrad.addColorStop(0.5, '#334155');
      rightRibbonGrad.addColorStop(1, '#1E293B');
    }
    ctx.fillStyle = rightRibbonGrad;
    ctx.fill();
    ctx.strokeStyle = isUnlocked ? '#FEF3C7' : '#94A3B8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center Ribbon Fold Shadow
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.25, cy + radius * 0.45);
    ctx.lineTo(cx, cy + radius * 0.65);
    ctx.lineTo(cx + radius * 0.25, cy + radius * 0.45);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();

    // 2. 16-Point Scalloped Luxury Rosette Bezel
    const numPoints = 16;
    const rOuter = radius;
    const rInner = radius * 0.88;

    ctx.beginPath();
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = (i * Math.PI) / numPoints;
      const r = (i % 2 === 0) ? rOuter : rInner;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();

    const goldRimGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    if (isUnlocked) {
      goldRimGrad.addColorStop(0, '#FFF8D6');
      goldRimGrad.addColorStop(0.18, '#FCD34D');
      goldRimGrad.addColorStop(0.38, '#F59E0B');
      goldRimGrad.addColorStop(0.55, '#FEF3C7');
      goldRimGrad.addColorStop(0.72, '#D97706');
      goldRimGrad.addColorStop(0.88, '#B45309');
      goldRimGrad.addColorStop(1, '#78350F');
    } else {
      goldRimGrad.addColorStop(0, '#F1F5F9');
      goldRimGrad.addColorStop(0.25, '#CBD5E1');
      goldRimGrad.addColorStop(0.50, '#94A3B8');
      goldRimGrad.addColorStop(0.75, '#64748B');
      goldRimGrad.addColorStop(1, '#334155');
    }
    ctx.fillStyle = goldRimGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 3. Outer Polished Bevel Ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.82, 0, Math.PI * 2);
    ctx.strokeStyle = isUnlocked ? '#FFFBEB' : '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Inner Beaded Gold Coin Ring
    const numBeads = 18;
    const beadRadius = radius * 0.74;
    for (let b = 0; b < numBeads; b++) {
      const bAngle = (b * Math.PI * 2) / numBeads;
      const bx = cx + Math.cos(bAngle) * beadRadius;
      const by = cy + Math.sin(bAngle) * beadRadius;
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(1.2, radius * 0.035), 0, Math.PI * 2);
      ctx.fillStyle = isUnlocked ? '#FDE68A' : '#94A3B8';
      ctx.fill();
    }

    // 5. Deep Obsidian / Onyx Center Enamel Disc
    const coreRadius = radius * 0.66;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    const coreGrad = ctx.createRadialGradient(cx, cy - coreRadius * 0.25, coreRadius * 0.1, cx, cy, coreRadius);
    if (isUnlocked) {
      coreGrad.addColorStop(0, '#2D2419');
      coreGrad.addColorStop(0.55, '#16130E');
      coreGrad.addColorStop(1, '#070604');
    } else {
      coreGrad.addColorStop(0, '#334155');
      coreGrad.addColorStop(0.65, '#1E293B');
      coreGrad.addColorStop(1, '#0F172A');
    }
    ctx.fillStyle = coreGrad;
    ctx.fill();
    ctx.strokeStyle = isUnlocked ? '#B45309' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 6. Draw Emblem Vector Glyph
    this.drawEmblemGlyph(ctx, cx, cy, coreRadius * 1.5, badge.key, isUnlocked);

    ctx.restore();
  }

  /**
   * Draws handcrafted vector glyphs for each badge achievement tier
   */
  static drawEmblemGlyph(ctx, cx, cy, size, badgeKey, isUnlocked) {
    const primaryColor = isUnlocked ? '#FEF08A' : '#CBD5E1';
    const accentColor = isUnlocked ? '#F59E0B' : '#94A3B8';

    ctx.save();

    switch (badgeKey) {
      case 'FIRST_STEP': {
        // Golden Sprout of Genesis + Soil Mound
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(cx, cy + size * 0.26, size * 0.18, Math.PI, 0);
        ctx.fill();

        // Stem
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = Math.max(2, size * 0.08);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy + size * 0.24);
        ctx.quadraticCurveTo(cx - size * 0.05, cy, cx, cy - size * 0.18);
        ctx.stroke();

        // Left Leaf
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size * 0.02);
        ctx.quadraticCurveTo(cx - size * 0.32, cy - size * 0.05, cx - size * 0.28, cy - size * 0.24);
        ctx.quadraticCurveTo(cx - size * 0.08, cy - size * 0.24, cx, cy - size * 0.02);
        ctx.fill();

        // Right Leaf
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size * 0.08);
        ctx.quadraticCurveTo(cx + size * 0.32, cy - size * 0.12, cx + size * 0.26, cy - size * 0.28);
        ctx.quadraticCurveTo(cx + size * 0.06, cy - size * 0.26, cx, cy - size * 0.08);
        ctx.fill();
        break;
      }

      case 'QUARTER_WAY': {
        // Golden Navigator's Compass Rose (8-point Nautical Star)
        const radOut = size * 0.34;
        const radIn = size * 0.12;

        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          const nextAngle = angle + Math.PI / 4;
          const prevAngle = angle - Math.PI / 4;

          // Light facet
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * radOut, cy + Math.sin(angle) * radOut);
          ctx.lineTo(cx + Math.cos(nextAngle) * radIn, cy + Math.sin(nextAngle) * radIn);
          ctx.closePath();
          ctx.fillStyle = primaryColor;
          ctx.fill();

          // Dark facet
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * radOut, cy + Math.sin(angle) * radOut);
          ctx.lineTo(cx + Math.cos(prevAngle) * radIn, cy + Math.sin(prevAngle) * radIn);
          ctx.closePath();
          ctx.fillStyle = accentColor;
          ctx.fill();
        }

        // Center Gold Hub
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = isUnlocked ? '#FFFBEB' : '#E2E8F0';
        ctx.fill();
        break;
      }

      case 'HALFWAY_HERO': {
        // Golden Twin Mountain Peaks with Summit Flag
        // Back Left Peak
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.32, cy + size * 0.22);
        ctx.lineTo(cx - size * 0.14, cy - size * 0.14);
        ctx.lineTo(cx + size * 0.04, cy + size * 0.22);
        ctx.closePath();
        ctx.fillStyle = accentColor;
        ctx.fill();

        // Front Main Peak (Right)
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.1, cy + size * 0.22);
        ctx.lineTo(cx + size * 0.12, cy - size * 0.26);
        ctx.lineTo(cx + size * 0.34, cy + size * 0.22);
        ctx.closePath();
        ctx.fillStyle = primaryColor;
        ctx.fill();

        // Shading on Main Peak Left Flank
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.1, cy + size * 0.22);
        ctx.lineTo(cx + size * 0.12, cy - size * 0.26);
        ctx.lineTo(cx + size * 0.12, cy + size * 0.22);
        ctx.closePath();
        ctx.fillStyle = accentColor;
        ctx.fill();

        // Summit Flagpole & Pennant
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = Math.max(1.5, size * 0.05);
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.12, cy - size * 0.26);
        ctx.lineTo(cx + size * 0.12, cy - size * 0.38);
        ctx.stroke();

        ctx.fillStyle = isUnlocked ? '#EF4444' : '#64748B';
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.12, cy - size * 0.38);
        ctx.lineTo(cx + size * 0.28, cy - size * 0.32);
        ctx.lineTo(cx + size * 0.12, cy - size * 0.27);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'ALMOST_THERE': {
        // Blazing Beacon / Torch of Triumph
        // Torch Handle / Cup
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.14, cy + size * 0.06);
        ctx.lineTo(cx + size * 0.14, cy + size * 0.06);
        ctx.lineTo(cx + size * 0.06, cy + size * 0.30);
        ctx.lineTo(cx - size * 0.06, cy + size * 0.30);
        ctx.closePath();
        ctx.fill();

        // Outer Flame (Amber)
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.18, cy + size * 0.04);
        ctx.quadraticCurveTo(cx - size * 0.30, cy - size * 0.12, cx - size * 0.06, cy - size * 0.34);
        ctx.quadraticCurveTo(cx, cy - size * 0.18, cx + size * 0.08, cy - size * 0.36);
        ctx.quadraticCurveTo(cx + size * 0.28, cy - size * 0.14, cx + size * 0.18, cy + size * 0.04);
        ctx.closePath();
        ctx.fill();

        // Inner Core Flame (Radiant Gold)
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.10, cy + size * 0.04);
        ctx.quadraticCurveTo(cx - size * 0.16, cy - size * 0.08, cx - size * 0.02, cy - size * 0.22);
        ctx.quadraticCurveTo(cx + size * 0.02, cy - size * 0.10, cx + size * 0.08, cy - size * 0.24);
        ctx.quadraticCurveTo(cx + size * 0.16, cy - size * 0.08, cx + size * 0.10, cy + size * 0.04);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'ACHIEVER':
      default: {
        // Imperial Laureled Sovereign Crown
        // 5-Point Regal Crown
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.28, cy + size * 0.12);
        ctx.lineTo(cx - size * 0.30, cy - size * 0.12);
        ctx.lineTo(cx - size * 0.15, cy + size * 0.02);
        ctx.lineTo(cx - size * 0.08, cy - size * 0.22);
        ctx.lineTo(cx, cy - size * 0.02);
        ctx.lineTo(cx, cy - size * 0.32);
        ctx.lineTo(cx, cy - size * 0.02);
        ctx.lineTo(cx + size * 0.08, cy - size * 0.22);
        ctx.lineTo(cx + size * 0.15, cy + size * 0.02);
        ctx.lineTo(cx + size * 0.30, cy - size * 0.12);
        ctx.lineTo(cx + size * 0.28, cy + size * 0.12);
        ctx.closePath();
        ctx.fill();

        // Crown Base Band
        ctx.fillStyle = accentColor;
        ctx.fillRect(cx - size * 0.28, cy + size * 0.12, size * 0.56, size * 0.08);

        // Center Finial Star on Highest Pinnacle
        ctx.fillStyle = isUnlocked ? '#FFFBEB' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy - size * 0.34, Math.max(1.5, size * 0.05), 0, Math.PI * 2);
        ctx.fill();

        // Laurel Wreath Leaves flanking the Crown
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = Math.max(1.5, size * 0.04);
        ctx.beginPath();
        ctx.arc(cx, cy + size * 0.10, size * 0.32, Math.PI * 0.65, Math.PI * 1.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy + size * 0.10, size * 0.32, Math.PI * -0.05, Math.PI * 0.35);
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Calculates dynamic countdown metrics from goal targetDate and current date
   * @param {object} goal
   * @returns {{ status: 'FUTURE'|'TODAY'|'OVERDUE'|'NO_DEADLINE', daysRemaining: number, headline: string, label: string, sublabel: string }}
   */
  static calculateCountdown(goal) {
    const title = goal?.title || 'Achievement Countdown Goal';
    const sublabel = `Until Your ${title} Milestone`;

    if (!goal?.targetDate) {
      const days = goal?.totalDays || 15;
      return {
        status: 'NO_DEADLINE',
        daysRemaining: days,
        headline: `${days} DAYS LEFT`,
        label: `${days} DAYS SPRINT`,
        sublabel
      };
    }

    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const target = new Date(goal.targetDate);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        return {
          status: 'FUTURE',
          daysRemaining: diffDays,
          headline: diffDays === 1 ? '1 DAY LEFT' : `${diffDays} DAYS LEFT`,
          label: `${diffDays} DAYS REMAINING`,
          sublabel
        };
      } else if (diffDays === 0) {
        return {
          status: 'TODAY',
          daysRemaining: 0,
          headline: 'DUE TODAY',
          label: 'DEADLINE TODAY',
          sublabel
        };
      } else {
        const overdueDays = Math.abs(diffDays);
        return {
          status: 'OVERDUE',
          daysRemaining: diffDays,
          headline: overdueDays === 1 ? '1 DAY OVERDUE' : `${overdueDays} DAYS OVERDUE`,
          label: 'OVERDUE',
          sublabel: `${sublabel} (Action Needed)`
        };
      }
    } catch {
      const days = goal?.totalDays || 15;
      return {
        status: 'NO_DEADLINE',
        daysRemaining: days,
        headline: `${days} DAYS LEFT`,
        label: `${days} DAYS SPRINT`,
        sublabel
      };
    }
  }

  /**
   * Draws an elegant vector hourglass / focus icon
   */
  static drawHourglassIcon(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color || '#F59E0B';
    ctx.fillStyle = color || '#F59E0B';
    ctx.lineWidth = Math.max(1.8, size * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const half = size / 2;
    const topY = cy - half;
    const bottomY = cy + half;
    const leftX = cx - half;
    const rightX = cx + half;

    // Top horizontal cap
    ctx.beginPath();
    ctx.moveTo(leftX, topY);
    ctx.lineTo(rightX, topY);
    ctx.stroke();

    // Bottom horizontal cap
    ctx.beginPath();
    ctx.moveTo(leftX, bottomY);
    ctx.lineTo(rightX, bottomY);
    ctx.stroke();

    // Hourglass bulb curves
    ctx.beginPath();
    ctx.moveTo(leftX + 2, topY);
    ctx.quadraticCurveTo(leftX + 2, cy - 2, cx, cy);
    ctx.quadraticCurveTo(rightX - 2, cy + 2, rightX - 2, bottomY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightX - 2, topY);
    ctx.quadraticCurveTo(rightX - 2, cy - 2, cx, cy);
    ctx.quadraticCurveTo(leftX + 2, cy + 2, leftX + 2, bottomY);
    ctx.stroke();

    // Sand grains in bottom bulb
    ctx.beginPath();
    ctx.moveTo(cx - half * 0.4, bottomY - 3);
    ctx.lineTo(cx + half * 0.4, bottomY - 3);
    ctx.lineTo(cx, cy + half * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draws a delicate hairline flourish divider with center diamond star
   */
  static drawFlourishDivider(ctx, cx, cy, width, color) {
    ctx.save();
    ctx.strokeStyle = color || '#F59E0B';
    ctx.fillStyle = color || '#F59E0B';
    ctx.lineWidth = 1;

    const halfW = width / 2;
    const gap = 16;

    // Left hairline
    ctx.beginPath();
    ctx.moveTo(cx - halfW, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.stroke();

    // Right hairline
    ctx.beginPath();
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + halfW, cy);
    ctx.stroke();

    // Center 4-point diamond star
    const starR = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - starR);
    ctx.lineTo(cx + starR * 0.6, cy);
    ctx.lineTo(cx, cy + starR);
    ctx.lineTo(cx - starR * 0.6, cy);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Intelligently selects the most relevant window of milestones to display
   * prioritising the active (in-progress) milestone and its immediate predecessors and successors
   * @param {Array} milestones
   * @param {number} maxCount
   * @returns {Array}
   */
  static selectVisibleMilestones(milestones, maxCount = 4) {
    if (!milestones || milestones.length <= maxCount) {
      return milestones || [];
    }

    const activeIdx = milestones.findIndex(m => m.status !== 'completed' && !m.completed);
    if (activeIdx === -1) {
      // All completed -> show the last maxCount milestones
      return milestones.slice(-maxCount);
    }

    // Center window around activeIdx: e.g. 1 completed before, active, and remaining upcoming
    let start = Math.max(0, activeIdx - 1);
    let end = start + maxCount;
    if (end > milestones.length) {
      end = milestones.length;
      start = Math.max(0, end - maxCount);
    }

    return milestones.slice(start, end);
  }

  /**
   * Draws a visually attractive signboard / timeline station for a milestone
   */
  static drawMilestoneSignboard(ctx, x, y, width, height, milestone, status, palette, scale) {
    const nodeRadius = Math.round(14 * scale);
    const nodeX = x + Math.round(24 * scale);
    const nodeY = y + (height / 2);
    const fontPrimary = "'Roboto', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

    // 1. Draw Circular Status Node
    if (status === 'completed') {
      // Emerald Green Checkmark Disc
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Checkmark icon
      ctx.font = `800 ${Math.round(14 * scale)}px ${fontPrimary}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', nodeX, nodeY);
    } else if (status === 'current') {
      // Glowing Amber In-Progress Disc
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, nodeRadius + Math.round(4 * scale), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(nodeX, nodeY, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.strokeStyle = '#FFFBEB';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Target center dot
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, Math.round(4 * scale), 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    } else {
      // Neutral Outlined Ring
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // 2. Draw Signboard Plaque Card (Right of Node)
    const plaqueLeft = nodeX + nodeRadius + Math.round(16 * scale);
    const plaqueWidth = width - (plaqueLeft - x);

    ctx.save();
    if (status === 'current') {
      // Elevated Active Plaque with Amber Rim
      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      this.drawRoundedRect(ctx, plaqueLeft, y, plaqueWidth, height, Math.round(14 * scale));
      ctx.fill();
      ctx.strokeStyle = palette.accentColor || '#F59E0B';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else if (status === 'completed') {
      // Completed Plaque
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      this.drawRoundedRect(ctx, plaqueLeft, y, plaqueWidth, height, Math.round(12 * scale));
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Pending Plaque
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      this.drawRoundedRect(ctx, plaqueLeft, y, plaqueWidth, height, Math.round(12 * scale));
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 3. Plaque Text & Tag
    const innerPadX = Math.round(16 * scale);
    const textStartX = plaqueLeft + innerPadX;
    const textMaxWidth = plaqueWidth - (innerPadX * 2);

    // Pill Tag & Day Header
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const tagY = y + Math.round(12 * scale);

    if (status === 'completed') {
      ctx.font = `700 ${Math.round(12 * scale)}px ${fontPrimary}`;
      ctx.fillStyle = '#10B981';
      ctx.fillText('COMPLETED', textStartX, tagY);
    } else if (status === 'current') {
      ctx.font = `800 ${Math.round(12 * scale)}px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor || '#F59E0B';
      ctx.fillText('IN PROGRESS • CURRENT FOCUS', textStartX, tagY);
    } else {
      ctx.font = `600 ${Math.round(12 * scale)}px ${fontPrimary}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillText('UPCOMING', textStartX, tagY);
    }

    // Target Day / Date on right of tag
    const dayStr = milestone.targetDay ? `Day ${milestone.targetDay}` : (milestone.order ? `Milestone #${milestone.order}` : '');
    const dateStr = milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
    const metaStr = [dayStr, dateStr].filter(Boolean).join(' • ');

    if (metaStr) {
      ctx.textAlign = 'right';
      ctx.font = `500 ${Math.round(12 * scale)}px ${fontPrimary}`;
      ctx.fillStyle = status === 'current' ? (palette.accentColor || '#F59E0B') : 'rgba(255, 255, 255, 0.55)';
      ctx.fillText(metaStr, plaqueLeft + plaqueWidth - innerPadX, tagY);
    }

    // Milestone Title
    ctx.textAlign = 'left';
    const titleY = tagY + Math.round(18 * scale);
    const titleFontSize = status === 'current' ? Math.round(20 * scale) : Math.round(17 * scale);
    const titleWeight = status === 'current' ? '800' : '600';
    ctx.font = `${titleWeight} ${titleFontSize}px ${fontPrimary}`;
    ctx.fillStyle = status === 'completed'
      ? 'rgba(255, 255, 255, 0.90)'
      : (status === 'current' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.70)');

    let mTitle = milestone.title || `Milestone #${milestone.order || 1}`;
    while (ctx.measureText(mTitle).width > textMaxWidth && mTitle.length > 10) {
      mTitle = mTitle.slice(0, -1).trim();
    }
    if (mTitle.length < (milestone.title || '').length) mTitle += '...';
    ctx.fillText(mTitle, textStartX, titleY);

    ctx.restore();
  }

  /**
   * Layout Renderer: Premium Motivational Nature Wallpaper (Mobile: 9:16, 9:20 Motorola Edge 50, compact)
   * 
   * Composition Structure:
   * - Section A: Motivational Header ("Keep Going!", script font, supporting line, flourish divider)
   * - Section B: Days Remaining Countdown ("15 DAYS LEFT", vector hourglass, goal title)
   * - Section C: Course Progress Card (Translucent glass card, circular progress, "Course Progress", count, highest badge)
   * - Section D: Milestone Journey Tracker (Vertical connected timeline track with signboard station design)
   * - Section E: Motivational Footer (Progress-based quote, hallmark branding)
   */
  static renderMobileLayout(ctx, width, height, safeZone, data) {
    const { goal, palette, daysRemaining, progressPct, activeMilestone, upcomingMilestone, badges, motivation } = data;
    const fontPrimary = "'Roboto', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    const fontSerif = "'Caveat', 'Playfair Display', 'Georgia', cursive, serif, sans-serif";

    const scale = Math.min(width / 1080, 1.2);
    const verticalRatio = height / 1920; // 1.0 for 1080x1920, 1.25 for 1080x2400 (Motorola Edge 50 Fusion!)

    const paddingX = Math.round(width * 0.065);
    const contentLeft = paddingX;
    const contentWidth = width - (paddingX * 2);
    const contentCenterX = width / 2;

    // Top start: comfortably clear the OS clock & camera notch (0-13% to 0-14%)
    let cursorY = Math.max(safeZone.topReserved || 260, Math.round(height * 0.13));

    // ========================================================
    // SECTION A: MOTIVATIONAL HEADER
    // ========================================================
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Flourish Top Divider
    this.drawFlourishDivider(ctx, contentCenterX, cursorY, Math.min(contentWidth * 0.45, 360), palette.accentColor || '#F59E0B');
    cursorY += Math.round(14 * scale);

    // Script / Display Heading: "Keep Going!"
    ctx.font = `italic 700 ${Math.round(42 * scale)}px ${fontSerif}`;
    ctx.fillStyle = '#FEF3C7'; // Warm champagne gold
    ctx.fillText('Keep Going!', contentCenterX, cursorY);
    cursorY += Math.round(48 * scale);

    // Supporting Tagline: "Big dreams are built one lesson at a time."
    ctx.font = `500 ${Math.round(19 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fillText('Big dreams are built one lesson at a time.', contentCenterX, cursorY);
    cursorY += Math.round(36 * scale);

    // Flourish Bottom Divider
    this.drawFlourishDivider(ctx, contentCenterX, cursorY, Math.min(contentWidth * 0.35, 280), 'rgba(255, 255, 255, 0.35)');
    cursorY += Math.round(28 * Math.min(verticalRatio, 1.25));

    // ========================================================
    // SECTION B: DAYS REMAINING COUNTDOWN (MAJOR DESIGN ELEMENT)
    // ========================================================
    const countdown = this.calculateCountdown(goal);

    // Countdown Number & Label: e.g. "15 DAYS LEFT" or "DUE TODAY"
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;

    // Draw Vector Hourglass Icon next to countdown
    const iconSize = Math.round(28 * scale);
    const iconY = cursorY + Math.round(14 * scale);
    this.drawHourglassIcon(ctx, contentCenterX - Math.round(240 * scale), iconY, iconSize, palette.accentColor || '#F59E0B');

    ctx.font = `900 ${Math.round(72 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(countdown.headline, contentCenterX, cursorY);
    ctx.restore();

    cursorY += Math.round(78 * scale);

    // Subtitle: "Until Your [Goal Title] Milestone"
    ctx.font = `600 ${Math.round(22 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.textAlign = 'center';
    cursorY = this.fitAndWrapText(ctx, countdown.sublabel, contentCenterX, cursorY, contentWidth * 0.9, Math.round(22 * scale), Math.round(16 * scale), fontPrimary, 2, '600');

    cursorY += Math.round(32 * Math.min(verticalRatio, 1.25));

    // ========================================================
    // SECTION C: COURSE PROGRESS CARD
    // ========================================================
    const progressCardH = Math.round(195 * Math.min(verticalRatio, 1.2));
    ctx.fillStyle = palette.cardBackground || 'rgba(15, 23, 42, 0.65)';
    this.drawRoundedRect(ctx, contentLeft, cursorY, contentWidth, progressCardH, Math.round(22 * scale));
    ctx.fill();
    ctx.strokeStyle = palette.cardBorder || 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Circular Progress Ring (Left Side)
    const ringRadius = Math.round(62 * scale);
    const ringCx = contentLeft + Math.round(100 * scale);
    const ringCy = cursorY + (progressCardH / 2);

    this.drawProgressRing(ctx, ringCx, ringCy, ringRadius, Math.round(13 * scale), progressPct, palette.progressFill || palette.accentColor || '#F59E0B', palette.progressTrack || 'rgba(255, 255, 255, 0.12)');

    // Center Percentage inside Progress Ring
    ctx.font = `900 ${Math.round(38 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${progressPct}%`, ringCx, ringCy - Math.round(6 * scale));

    ctx.font = `800 ${Math.round(12 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    const statusText = progressPct >= 100 ? 'COMPLETED' : (progressPct > 0 ? 'IN PROGRESS' : 'NOT STARTED');
    ctx.fillText(statusText, ringCx, ringCy + Math.round(22 * scale));

    // Right Side: Category Pill, "Course Progress", Count, Streak, Badge
    const textLeft = ringCx + ringRadius + Math.round(34 * scale);
    const textTop = cursorY + Math.round(24 * scale);

    // Category Pill
    const categoryTag = (goal?.category || (goal?.sourceType ? `${goal.sourceType} Course` : 'Course')).toUpperCase();
    ctx.font = `700 ${Math.round(13 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor || '#F59E0B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`✦ ${categoryTag}`, textLeft, textTop);

    // Title: "Course Progress"
    ctx.font = `800 ${Math.round(24 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.fillText('Course Progress', textLeft, textTop + Math.round(22 * scale));

    // Completed Days / Milestones count: "6 of 15 Days Complete"
    const milestones = goal?.milestones || [];
    const completedCount = milestones.filter(m => m.status === 'completed' || m.completed === true).length;
    const countLabel = milestones.length > 0
      ? `${completedCount} of ${milestones.length} Milestones Complete`
      : `${Math.round((progressPct / 100) * (goal?.totalDays || 15))} of ${goal?.totalDays || 15} Days Complete`;

    ctx.font = `600 ${Math.round(17 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText(countLabel, textLeft, textTop + Math.round(54 * scale));

    // Real Analytics Stats & Highest Unlocked Badge
    const unlockedBadges = (badges || []).filter(b => b.unlocked);
    const highestBadge = unlockedBadges[unlockedBadges.length - 1];

    const statPills = [];
    if (highestBadge) {
      statPills.push(`★ Highest: ${highestBadge.name}`);
    }
    if (goal?.streakDays && goal.streakDays > 0) {
      statPills.push(`🔥 ${goal.streakDays}d Streak`);
    }
    if (goal?.courseMetadata?.durationHours) {
      statPills.push(`⏱️ ${goal.courseMetadata.durationHours}h`);
    }

    if (statPills.length > 0) {
      ctx.font = `700 ${Math.round(14 * scale)}px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor || '#F59E0B';
      ctx.fillText(statPills.join('   •   '), textLeft, textTop + Math.round(86 * scale));
    }

    cursorY += progressCardH + Math.round(28 * Math.min(verticalRatio, 1.25));

    // ========================================================
    // SECTION D: MILESTONE JOURNEY TRACKER (SIGNBOARD TIMELINE)
    // ========================================================
    const maxMilestones = height >= 2200 ? 5 : (height >= 1800 ? 4 : 3);
    const signboardH = height >= 2200 ? Math.round(84 * scale) : Math.round(74 * scale);
    const signboardGap = Math.round(14 * scale);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `800 ${Math.round(16 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor || '#F59E0B';
    ctx.fillText('MILESTONE JOURNEY TRACKER', contentLeft, cursorY);

    ctx.textAlign = 'right';
    ctx.font = `600 ${Math.round(15 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText(`${completedCount} of ${milestones.length} Completed`, contentLeft + contentWidth, cursorY);

    cursorY += Math.round(28 * scale);

    // Select intelligent window of milestones (focusing around active milestone)
    const sortedMilestones = [...milestones].sort((a, b) => (a.order || 0) - (b.order || 0));
    const visibleMilestones = this.selectVisibleMilestones(sortedMilestones, maxMilestones);

    // Vertical timeline connecting track
    if (visibleMilestones.length > 1) {
      const trackX = contentLeft + Math.round(24 * scale);
      const trackTopY = cursorY + (signboardH / 2);
      const trackBottomY = cursorY + ((visibleMilestones.length - 1) * (signboardH + signboardGap)) + (signboardH / 2);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(trackX, trackTopY);
      ctx.lineTo(trackX, trackBottomY);
      ctx.stroke();
    }

    visibleMilestones.forEach((m, idx) => {
      const rowY = cursorY + (idx * (signboardH + signboardGap));
      const isCompleted = m.status === 'completed' || m.completed === true;
      const isActive = !isCompleted && (m.id === activeMilestone?.id || idx === 0 && !completedCount);
      const status = isCompleted ? 'completed' : (isActive ? 'current' : 'pending');

      this.drawMilestoneSignboard(ctx, contentLeft, rowY, contentWidth, signboardH, m, status, palette, scale);
    });

    cursorY += (visibleMilestones.length * (signboardH + signboardGap));

    // Overflow indicator if total milestones exceeds visible count
    if (sortedMilestones.length > visibleMilestones.length) {
      const remainingCount = sortedMilestones.length - visibleMilestones.length;
      ctx.font = `italic 600 ${Math.round(14 * scale)}px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor || '#F59E0B';
      ctx.textAlign = 'left';
      ctx.fillText(`+${remainingCount} more completed milestones in journey`, contentLeft + Math.round(56 * scale), cursorY + 4);
      cursorY += Math.round(24 * scale);
    }

    // ========================================================
    // SECTION E: MOTIVATIONAL FOOTER
    // ========================================================
    const footerTop = Math.max(cursorY + 20, height - Math.round(135 * Math.min(verticalRatio, 1.25)));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Progress-based motivational quote
    const quoteStr = `"${motivation.quote}"`;
    ctx.font = `italic 500 ${Math.round(21 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    this.wrapText(ctx, quoteStr, contentCenterX, footerTop, contentWidth * 0.94, Math.round(30 * scale), 2);

    // Hallmark branding
    ctx.font = `700 ${Math.round(13 * scale)}px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor || '#F59E0B';
    ctx.fillText('HORIZON ACHIEVEMENT HUD • MOTIVATIONAL WALLPAPER', contentCenterX, height - Math.round(55 * scale));
  }

  /**
   * Layout Renderer: Desktop Display (1920x1080)
   * 
   * Asymmetric 16:9 panoramic composition:
   * - Left 50%: Motivational Header, Days Countdown with vector icon, Goal Title, and Motivational Quote
   * - Right 46%: Course Progress Card + Milestone Journey Tracker Signboard with glowing timeline
   */
  static renderDesktopLayout(ctx, width, height, safeZone, data) {
    const { goal, palette, daysRemaining, progressPct, activeMilestone, upcomingMilestone, badges, motivation } = data;
    const fontPrimary = "'Roboto', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
    const fontSerif = "'Caveat', 'Playfair Display', 'Georgia', cursive, serif, sans-serif";

    const hudLeft = Math.round(width * 0.50);
    const hudWidth = Math.round(width * 0.44);
    const hudTop = safeZone.contentTop + 24;
    const hudHeight = height - safeZone.topReserved - safeZone.bottomReserved - 48;

    // --- Left Panoramic Area: Motivational Header, Countdown, Quote ---
    const brandLeft = Math.round(width * 0.08);
    const leftWidth = hudLeft - brandLeft - 60;
    let leftCursorY = safeZone.contentTop + 40;

    // Section A: Motivational Header
    this.drawFlourishDivider(ctx, brandLeft + 140, leftCursorY, 260, palette.accentColor || '#F59E0B');
    leftCursorY += 14;

    ctx.font = `italic 700 38px ${fontSerif}`;
    ctx.fillStyle = '#FEF3C7';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Keep Going!', brandLeft, leftCursorY);
    leftCursorY += 44;

    ctx.font = `500 18px ${fontPrimary}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Big dreams are built one lesson at a time.', brandLeft, leftCursorY);
    leftCursorY += 40;

    // Section B: Days Remaining Countdown
    const countdown = this.calculateCountdown(goal);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 12;

    this.drawHourglassIcon(ctx, brandLeft + 20, leftCursorY + 34, 32, palette.accentColor || '#F59E0B');

    ctx.font = `900 68px ${fontPrimary}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(countdown.headline, brandLeft + 54, leftCursorY);
    ctx.restore();
    leftCursorY += 80;

    // Subtitle Callout
    ctx.font = `600 22px ${fontPrimary}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    leftCursorY = this.fitAndWrapText(ctx, countdown.sublabel, brandLeft, leftCursorY, leftWidth, 22, 16, fontPrimary, 2, '600');
    leftCursorY += 30;

    // Real Analytics Pills
    const analyticsPills = [];
    if (goal?.streakDays && goal.streakDays > 0) {
      analyticsPills.push(`🔥 ${goal.streakDays}-Day Streak`);
    }
    const milestones = goal?.milestones || [];
    const sortedMilestones = [...milestones].sort((a, b) => (a.order || 0) - (b.order || 0));
    const completedCount = milestones.filter(m => m.status === 'completed' || m.completed === true).length;
    if (milestones.length > 0) {
      analyticsPills.push(`✓ ${completedCount}/${milestones.length} Milestones (${progressPct}%)`);
    }
    if (goal?.courseMetadata?.durationHours) {
      analyticsPills.push(`⏱️ ${goal.courseMetadata.durationHours} Hours Total`);
    }

    if (analyticsPills.length > 0) {
      ctx.font = `700 16px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor || '#F59E0B';
      ctx.fillText(analyticsPills.join('   •   '), brandLeft, leftCursorY);
      leftCursorY += 45;
    }

    leftCursorY += 15;

    // Section E: Motivational Quote on Left Pane
    ctx.font = `italic 500 23px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    this.wrapText(ctx, `"${motivation.quote}"`, brandLeft, leftCursorY, leftWidth, 34, 2);

    // --- Right Panoramic Area: Progress Card + Milestone Journey Tracker ---
    let hudCursorY = hudTop;

    // Section C: Course Progress Card in Right Pane
    const progressCardH = 180;
    ctx.fillStyle = palette.cardBackground || 'rgba(15, 23, 42, 0.65)';
    this.drawRoundedRect(ctx, hudLeft, hudCursorY, hudWidth, progressCardH, 20);
    ctx.fill();
    ctx.strokeStyle = palette.cardBorder || 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Progress Ring
    const ringRadius = 56;
    const ringCx = hudLeft + 85;
    const ringCy = hudCursorY + (progressCardH / 2);
    this.drawProgressRing(ctx, ringCx, ringCy, ringRadius, 12, progressPct, palette.progressFill || palette.accentColor || '#F59E0B', palette.progressTrack || 'rgba(255, 255, 255, 0.12)');

    ctx.font = `900 32px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${progressPct}%`, ringCx, ringCy - 4);

    ctx.font = `800 11px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    const statusText = progressPct >= 100 ? 'COMPLETED' : (progressPct > 0 ? 'IN PROGRESS' : 'NOT STARTED');
    ctx.fillText(statusText, ringCx, ringCy + 20);

    // Progress Details
    const textLeft = ringCx + ringRadius + 30;
    const textTop = hudCursorY + 28;

    const categoryTag = (goal?.category || (goal?.sourceType ? `${goal.sourceType} Course` : 'Course')).toUpperCase();
    ctx.font = `700 13px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor || '#F59E0B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`✦ ${categoryTag}`, textLeft, textTop);

    ctx.font = `800 22px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.fillText('Course Progress', textLeft, textTop + 20);

    const countLabel = milestones.length > 0
      ? `${completedCount} of ${milestones.length} Milestones Complete`
      : `${Math.round((progressPct / 100) * (goal?.totalDays || 15))} of ${goal?.totalDays || 15} Days Complete`;
    ctx.font = `600 16px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText(countLabel, textLeft, textTop + 50);

    const unlockedBadges = (badges || []).filter(b => b.unlocked);
    const highestBadge = unlockedBadges[unlockedBadges.length - 1];
    if (highestBadge) {
      ctx.font = `700 13px ${fontPrimary}`;
      ctx.fillStyle = highestBadge.color || '#F59E0B';
      ctx.fillText(`★ Highest: ${highestBadge.name}`, textLeft, textTop + 80);
    }

    hudCursorY += progressCardH + 24;

    // Section D: Milestone Journey Tracker Signboards in Right Pane
    ctx.font = `800 15px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor || '#F59E0B';
    ctx.fillText('MILESTONE JOURNEY TRACKER', hudLeft, hudCursorY);

    hudCursorY += 24;

    const maxDesktopMilestones = 4;
    const signboardH = 68;
    const signboardGap = 12;
    const visibleMilestones = this.selectVisibleMilestones(sortedMilestones, maxDesktopMilestones);

    // Vertical timeline track
    if (visibleMilestones.length > 1) {
      const trackX = hudLeft + 24;
      const trackTopY = hudCursorY + (signboardH / 2);
      const trackBottomY = hudCursorY + ((visibleMilestones.length - 1) * (signboardH + signboardGap)) + (signboardH / 2);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(trackX, trackTopY);
      ctx.lineTo(trackX, trackBottomY);
      ctx.stroke();
    }

    visibleMilestones.forEach((m, idx) => {
      const rowY = hudCursorY + (idx * (signboardH + signboardGap));
      const isCompleted = m.status === 'completed' || m.completed === true;
      const isActive = !isCompleted && (m.id === activeMilestone?.id || idx === 0 && !completedCount);
      const status = isCompleted ? 'completed' : (isActive ? 'current' : 'pending');

      this.drawMilestoneSignboard(ctx, hudLeft, rowY, hudWidth, signboardH, m, status, palette, 0.95);
    });

    hudCursorY += (visibleMilestones.length * (signboardH + signboardGap));

    if (sortedMilestones.length > visibleMilestones.length) {
      const remainingCount = sortedMilestones.length - visibleMilestones.length;
      ctx.font = `italic 600 13px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor || '#F59E0B';
      ctx.fillText(`+${remainingCount} more completed milestones in journey`, hudLeft + 48, hudCursorY + 4);
    }
  }
}
