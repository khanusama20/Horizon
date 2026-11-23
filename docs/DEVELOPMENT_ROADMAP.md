# Horizon — Deadline-Focused Contest MVP Roadmap

**Document Version:** 2.0.0 (Contest MVP Revision)  
**Status:** Ready for Execution  
**Execution Context:** 1 Full-Stack Developer + AI Coding Assistance  
**Target Delivery Window:** Contest Sprint (23.0 Focused Development Hours)  
**Deferred Features Reference:** Documented in [DEFERRED_FEATURES.md](file:///c:/Users/MS%20Infra%20Works/OneDrive/Documents/Projects/horizon/docs/DEFERRED_FEATURES.md)

---

## 1. Contest MVP Strategy: Maximum Impact, Zero Risk

In a contest evaluation or hackathon sprint, victory is determined by **a flawless, visually stunning end-to-end user journey**. Software that crashes during a live demo or encounters unexpected scraping blocks fails regardless of its feature volume.

### Core Contest Tenets
1. **Bulletproof Demo Safety:** Course scraping on modern platforms (Udemy/Cloudflare) is notoriously fragile. The Contest MVP pairs a lightweight metadata scraper with an instant, one-click **Quick-Syllabus Text Parser** fallback. If a URL is blocked or offline, the presenter pastes 5 lines of text and continues without missing a beat.
2. **Deterministic High-Fidelity Artifacts:** The exported PNG wallpapers ($1080 \times 1920$ Mobile, $1920 \times 1080$ Desktop) render through native HTML5 2D Canvas—guaranteeing razor-sharp typography, zero CORS canvas tainting, and exact safe-zone clearance for mobile lock screens.
3. **One-Click Contest Judge Demo Mode:** Includes a pre-configured sample goal (*"Complete LLM Engineering Course in 15 days"*) that populates the complete milestone schedule and badge showcase with a single click.

---

## 2. Recalculated Contest MVP Schedule & Hour Allocation

The roadmap is structured into **7 targeted execution blocks**, compressed from the original multi-week plan down to **23.0 high-leverage hours**:

```mermaid
gantt
    title Horizon Contest MVP Timeline (23.0 Hour Sprint)
    dateFormat X
    axisFormat Hour %d
    
    section Foundation
    Block 1: Scaffolding & Setup (2.5h)         :b1, 0, 2.5
    section Core Features
    Block 2: Goal Form & Course Ingestion (3.5h) :b2, 2.5, 6.0
    Block 3: Pacing & Gamification (3.5h)        :b3, 6.0, 9.5
    section Wallpaper Engine
    Block 4: Canvas Engine & 4 Themes (5.5h)     :b4, 9.5, 15.0
    Block 5: Mockup Preview & PNG Export (2.5h)  :b5, 15.0, 17.5
    section Polish & Verification
    Block 6: Contest Polish & Demo Mode (3.0h)   :b6, 17.5, 20.5
    Block 7: Focused MVP Testing (2.5h)          :b7, 20.5, 23.0
```

---

## 3. Detailed Execution Blocks

### Block 1: Scaffolding, Architecture & Local Storage (2.5 Hours)
- **Objective:** Establish a clean, responsive dev environment with zero build friction.
- **Tasks:**
  1. Initialize Vite project with Vue 3.5 (`<script setup>`) and Vuetify 3.
  2. Set up lightweight Express/Node.js proxy inside `server/` with Vite dev proxy forwarding `/api` $\rightarrow$ `http://localhost:3001`.
  3. Create responsive application shell (Header, 2-column Desktop / Tabbed Mobile layout).
  4. Implement `useStorage.js` composable for automatic `LocalStorage` synchronization with namespaced key `horizon_v1_goal`.
- **Deliverable:** Bootable app shell with hot module replacement and reactive persistence.
- **Estimated Time:** **2.5 Hours**

---

### Block 2: Goal Creation & Bulletproof Course Ingestion (3.5 Hours)
- **Objective:** Enable users to define goals and import course curriculums effortlessly.
- **Tasks:**
  1. Build `GoalForm.vue`: Title, Description, Deadline Picker (Days or Target Date), Category selector.
  2. Build Node.js proxy endpoint `POST /api/course-info/extract`:
     - Fetches OpenGraph tags (`og:title`, `og:description`) and JSON-LD schema.
     - 3-second timeout returning structured HTTP 422 if blocked.
  3. Build `QuickSyllabusModal.vue` (The Contest Demo Life-Saver):
     - Instant modal allowing user to paste any course outline.
     - Heuristic regex parser instantly extracting section titles from Roman numerals, numbered lists (`1.`, `Module 1:`), or bullet points.
  4. Add 1-click **"Load Sample LLM Course"** quick-fill button for instantaneous demo setup.
- **Deliverable:** Working goal creator that handles both automated URL imports and instant manual syllabus pastes with zero dead ends.
- **Estimated Time:** **3.5 Hours**

---

### Block 3: Milestone Pacing & Gamification Engine (3.5 Hours)
- **Objective:** Transform raw sections and target days into an intelligent, gamified schedule.
- **Tasks:**
  1. Implement `generateMilestonePlan(sections, totalDays)` algorithm:
     - Uniform allocation ($N \le D$).
     - Multi-section bundling ($N > D$).
     - Buffer/Review day allocation for timelines $\ge 14\text{ days}$.
     - Automatic detection of quizzes and exams.
  2. Build `MilestoneList.vue`:
     - Interactive milestone checklist cards with target day badges.
     - Real-time progress bar recalculating on toggle.
     - Inline edit and reorder capabilities.
  3. Implement `badgeEngine.js`:
     - 5 nature achievement badges (`FIRST_STEP`, `EXPLORER`, `HALFWAY_HERO`, `CONSISTENCY`, `ACHIEVER`).
     - Pure evaluation function calculating unlocked states from milestone completion.
     - Progress-synchronized motivational quote generator (`useMotivationQuote.js`).
- **Deliverable:** Fully reactive milestone planner that triggers authentic badge unlocks and updates motivational text.
- **Estimated Time:** **3.5 Hours**

---

### Block 4: HTML5 2D Canvas Engine & 4 Core Nature Themes (5.5 Hours)
- **Objective:** Build the offscreen high-resolution wallpaper drawing pipeline with 4 breathtaking nature aesthetics.
- **Tasks:**
  1. Build `CanvasWallpaperEngine.js`:
     - Offscreen canvas with exact dimensions ($1080 \times 1920$ Mobile, $1920 \times 1080$ Desktop).
     - Explicit font pre-loader (`await document.fonts.ready`).
     - Reusable drawing primitives: radial/linear gradient meshes, curved progress rings, typographic cards.
  2. Implement the 4 Core Contest Nature Themes:
     - **Alpine Peak:** Deep emerald forest gradient with layered mountain silhouette geometry.
     - **Deep Pacific:** Midnight navy to cyan ocean gradient with light caustics.
     - **Golden Horizon:** Warm amber, peach, and violet sunrise gradient with sun orb.
     - **Minimalist Stone:** Smooth charcoal and slate zen river stone curves.
  3. Dynamic Canvas Layout Placement:
     - Safe-zone enforcement (Top $280\text{ px}$, Bottom $200\text{ px}$ strictly clean).
     - Multi-line wrapped Goal Title and Category pill.
     - Large Countdown numeral (*"12 DAYS REMAINING"*).
     - Circular progress meter with exact percentage.
     - Active Milestone & Upcoming Milestone preview cards.
     - Unlocked nature badge icon row.
     - Contextual motivational quote.
- **Deliverable:** High-performance 2D canvas engine rendering all 4 themes without font flash or visual defects.
- **Estimated Time:** **5.5 Hours**

---

### Block 5: Interactive Device Preview & PNG Export (2.5 Hours)
- **Objective:** Provide a real-time lock-screen preview and one-click static PNG download.
- **Tasks:**
  1. Build `WallpaperPreview.vue`:
     - Interactive smartphone mockup displaying the live rendered canvas.
     - Toggle switch: *"Show Phone Safe Zones"* (overlays iOS/Android clock, battery, and home bar).
     - Toggle switch: Mobile ($1080 \times 1920$) vs. Desktop ($1920 \times 1080$) view.
  2. Build `ExportPipeline.js`:
     - Calls `canvas.toBlob('image/png', 1.0)`.
     - Creates object URL and triggers instant download (`horizon-goal-[title].png`).
- **Deliverable:** Pixel-perfect preview and instantaneous static PNG export pipeline.
- **Estimated Time:** **2.5 Hours**

---

### Block 6: Contest Polish & Demo Presentation Mode (3.0 Hours)
- **Objective:** Elevate visual polish and guarantee a contest-winning presentation.
- **Tasks:**
  1. Add celebratory visual feedback when completing milestones (subtle banner/sparkle animation when achieving 100%).
  2. Implement responsive layout: 2-column on desktop (Planner on left, Phone Preview sticky on right); tabbed on mobile.
  3. Add dark-mode nature palette styling across all Vuetify UI cards and buttons.
  4. Ensure zero console warnings or layout shifts.
- **Deliverable:** Visually cohesive, premium-feeling application ready for judging.
- **Estimated Time:** **3.0 Hours**

---

### Block 7: Focused MVP Quality Verification (2.5 Hours)
- **Objective:** Run targeted unit and visual regression tests covering core MVP criteria.
- **Tasks:**
  1. Run Vitest suite:
     - Pacing algorithm allocation test cases ($N < D$, $N > D$, $N = D$).
     - Badge evaluation state machine tests (0%, 25%, 50%, 100%).
     - Fallback syllabus regex parser tests.
  2. Visual regression assertion: Verify exported PNG is strictly $1080 \times 1920$ with zero safe-zone overlap.
  3. Offline validation: Disconnect network and verify wallpaper preview and export function 100% locally.
- **Deliverable:** Verified, zero-defect release ready for submission.
- **Estimated Time:** **2.5 Hours**

---

## 4. Recalculated Effort Summary: Available Time vs. Budget

| Block | Phase Name | Original Estimate | **Contest MVP Revised** | Efficiency Strategy |
| :---: | :--- | :---: | :---: | :--- |
| **B1** | Scaffolding & Setup | 5.0 h | **2.5 h** | Use Vite + Vuetify pre-configured templates; minimal boilerplate. |
| **B2** | Goal Form & Course Ingestion | 8.0 h | **3.5 h** | Fast OpenGraph extractor + robust regex fallback modal. |
| **B3** | Milestone Pacing & Badges | 11.0 h | **3.5 h** | Pure functional algorithms; reactive computed badges. |
| **B4** | 2D Canvas Engine & Themes | 12.0 h | **5.5 h** | Focus on 4 primary nature archetypes with declarative configs. |
| **B5** | Device Mockup & PNG Export | 6.0 h | **2.5 h** | Reusable SVG device frame + standard `toBlob()` pipeline. |
| **B6** | Contest Polish & Demo Mode | 6.0 h | **3.0 h** | 1-click sample demo pre-fill; high-contrast nature UI. |
| **B7** | Focused MVP Verification | 6.0 h | **2.5 h** | Targeted Vitest test suite on algorithms and safe zones. |
| **TOTAL** | **Full Sprint Execution** | **54.0 h** | **23.0 Hours** | **~57% reduction in delivery time, 100% demo-ready** |

---

## 5. Technical Risk Management for Contest Demos

1. **Risk: External URL Fails During Demo**  
   *Mitigation:* The 1-click **"Load Sample LLM Course"** button instantly loads a pre-verified 15-day syllabus. Even without internet, the entire demo flows smoothly.
2. **Risk: Canvas Export Freezes Browser**  
   *Mitigation:* Rendering takes place synchronously on an offscreen canvas in $< 80\text{ ms}$; PNG blob conversion takes $< 150\text{ ms}$.
3. **Risk: Mobile Safe-Zone Discrepancy**  
   *Mitigation:* Top $280\text{ px}$ and bottom $200\text{ px}$ are strictly cleared of text and essential indicators across all mobile templates.
