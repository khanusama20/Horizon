/**
 * Horizon Canvas Wallpaper Engine
 * High-resolution 2D Canvas rendering engine for static nature-inspired wallpapers.
 * Supports exact mobile (1080x1920) and desktop (1920x1080) dimensions,
 * lock-screen safe-zone bounding, font preloading, and dynamic milestone HUD layout.
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
    topReserved: 280, // OS Clock, Status Bar, Dynamic Island
    bottomReserved: 200, // Flashlight, Camera buttons, Home bar
    sideMargin: 80,
    contentTop: 280,
    contentBottom: 1720,
    contentHeight: 1440
  },
  DESKTOP: {
    topReserved: 80, // Menu bar
    bottomReserved: 80, // OS Taskbar / Dock
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
   * Helper to draw rounded rectangles
   */
  static drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
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
      const endAngle = startAngle + (Math.PI * 2 * (Math.min(100, progressPct) / 100));
      ctx.strokeStyle = fillColor;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.stroke();
      ctx.lineCap = 'butt'; // reset
    }
  }

  /**
   * Helper to draw safe-zone debug overlay guidelines
   */
  static drawSafeZoneDebug(ctx, width, height, safeZone) {
    ctx.save();
    // Top reserved area
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)'; // Red translucent
    ctx.fillRect(0, 0, width, safeZone.topReserved);

    // Bottom reserved area
    ctx.fillRect(0, height - safeZone.bottomReserved, width, safeZone.bottomReserved);

    // Guidelines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);

    ctx.beginPath();
    ctx.moveTo(0, safeZone.topReserved);
    ctx.lineTo(width, safeZone.topReserved);
    ctx.moveTo(0, height - safeZone.bottomReserved);
    ctx.lineTo(width, height - safeZone.bottomReserved);
    ctx.stroke();

    // Labels
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#EF4444';
    ctx.fillText(`TOP SAFE ZONE (0 - ${safeZone.topReserved}px) [OS Clock / Widgets]`, 40, safeZone.topReserved - 20);
    ctx.fillText(`BOTTOM SAFE ZONE (${height - safeZone.bottomReserved}px - ${height}px) [Controls]`, 40, height - safeZone.bottomReserved + 40);
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
      const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);
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
   * Renders a user-uploaded custom photo background with high-quality cover scaling
   * and a dark atmospheric scrim so all goal overlays, milestones, countdown, and luxury badges remain 100% legible.
   */
  static async drawCustomImageBackground(ctx, width, height, imageUrl, fallbackTheme) {
    try {
      const img = await this.loadImage(imageUrl);
      const hRatio = width / img.width;
      const vRatio = height / img.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (width - img.width * ratio) / 2;
      const centerShiftY = (height - img.height * ratio) / 2;
      ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

      // Atmospheric luxury scrim to guarantee text, countdown, and badge contrast
      const scrim = ctx.createLinearGradient(0, 0, 0, height);
      scrim.addColorStop(0, 'rgba(11, 15, 25, 0.65)');
      scrim.addColorStop(0.35, 'rgba(11, 15, 25, 0.40)');
      scrim.addColorStop(0.70, 'rgba(11, 15, 25, 0.55)');
      scrim.addColorStop(1, 'rgba(11, 15, 25, 0.85)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, width, height);
    } catch {
      if (fallbackTheme) {
        fallbackTheme.drawBackground(ctx, width, height);
      }
    }
  }

  /**
   * Renders a user-selected custom color background with subtle vignette depth
   */
  static drawColorBackground(ctx, width, height, color) {
    ctx.fillStyle = color;
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
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  /**
   * Layout Renderer: Mobile Lock-Screen (1080x1920)
   */
  static renderMobileLayout(ctx, width, height, safeZone, data) {
    const { goal, palette, daysRemaining, progressPct, activeMilestone, upcomingMilestone, badges, motivation } = data;
    const fontPrimary = "'Roboto', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

    const contentLeft = safeZone.sideMargin;
    const contentWidth = width - (safeZone.sideMargin * 2);

    // --- Block 1: Goal Category & Title (y ≈ 330px) ---
    let cursorY = safeZone.contentTop + 50;

    // Category Pill
    const category = (goal?.category || 'Learning').toUpperCase();
    ctx.font = `700 22px ${fontPrimary}`;
    const catMetrics = ctx.measureText(category);
    const pillW = catMetrics.width + 36;
    const pillH = 38;

    ctx.fillStyle = palette.cardBackground;
    this.drawRoundedRect(ctx, contentLeft, cursorY, pillW, pillH, 19);
    ctx.fill();
    ctx.strokeStyle = palette.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = palette.accentColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(category, contentLeft + 18, cursorY + (pillH / 2));

    cursorY += pillH + 24;

    // Goal Title (Prominent Bold Hierarchy, Max 2 lines wrapped)
    ctx.font = `800 48px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const goalTitle = goal?.title || 'Achievement Countdown Goal';
    cursorY = this.wrapText(ctx, goalTitle, contentLeft, cursorY, contentWidth, 58, 2);

    cursorY += 20;

    // --- Block 2: Countdown & Progress Hero Card (y ≈ 540px) ---
    const heroCardH = 260;
    ctx.fillStyle = palette.cardBackground;
    this.drawRoundedRect(ctx, contentLeft, cursorY, contentWidth, heroCardH, 24);
    ctx.fill();
    ctx.strokeStyle = palette.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Circular Progress Arc (Left Column in Hero Card)
    const ringRadius = 82;
    const ringCx = contentLeft + 120;
    const ringCy = cursorY + (heroCardH / 2);

    this.drawProgressRing(ctx, ringCx, ringCy, ringRadius, 16, progressPct, palette.progressFill, palette.progressTrack);

    // Center Percentage inside Progress Ring
    ctx.font = `800 42px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${progressPct}%`, ringCx, ringCy - 6);

    ctx.font = `700 16px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText('COMPLETED', ringCx, ringCy + 28);

    // Countdown Callout (Right Column in Hero Card)
    const countLeft = ringCx + ringRadius + 45;
    const countTop = cursorY + 48;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `800 76px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.fillText(String(daysRemaining), countLeft, countTop);

    ctx.font = `800 22px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor;
    ctx.fillText('DAYS REMAINING', countLeft, countTop + 84);

    ctx.font = `600 18px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    const targetLabel = goal?.targetDate
      ? new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : `In ${daysRemaining} days`;
    ctx.fillText(`Deadline: ${targetLabel}`, countLeft, countTop + 118);

    cursorY += heroCardH + 30;

    // --- Block 3: Milestone HUD Cards (Current Focus & Next) ---
    if (activeMilestone) {
      const activeCardH = 145;
      ctx.fillStyle = palette.cardBackground;
      this.drawRoundedRect(ctx, contentLeft, cursorY, contentWidth, activeCardH, 20);
      ctx.fill();
      ctx.strokeStyle = palette.accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Card Header Tag
      ctx.font = `700 16px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`CURRENT FOCUS • MILESTONE #${activeMilestone.order}`, contentLeft + 24, cursorY + 20);

      // Milestone Title
      ctx.font = `700 26px ${fontPrimary}`;
      ctx.fillStyle = palette.primaryText;
      this.wrapText(ctx, activeMilestone.title, contentLeft + 24, cursorY + 48, contentWidth - 48, 34, 1);

      // Target Day / Due
      ctx.font = `500 18px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      const dueText = activeMilestone.dueDate
        ? `Day ${activeMilestone.targetDay} • Target: ${new Date(activeMilestone.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : `Scheduled for Day ${activeMilestone.targetDay}`;
      ctx.fillText(dueText, contentLeft + 24, cursorY + 95);

      cursorY += activeCardH + 16;
    }

    if (upcomingMilestone) {
      const nextCardH = 90;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      this.drawRoundedRect(ctx, contentLeft, cursorY, contentWidth, nextCardH, 16);
      ctx.fill();
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = `700 15px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`UPCOMING • MILESTONE #${upcomingMilestone.order}`, contentLeft + 20, cursorY + 16);

      ctx.font = `600 20px ${fontPrimary}`;
      ctx.fillStyle = palette.primaryText;
      this.wrapText(ctx, upcomingMilestone.title, contentLeft + 20, cursorY + 42, contentWidth - 40, 26, 1);

      cursorY += nextCardH + 30;
    }

    // --- Block 4: Achievement Badges Strip (y ≈ 1280px) ---
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 18px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText('ACHIEVEMENT BADGES', contentLeft, cursorY);
    cursorY += 30;

    const badgeSize = 72;
    const badgeGap = (contentWidth - (badgeSize * 5)) / 4;

    badges.forEach((b, idx) => {
      const bx = contentLeft + (idx * (badgeSize + badgeGap));
      const by = cursorY;

      // Circle Base
      ctx.beginPath();
      ctx.arc(bx + (badgeSize / 2), by + (badgeSize / 2), badgeSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = b.unlocked ? b.color : 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = b.unlocked ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = b.unlocked ? 2.5 : 1;
      ctx.stroke();

      // Inner Symbol / Number
      ctx.font = `800 22px ${fontPrimary}`;
      ctx.fillStyle = b.unlocked ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = b.key === 'FIRST_STEP' ? '1' : (b.key === 'ACHIEVER' ? '★' : `${b.thresholdPct}%`);
      ctx.fillText(label, bx + (badgeSize / 2), by + (badgeSize / 2));

      // Small Badge Name Label below
      ctx.font = `600 13px ${fontPrimary}`;
      ctx.fillStyle = b.unlocked ? palette.primaryText : 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(b.name, bx + (badgeSize / 2), by + badgeSize + 16);
    });

    cursorY += badgeSize + 45;

    // --- Block 5: Motivational Quote (Safe Above Bottom Reserve, y ≈ 1520px) ---
    if (cursorY < safeZone.contentBottom - 60) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `italic 500 21px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      const quoteStr = `"${motivation.quote}"`;
      this.wrapText(ctx, quoteStr, width / 2, cursorY + 10, contentWidth, 30, 2);
    }
  }

  /**
   * Layout Renderer: Desktop Display (1920x1080)
   */
  static renderDesktopLayout(ctx, width, height, safeZone, data) {
    const { goal, palette, daysRemaining, progressPct, activeMilestone, upcomingMilestone, badges, motivation } = data;
    const fontPrimary = "'Roboto', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

    // Desktop Asymmetric Split:
    // Left 55% (Art Scenic Focus & Quote)
    // Right 45% (Information HUD Card)

    const hudLeft = width * 0.54;
    const hudWidth = width * 0.40;
    const hudTop = safeZone.contentTop + 40;
    const hudHeight = height - safeZone.topReserved - safeZone.bottomReserved - 80;

    // --- Left Panoramic Area: Branding & Motivational Headline ---
    const brandLeft = safeZone.sideMargin;
    let leftCursorY = safeZone.contentTop + 80;

    // Category Pill
    const category = (goal?.category || 'Learning').toUpperCase();
    ctx.font = `700 20px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`HORIZON GOAL • ${category}`, brandLeft, leftCursorY);
    leftCursorY += 36;

    // Goal Title (Bold Headline)
    ctx.font = `800 64px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    const goalTitle = goal?.title || 'Achievement Countdown Goal';
    leftCursorY = this.wrapText(ctx, goalTitle, brandLeft, leftCursorY, width * 0.46, 76, 2);

    leftCursorY += 30;

    // Motivational Quote on Landscape
    ctx.font = `italic 500 26px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    this.wrapText(ctx, `"${motivation.quote}"`, brandLeft, leftCursorY, width * 0.44, 38, 2);

    // --- Right Glass HUD Container Card ---
    ctx.fillStyle = palette.cardBackground;
    this.drawRoundedRect(ctx, hudLeft, hudTop, hudWidth, hudHeight, 28);
    ctx.fill();
    ctx.strokeStyle = palette.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    let hudCursorY = hudTop + 40;
    const hudInnerLeft = hudLeft + 45;
    const hudInnerWidth = hudWidth - 90;

    // Countdown & Progress Ring Row
    const ringRadius = 65;
    const ringCx = hudInnerLeft + ringRadius;
    const ringCy = hudCursorY + ringRadius;

    this.drawProgressRing(ctx, ringCx, ringCy, ringRadius, 14, progressPct, palette.progressFill, palette.progressTrack);

    ctx.font = `800 36px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${progressPct}%`, ringCx, ringCy - 4);

    ctx.font = `700 14px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText('PROGRESS', ringCx, ringCy + 24);

    // Days Countdown Callout (Right of Ring)
    const countLeft = ringCx + ringRadius + 40;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `800 64px ${fontPrimary}`;
    ctx.fillStyle = palette.primaryText;
    ctx.fillText(String(daysRemaining), countLeft, hudCursorY);

    ctx.font = `800 18px ${fontPrimary}`;
    ctx.fillStyle = palette.accentColor;
    ctx.fillText('DAYS REMAINING', countLeft, hudCursorY + 68);

    ctx.font = `500 16px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    const targetLabel = goal?.targetDate
      ? new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : `Target: ${daysRemaining} days`;
    ctx.fillText(targetLabel, countLeft, hudCursorY + 96);

    hudCursorY += ringRadius * 2 + 40;

    // Active Milestone Card
    if (activeMilestone) {
      const activeCardH = 115;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      this.drawRoundedRect(ctx, hudInnerLeft, hudCursorY, hudInnerWidth, activeCardH, 16);
      ctx.fill();
      ctx.strokeStyle = palette.accentColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `700 14px ${fontPrimary}`;
      ctx.fillStyle = palette.accentColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`CURRENT FOCUS • MILESTONE #${activeMilestone.order}`, hudInnerLeft + 20, hudCursorY + 16);

      ctx.font = `700 22px ${fontPrimary}`;
      ctx.fillStyle = palette.primaryText;
      this.wrapText(ctx, activeMilestone.title, hudInnerLeft + 20, hudCursorY + 40, hudInnerWidth - 40, 28, 1);

      ctx.font = `500 15px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      const dueText = activeMilestone.dueDate
        ? `Day ${activeMilestone.targetDay} • ${new Date(activeMilestone.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : `Day ${activeMilestone.targetDay}`;
      ctx.fillText(dueText, hudInnerLeft + 20, hudCursorY + 75);

      hudCursorY += activeCardH + 16;
    }

    if (upcomingMilestone) {
      const nextCardH = 75;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      this.drawRoundedRect(ctx, hudInnerLeft, hudCursorY, hudInnerWidth, nextCardH, 14);
      ctx.fill();
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = `700 13px ${fontPrimary}`;
      ctx.fillStyle = palette.secondaryText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`UPCOMING • #${upcomingMilestone.order}`, hudInnerLeft + 18, hudCursorY + 12);

      ctx.font = `600 18px ${fontPrimary}`;
      ctx.fillStyle = palette.primaryText;
      this.wrapText(ctx, upcomingMilestone.title, hudInnerLeft + 18, hudCursorY + 34, hudInnerWidth - 36, 24, 1);

      hudCursorY += nextCardH + 30;
    }

    // Achievement Badges Row
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 15px ${fontPrimary}`;
    ctx.fillStyle = palette.secondaryText;
    ctx.fillText('ACHIEVEMENTS EARNED', hudInnerLeft, hudCursorY);
    hudCursorY += 26;

    const badgeSize = 58;
    const badgeGap = (hudInnerWidth - (badgeSize * 5)) / 4;

    badges.forEach((b, idx) => {
      const bx = hudInnerLeft + (idx * (badgeSize + badgeGap));
      const by = hudCursorY;

      ctx.beginPath();
      ctx.arc(bx + (badgeSize / 2), by + (badgeSize / 2), badgeSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = b.unlocked ? b.color : 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = b.unlocked ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = b.unlocked ? 2 : 1;
      ctx.stroke();

      ctx.font = `800 18px ${fontPrimary}`;
      ctx.fillStyle = b.unlocked ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = b.key === 'FIRST_STEP' ? '1' : (b.key === 'ACHIEVER' ? '★' : `${b.thresholdPct}%`);
      ctx.fillText(label, bx + (badgeSize / 2), by + (badgeSize / 2));
    });
  }
}
