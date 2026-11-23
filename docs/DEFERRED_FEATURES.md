# Horizon — Deferred Features & Post-Contest Backlog (v2+)

**Document Version:** 1.0.0  
**Status:** Deferred / Post-Contest Roadmap  
**Scope Context:** Features intentionally separated from the Contest MVP to ensure a lean, zero-risk, high-impact submission.

---

## 1. Executive Summary

To guarantee delivery of an exceptional, battle-tested product within our available contest timeframe, non-essential infrastructure and speculative enhancements have been deferred. This document catalogs all post-MVP initiatives, their strategic value, architectural prerequisites, and target post-contest release horizons.

---

## 2. Deferred Architectural & Infrastructure Features

### 2.1 Cloud Synchronization & User Accounts (v2.0)
- **Feature Description:** Cloud database integration (Supabase / Firebase / PostgreSQL) with email/password, Google OAuth, and cross-device synchronization.
- **Why Deferred for Contest MVP:**
  - Introduces authentication friction (login/signup screens reduce conversion during contest judging).
  - Requires cloud hosting infrastructure, API key management, and privacy compliance (GDPR/CCPA).
  - **MVP Alternative:** 100% client-side `LocalStorage` with zero setup and instant availability.

### 2.2 Native Mobile OS Live Wallpaper Automation (v2.1)
- **Feature Description:** Background daemon / Android Live Wallpaper service / iOS Shortcut automation that automatically updates the phone lock screen daily without manual export.
- **Why Deferred for Contest MVP:**
  - Modern web browsers cannot alter OS system wallpapers directly due to mobile sandbox security restrictions.
  - Requires native Kotlin/Swift wrappers (Capacitor/React Native/Flutter) and app store distributions.
  - **MVP Alternative:** The core product concept explicitly specifies high-resolution static PNG exports ($1080 \times 1920$) that users set as lock-screen wallpaper.

### 2.3 Headless Browser Dynamic Scraping (v2.0)
- **Feature Description:** Running Puppeteer or Playwright server-side to bypass Cloudflare turnstiles and extract client-rendered SPA DOM trees from Udemy and Coursera.
- **Why Deferred for Contest MVP:**
  - Puppeteer requires significant server memory ($> 1\text{ GB}$ RAM) and exhibits high latency ($5\text{–}15\text{ seconds}$ per extraction).
  - High risk of Cloudflare IP bans during a live contest evaluation.
  - **MVP Alternative:** Fast Node.js OpenGraph/JSON-LD metadata extraction with an instant 1-click **Quick-Syllabus Text Parser** fallback that guarantees 100% demo success in $< 5$ seconds.

---

## 3. Deferred UX & Enhancement Features

### 3.1 Advanced Workspace JSON Backup & Restore Modal (v1.2)
- **Feature Description:** Full modal for exporting and importing multiple JSON workspace archives with deep schema validator tools.
- **Why Deferred for Contest MVP:** Single active goal with LocalStorage persistence covers all judging criteria; full multi-goal archival is secondary.

### 3.2 Generative AI Background Imagery (v2.2)
- **Feature Description:** Text-to-image prompts using DALL-E 3 or Midjourney API to generate bespoke wallpaper art.
- **Why Deferred for Contest MVP:**
  - AI generation introduces $8\text{–}20\text{ second}$ latency, API costs, and inconsistent visual layouts.
  - Handcrafted nature templates ensure deterministic, high-contrast, polished typographic safe zones.

### 3.3 Extended Procedural Template Shaders (Themes 5–8) (v1.1)
- **Feature Description:** Custom particle shaders and complex mathematical noise generators for the secondary 4 nature themes.
- **Why Deferred for Contest MVP:**
  - The Contest MVP delivers 4 diverse, handcrafted, high-impact core nature themes (1 Alpine Peak mountain, 1 Deep Pacific ocean, 1 Golden Horizon sunset, 1 Minimalist Stone zen theme) built on a shared configuration engine.
  - Additional variants are configuration extensions rather than architectural hurdles.

### 3.4 Social Sharing & Public Goal Cards (v2.0)
- **Feature Description:** Public read-only URLs to share active streaks, countdowns, and earned badges on Twitter/LinkedIn.
- **Why Deferred for Contest MVP:** Requires server-side storage and public routing; outside the scope of personal wallpaper generation.

---

## 4. Post-Contest Release Horizons

| Milestone | Target Horizon | Focus | Key Deliverables |
| :--- | :---: | :--- | :--- |
| **v1.1** | Post-Contest Sprint (Week 1) | Aesthetic Expansion | Unlock remaining 4 nature themes (Pine Mist, Highland Solitude, Azure Shore, Dusk Silhouette). |
| **v1.2** | Post-Contest Sprint (Week 2) | Data Portability | Multi-goal manager, JSON backup/restore modal, archive management. |
| **v2.0** | Next Major Release | Cloud & Social | Optional Supabase cloud sync, public goal share cards, social badges. |
| **v2.1** | Native Companion | Mobile Integration | Capacitor Android/iOS companion app for one-click OS wallpaper application. |
