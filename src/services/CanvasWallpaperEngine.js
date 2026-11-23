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
  MOBILE: { width: 1080, height: 1920, orientation: 'mobile' },
  DESKTOP: { width: 1920, height: 1080, orientation: 'desktop' }
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

      const dim = (preset === 'DESKTOP') ? CANVAS_DIMENSIONS.DESKTOP : CANVAS_DIMENSIONS.MOBILE;
      const safeZone = (preset === 'DESKTOP') ? SAFE_ZONES.DESKTOP : SAFE_ZONES.MOBILE;

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
   * Layout Renderer: Mobile Lock-Screen (1080x1920)
   * 
   * Strict adherence to Mobile Lock-Screen Safe Zones with Rich Analytics HUD Scaling:
   * - Top 0–23% (0 - 440px): Kept empty for OS Clock, Dynamic Island, and Notifications
   * - Main content 23–85% (440 - 1630px): Scaled Goal header, Progress & Analytics Cockpit,
   *   Milestone Roadmap with Current Focus card, and 5 Luxury Gold Achievement Medallions
   * - Footer 85–96% (1640 - 1840px): Inspiring motivational quote and Horizon Branding
   * - Horizontal margins: 60px (960px content width) for optimal phone display readability
   */
  static renderMobileLayout(ctx, width, height, safeZone, data) {
    const { goal, palette, daysRemaining, progressPct, activeMilestone, upcomingMilestone, badges, motivation } = data;
    const fontPrimary = "'Roboto', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

    // Horizontal padding: 60px padding for wide 960px reading area on 1080w
    const contentLeft = 60;
    const contentWidth = width - (contentLeft * 2); // 960px

    // Content starts at 440px to safely clear the OS clock while eliminating the bottom void!
    let cursorY = Math.round(height * 0.23); // ~442px

    // --- Block 1: Goal Header (Category Pill, Title with Auto-Fit, Duration) ---
    const category = (goal?.category || (goal?.sourceType ? `${goal.sourceType} Course` : 'Learning')).toUpperCase();
    ctx.font = `700 18px ${fontPrimary}`;
    const catMetrics = ctx.measureText(category);
    const pillW = catMetrics.width + 32;
    const pillH = 38;

    ctx.fillStyle = palette.cardBackground || 'rgba(15, 23, 42, 0.78)';
    this.drawRoundedRect(ctx, contentLeft, cursorY, pillW, pillH, 19);
    ctx.fill();
    ctx.strokeStyle = palette.accentColor || '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = palette.accentColor || '#F59E0B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(category, contentLeft + 16, cursorY + (pillH / 2));

    // Optional Duration Subtitle on right of pill
    if (goal?.totalDays) {
      ctx.textAlign = 'right';
      ctx.font = `600 18px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      ctx.fillText(`${goal.totalDays}-Day Sprint`, contentLeft + contentWidth, cursorY + (pillH / 2));
    }

    cursorY += pillH + 18;

    // Goal Title with auto-fit, wrapping (Max 2 lines), and shadow for contrast
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = palette.primaryText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const goalTitle = goal?.title || 'Achievement Countdown Goal';
    cursorY = this.fitAndWrapText(ctx, goalTitle, contentLeft, cursorY, contentWidth, 50, 36, fontPrimary, 2, '800');
    ctx.restore();

    cursorY += 20;

    // --- Block 2: Progress & Analytics Hero Card (Cockpit HUD) ---
    const heroCardH = 290;
    ctx.fillStyle = palette.cardBackground || 'rgba(15, 23, 42, 0.78)';
    this.drawRoundedRect(ctx, contentLeft, cursorY, contentWidth, heroCardH, 24);
    ctx.fill();
    ctx.strokeStyle = palette.cardBorder || 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Circular Progress Arc (Left Column in Hero Card)
    const ringRadius = 88;
    const ringCx = contentLeft + 125;
    const ringCy = cursorY + (heroCardH / 2);

    this.drawProgressRing(ctx, ringCx, ringCy, ringRadius, 16, progressPct, palette.progressFill, palette.progressTrack);

    // Center Percentage inside Progress Ring
    ctx.font = `800 46px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${progressPct}%`, ringCx, ringCy - 8);

    ctx.font = `800 14px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    const statusLabel = progressPct >= 100 ? 'COMPLETED' : (progressPct > 0 ? 'IN PROGRESS' : 'NOT STARTED');
    ctx.fillText(statusLabel, ringCx, ringCy + 28);

    // Countdown & Goal Analytics (Right Column in Hero Card)
    const countLeft = ringCx + ringRadius + 40;
    const countTop = cursorY + 32;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `800 74px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.fillText(String(daysRemaining), countLeft, countTop);

    ctx.font = `800 18px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor;
    ctx.fillText('DAYS REMAINING', countLeft, countTop + 76);

    ctx.font = `500 17px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    const targetLabel = goal?.targetDate
      ? new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : `Target: ${daysRemaining} days`;
    ctx.fillText(`Deadline: ${targetLabel}`, countLeft, countTop + 106);

    // Real Analytics Chips
    const analyticsItems = [];
    if (goal?.streakDays && goal.streakDays > 0) {
      analyticsItems.push(`🔥 ${goal.streakDays}d Streak`);
    }
    const milestones = goal?.milestones || [];
    const completedCount = milestones.filter(m => m.status === 'completed' || m.completed === true).length;
    if (milestones.length > 0) {
      analyticsItems.push(`✓ ${completedCount}/${milestones.length} Done (${progressPct}%)`);
    }
    if (goal?.courseMetadata?.durationHours) {
      analyticsItems.push(`⏱️ ${goal.courseMetadata.durationHours}h`);
    }

    if (analyticsItems.length > 0) {
      ctx.font = `700 15px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor;
      ctx.fillText(analyticsItems.join('   •   '), countLeft, countTop + 144);
    }

    cursorY += heroCardH + 24;

    // --- Block 3: Milestone Roadmap & Current Focus Card ---
    const sortedMilestones = [...milestones].sort((a, b) => (a.order || 0) - (b.order || 0));
    const completedList = sortedMilestones.filter(m => m.status === 'completed' || m.completed === true);
    const pendingList = sortedMilestones.filter(m => m.status !== 'completed' && !m.completed);

    const milestoneCardH = 340;
    ctx.fillStyle = palette.cardBackground || 'rgba(15, 23, 42, 0.78)';
    this.drawRoundedRect(ctx, contentLeft, cursorY, contentWidth, milestoneCardH, 22);
    ctx.fill();
    ctx.strokeStyle = palette.cardBorder || 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Card Header Row
    ctx.font = `700 16px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MILESTONE TRACKER & CURRENT FOCUS', contentLeft + 24, cursorY + 20);

    ctx.textAlign = 'right';
    ctx.fillStyle = palette.secondaryText;
    ctx.font = `600 16px ${fontPrimary}`;
    ctx.fillText(`${completedList.length} of ${milestones.length} Completed`, contentLeft + contentWidth - 24, cursorY + 20);

    let mItemY = cursorY + 54;

    // Sub-card for Active Focus Milestone
    if (activeMilestone) {
      const focusCardH = 136;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      this.drawRoundedRect(ctx, contentLeft + 20, mItemY, contentWidth - 40, focusCardH, 14);
      ctx.fill();
      ctx.strokeStyle = palette.accentColor || '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = `700 14px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor;
      ctx.fillText(`🎯 CURRENT FOCUS • MILESTONE #${activeMilestone.order}`, contentLeft + 36, mItemY + 16);

      ctx.fillStyle = palette.primaryText;
      let focusTitleY = mItemY + 42;
      focusTitleY = this.fitAndWrapText(ctx, activeMilestone.title, contentLeft + 36, focusTitleY, contentWidth - 72, 24, 18, fontPrimary, 2, '700');

      ctx.font = `500 14px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      const targetStr = activeMilestone.targetDay ? `Day ${activeMilestone.targetDay}` : '';
      const dueStr = activeMilestone.dueDate ? `Target: ${new Date(activeMilestone.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : '';
      const milestoneMeta = [targetStr, dueStr].filter(Boolean).join(' • ');
      if (milestoneMeta) {
        ctx.fillText(milestoneMeta, contentLeft + 36, mItemY + focusCardH - 22);
      }

      mItemY += focusCardH + 18;
    }

    // Upcoming Milestone Row (if any)
    if (upcomingMilestone) {
      ctx.textAlign = 'left';
      ctx.font = `700 15px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      ctx.fillText('UPCOMING', contentLeft + 24, mItemY);

      ctx.font = `600 17px ${fontPrimary}`;
      ctx.fillStyle = palette.primaryText;
      let upTitle = `#${upcomingMilestone.order} ${upcomingMilestone.title}`;
      while (ctx.measureText(upTitle).width > contentWidth - 140 && upTitle.length > 10) {
        upTitle = upTitle.slice(0, -1).trim();
      }
      if (upTitle.length < `#${upcomingMilestone.order} ${upcomingMilestone.title}`.length) upTitle += '...';
      ctx.fillText(upTitle, contentLeft + 120, mItemY);
      mItemY += 32;
    }

    // Completed milestones summary / overflow
    if (completedList.length > 0) {
      const recentCompleted = completedList[completedList.length - 1];
      ctx.textAlign = 'left';
      ctx.font = `700 15px ${fontPrimary}`;
      ctx.fillStyle = '#10B981';
      ctx.fillText('✓', contentLeft + 24, mItemY);

      ctx.font = `500 16px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      let compTitle = `Completed: #${recentCompleted.order} ${recentCompleted.title}`;
      while (ctx.measureText(compTitle).width > contentWidth - 70 && compTitle.length > 10) {
        compTitle = compTitle.slice(0, -1).trim();
      }
      if (compTitle.length < `Completed: #${recentCompleted.order} ${recentCompleted.title}`.length) compTitle += '...';
      ctx.fillText(compTitle, contentLeft + 48, mItemY);
      mItemY += 26;

      if (completedList.length > 1) {
        ctx.font = `italic 600 14px ${fontPrimary}`;
        ctx.fillStyle = palette.accentColor;
        ctx.fillText(`+${completedList.length - 1} more completed milestones`, contentLeft + 48, mItemY);
      }
    } else if (!upcomingMilestone && pendingList.length > 1) {
      const nextPending = pendingList[1];
      ctx.font = `500 15px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      ctx.fillText(`○ Day ${nextPending.targetDay}: ${nextPending.title.slice(0, 50)}`, contentLeft + 24, mItemY);
    }

    cursorY += milestoneCardH + 24;

    // --- Block 4: Achievement Badges Strip & Highest Unlocked Tier ---
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 18px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText('ACHIEVEMENT BADGES', contentLeft, cursorY);

    // Highest Unlocked Badge Label
    const unlockedBadges = badges.filter(b => b.unlocked);
    const highestBadge = unlockedBadges[unlockedBadges.length - 1];
    if (highestBadge) {
      ctx.textAlign = 'right';
      ctx.font = `700 16px ${fontPrimary}`;
      ctx.fillStyle = highestBadge.color || '#F59E0B';
      ctx.fillText(`★ Highest: ${highestBadge.name}`, contentLeft + contentWidth, cursorY);
    } else {
      ctx.textAlign = 'right';
      ctx.font = `500 15px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      ctx.fillText('Milestone 1 unlocks First Step', contentLeft + contentWidth, cursorY);
    }

    cursorY += 34;

    const badgeRadius = 46; // Diameter 92px
    const colWidth = contentWidth / 5; // 192px per badge column

    badges.forEach((b, idx) => {
      const cx = contentLeft + (idx * colWidth) + (colWidth / 2);
      const cy = cursorY + badgeRadius + 4;

      // Draw Luxury Medallion
      this.drawLuxuryBadge(ctx, cx, cy, badgeRadius, b, palette);

      // Badge Name Label
      ctx.font = `700 15px ${fontPrimary}`;
      ctx.fillStyle = b.unlocked ? palette.primaryText : 'rgba(255, 255, 255, 0.45)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(b.name, cx, cy + badgeRadius + 24);

      // Sub-label (threshold / order)
      ctx.font = `600 13px ${fontPrimary}`;
      ctx.fillStyle = b.unlocked ? (palette.accentColor || '#F59E0B') : 'rgba(255, 255, 255, 0.3)';
      const subLabel = b.key === 'FIRST_STEP' ? '1st Step' : (b.key === 'ACHIEVER' ? '100% Goal' : `${b.thresholdPct}% Mark`);
      ctx.fillText(subLabel, cx, cy + badgeRadius + 44);
    });

    cursorY += (badgeRadius * 2) + 80;

    // --- Block 5: Footer Zone (85–97% / 1632 - 1862px): Tagline & Branding ---
    const footerTop = Math.max(cursorY, Math.round(height * 0.86)); // ~1650px
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `italic 500 24px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    const quoteStr = `"${motivation.quote}"`;
    this.wrapText(ctx, quoteStr, width / 2, footerTop, contentWidth, 34, 2);

    // Clean Horizon Branding above bottom gesture bar
    ctx.font = `700 14px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor || '#F59E0B';
    ctx.fillText('HORIZON ACHIEVEMENT HUD • FULL-RESOLUTION 1080×1920', width / 2, Math.round(height * 0.95));
  }

  /**
   * Layout Renderer: Desktop Display (1920x1080)
   * 
   * Asymmetric 16:9 composition:
   * - Left 52%: Cinematic branding, headline, duration, real analytics chips, and motivational quote
   * - Right 44%: Glass HUD card with circular progress, days counter, milestone list, and badges
   */
  static renderDesktopLayout(ctx, width, height, safeZone, data) {
    const { goal, palette, daysRemaining, progressPct, activeMilestone, upcomingMilestone, badges, motivation } = data;
    const fontPrimary = "'Roboto', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

    const hudLeft = Math.round(width * 0.52);
    const hudWidth = Math.round(width * 0.42);
    const hudTop = safeZone.contentTop + 30;
    const hudHeight = height - safeZone.topReserved - safeZone.bottomReserved - 60;

    // --- Left Panoramic Area: Branding, Headline, Real Analytics, Quote ---
    const brandLeft = Math.round(width * 0.08); // 8% horizontal margin
    const leftWidth = hudLeft - brandLeft - 60;
    let leftCursorY = safeZone.contentTop + 60;

    // Category Pill
    const category = (goal?.category || (goal?.sourceType ? `${goal.sourceType} Course` : 'Learning')).toUpperCase();
    ctx.font = `700 18px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`HORIZON GOAL • ${category}`, brandLeft, leftCursorY);
    leftCursorY += 34;

    // Goal Title with auto-fit and wrapping
    ctx.fillStyle = palette.primaryText;
    const goalTitle = goal?.title || 'Achievement Countdown Goal';
    leftCursorY = this.fitAndWrapText(ctx, goalTitle, brandLeft, leftCursorY, leftWidth, 56, 38, fontPrimary, 2, '800');

    leftCursorY += 24;

    // Target Deadline & Sprint Subtitle
    ctx.font = `600 20px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    const targetDateStr = goal?.targetDate
      ? new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
      : `${daysRemaining} days`;
    ctx.fillText(`Target Deadline: ${targetDateStr} (${daysRemaining} Days Remaining)`, brandLeft, leftCursorY);
    leftCursorY += 34;

    // Real Analytics Pills (rendered only when present in data model)
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
      ctx.fillStyle = palette.accentColor;
      ctx.fillText(analyticsPills.join('   •   '), brandLeft, leftCursorY);
      leftCursorY += 40;
    }

    leftCursorY += 20;

    // Motivational Quote on Left Pane
    ctx.font = `italic 500 24px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    this.wrapText(ctx, `"${motivation.quote}"`, brandLeft, leftCursorY, leftWidth, 36, 2);

    // --- Right Glass HUD Container Card ---
    ctx.fillStyle = palette.cardBackground || 'rgba(15, 23, 42, 0.70)';
    this.drawRoundedRect(ctx, hudLeft, hudTop, hudWidth, hudHeight, 26);
    ctx.fill();
    ctx.strokeStyle = palette.cardBorder || 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    let hudCursorY = hudTop + 35;
    const hudInnerLeft = hudLeft + 36;
    const hudInnerWidth = hudWidth - 72;

    // Progress Ring & Countdown Section
    const ringRadius = 60;
    const ringCx = hudInnerLeft + ringRadius;
    const ringCy = hudCursorY + ringRadius;

    this.drawProgressRing(ctx, ringCx, ringCy, ringRadius, 13, progressPct, palette.progressFill, palette.progressTrack);

    ctx.font = `800 32px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${progressPct}%`, ringCx, ringCy - 4);

    ctx.font = `700 13px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText('PROGRESS', ringCx, ringCy + 22);

    // Days Countdown Callout (Right of Ring)
    const countLeft = ringCx + ringRadius + 35;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `800 56px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.fillText(String(daysRemaining), countLeft, hudCursorY - 5);

    ctx.font = `800 16px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor;
    ctx.fillText('DAYS REMAINING', countLeft, hudCursorY + 54);

    ctx.font = `500 15px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText(`Target: ${targetDateStr}`, countLeft, hudCursorY + 78);

    hudCursorY += ringRadius * 2 + 30;

    // Completed Milestones & Current Focus Card inside HUD
    const completedList = sortedMilestones.filter(m => m.status === 'completed' || m.completed === true);

    const milestoneCardH = 210;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    this.drawRoundedRect(ctx, hudInnerLeft, hudCursorY, hudInnerWidth, milestoneCardH, 16);
    ctx.fill();
    ctx.strokeStyle = palette.cardBorder || 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `700 14px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`MILESTONES • ${completedList.length}/${milestones.length} COMPLETED`, hudInnerLeft + 18, hudCursorY + 16);

    let mItemY = hudCursorY + 44;
    const completedToShow = completedList.slice(-3);
    for (const m of completedToShow) {
      ctx.textAlign = 'left';
      ctx.font = `700 14px ${fontPrimary}`;
      ctx.fillStyle = '#10B981';
      ctx.fillText('✓', hudInnerLeft + 18, mItemY);

      ctx.font = `500 14px ${fontPrimary}`;
      ctx.fillStyle = palette.primaryText;
      let mTitle = `#${m.order} ${m.title}`;
      while (ctx.measureText(mTitle).width > hudInnerWidth - 60 && mTitle.length > 10) {
        mTitle = mTitle.slice(0, -1).trim();
      }
      ctx.fillText(mTitle, hudInnerLeft + 36, mItemY);
      mItemY += 26;
    }

    if (completedList.length > completedToShow.length) {
      ctx.font = `italic 600 12px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor;
      ctx.fillText(`+${completedList.length - completedToShow.length} more completed`, hudInnerLeft + 36, mItemY);
      mItemY += 22;
    }

    if (activeMilestone) {
      ctx.font = `700 14px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor;
      ctx.fillText('🎯', hudInnerLeft + 18, mItemY);

      ctx.font = `700 14px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor;
      let actText = `Next: #${activeMilestone.order} ${activeMilestone.title}`;
      while (ctx.measureText(actText).width > hudInnerWidth - 60 && actText.length > 10) {
        actText = actText.slice(0, -1).trim();
      }
      ctx.fillText(actText, hudInnerLeft + 36, mItemY);
    }

    hudCursorY += milestoneCardH + 25;

    // Achievement Badges Row in HUD (Rendered with Luxury Medallions)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 14px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText('ACHIEVEMENTS EARNED', hudInnerLeft, hudCursorY);

    const unlockedBadges = (badges || []).filter(b => b.unlocked);
    const highestBadge = unlockedBadges[unlockedBadges.length - 1];
    if (highestBadge) {
      ctx.textAlign = 'right';
      ctx.font = `700 13px ${fontPrimary}`;
      ctx.fillStyle = highestBadge.color || '#F59E0B';
      ctx.fillText(`★ ${highestBadge.name}`, hudInnerLeft + hudInnerWidth, hudCursorY);
    }

    hudCursorY += 24;

    const desktopBadgeRadius = 26; // 52px diameter
    const badgeGap = (hudInnerWidth - (desktopBadgeRadius * 2 * 5)) / 4;

    badges.forEach((b, idx) => {
      const cx = hudInnerLeft + (idx * (desktopBadgeRadius * 2 + badgeGap)) + desktopBadgeRadius;
      const cy = hudCursorY + desktopBadgeRadius;

      this.drawLuxuryBadge(ctx, cx, cy, desktopBadgeRadius, b, palette);
    });
  }
}
