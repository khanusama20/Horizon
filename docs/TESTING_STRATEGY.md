# Horizon — Contest MVP Testing Strategy & Quality Assurance Plan

**Document Version:** 2.0.0 (MVP Focused)  
**Status:** Approved for Implementation  
**Test Scope:** Essential Contest MVP Deliverables  
**Test Runner:** Vitest (Unit / Algorithm / Layout Assertions)

---

## 1. Testing Philosophy for the Contest MVP

In a deadline-driven contest context, testing must focus ruthlessly on **high-risk, high-visibility core functionalities**:
1. Mathematical accuracy of milestone schedules (preventing scheduling bugs).
2. Badge unlocking logic (preventing gamification defects).
3. Fallback syllabus regex parsing (preventing demo ingest crashes).
4. Wallpaper Canvas export geometry and safe-zone compliance (ensuring the final PNG is flawless).

Non-essential suites (e.g., cross-browser multi-device matrices, legacy schema migrations) have been deferred to post-contest horizons to keep execution fast and focused.

---

## 2. Core MVP Test Suites & Test Cases

### 2.1 Suite 1: Milestone Planning & Pacing Algorithm
*Target File:* `tests/unit/milestonePlanner.spec.js`

| ID | Test Scenario | Input Data | Expected Output / Assertion |
| :--- | :--- | :--- | :--- |
| **MVP-MP-01** | Standard 1:1 Distribution ($N = D$) | 10 sections, 10 days | Exactly 10 milestones created, each allocated to Day 1..10. |
| **MVP-MP-02** | Sections fewer than days ($N < D$) | 5 sections, 15 days | 5 milestones spaced evenly across 15 days. |
| **MVP-MP-03** | Sections greater than days ($N > D$) | 15 sections, 5 days | Sections bundled evenly ($\approx 3$ sections per day/milestone). No sections lost. |
| **MVP-MP-04** | Buffer day allocation | 8 sections, 15 days | Last 1–2 days assigned as "Final Review & Knowledge Synthesis". |
| **MVP-MP-05** | Assessment auto-detection | Titles with "Quiz", "Test", "Exam" | `milestone.isQuiz === true`. |
| **MVP-MP-06** | Zero/Negative days guard | Duration $\le 0$ days | Throws descriptive validation error; does not loop infinitely. |

---

### 2.2 Suite 2: Gamified Badges & Motivation State Machine
*Target File:* `tests/unit/badgeEngine.spec.js`

| ID | Test Scenario | Progress State | Expected Assertion |
| :--- | :--- | :--- | :--- |
| **MVP-BG-01** | Zero progress state | 0 of 8 completed ($0\%$) | All 5 badges locked (`unlocked === false`). Quote: "The journey of a thousand miles..." |
| **MVP-BG-02** | First Step unlock | 1 of 8 completed ($12.5\%$) | `FIRST_STEP.unlocked === true`; others locked. |
| **MVP-BG-03** | Learning Explorer unlock | 2 of 8 completed ($25\%$) | `EXPLORER.unlocked === true`. |
| **MVP-BG-04** | Halfway Hero unlock | 4 of 8 completed ($50\%$) | `HALFWAY_HERO.unlocked === true`. Quote: "Halfway there!..." |
| **MVP-BG-05** | Goal Achiever (100%) | 8 of 8 completed ($100\%$) | All 5 badges `unlocked === true`. Quote: "Goal Achieved! Congratulations!" |
| **MVP-BG-06** | Reactive Reversal | Unchecking milestone 1 | Progress reverts to 0%; badges re-lock reactively without page reload. |

---

### 2.3 Suite 3: Fallback Syllabus Text Parser
*Target File:* `tests/unit/syllabusParser.spec.js`

| ID | Test Scenario | Raw Input Text | Expected Output |
| :--- | :--- | :--- | :--- |
| **MVP-SP-01** | Numbered outline | `"1. Intro to AI\n2. Neural Nets\n3. Transformers"` | Array of 3 clean strings: `["Intro to AI", "Neural Nets", "Transformers"]`. |
| **MVP-SP-02** | Markdown bulleted list | `"- Module A: RAG\n* Module B: Agents\n- Module C: Fine-tuning"` | Array of 3 clean strings without markdown symbols. |
| **MVP-SP-03** | Roman numerals & timestamps | `"Section I: Basics (30 min)\nSection II: Models (1 hr)"` | Strips Roman numerals and durations, yielding `["Basics", "Models"]`. |
| **MVP-SP-04** | Empty or whitespace input | `""` or `"   \n  \n"` | Returns empty array without runtime exceptions. |

---

### 2.4 Suite 4: Canvas Layout Geometry & PNG Export Pipeline
*Target File:* `tests/unit/canvasGeometry.spec.js`

| ID | Test Scenario | Acceptance Criteria |
| :--- | :--- | :--- |
| **MVP-CG-01** | Mobile Target Resolution | Rendered canvas width is strictly $1080\text{ px}$ and height is strictly $1920\text{ px}$. |
| **MVP-CG-02** | Desktop Target Resolution | Rendered canvas width is strictly $1920\text{ px}$ and height is strictly $1080\text{ px}$. |
| **MVP-CG-03** | Mobile Safe-Zone Clearance | Zero typography rendered in Top $0\text{–}280\text{ px}$ or Bottom $1720\text{–}1920\text{ px}$. |
| **MVP-CG-04** | Long Title Truncation | Title with 80+ characters wraps cleanly onto 2 lines maximum with ellipsis (`...`). |
| **MVP-CG-05** | PNG Blob Generation | `canvas.toBlob('image/png')` returns a non-empty `Blob` with MIME type `image/png`. |

---

### 2.5 Suite 5: LocalStorage Persistence
*Target File:* `tests/unit/storage.spec.js`

| ID | Test Scenario | Expected Assertion |
| :--- | :--- | :--- |
| **MVP-LS-01** | State Auto-save | Mutating goal title or toggling milestone updates `localStorage['horizon_v1_goal']`. |
| **MVP-LS-02** | State Hydration | Re-initializing store from existing LocalStorage preserves all completed milestones and active template. |

---

## 3. Fast Automated Test Execution

To be executed during Block 7 of development:

```bash
# Run all MVP unit and algorithm tests
npm run test:unit

# Run tests in watch mode during development
npm run test:watch
```

---

## 4. Contest MVP Acceptance Checklist

Before declaring the Contest MVP complete, verify:
- [ ] Clicking **"Load Sample LLM Course"** loads a full 15-day course plan in $< 1\text{ second}$.
- [ ] Toggling milestone checkboxes immediately recalculates the progress percentage and unlocks badges.
- [ ] Pasting bulleted text into the Quick-Syllabus modal generates clean milestones without manual re-typing.
- [ ] Switching between the 4 nature themes updates the live phone mockup instantly.
- [ ] Clicking **"Export Wallpaper (PNG)"** initiates an immediate file download of a crisp $1080 \times 1920\text{ px}$ image.
- [ ] The exported wallpaper leaves the top $280\text{ px}$ clear for the phone's lock-screen clock.
