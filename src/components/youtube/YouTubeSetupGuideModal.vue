<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="youtube-guide-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="YouTube API Setup Guide"
      @click.self="$emit('update:modelValue', false)"
    >
      <div class="youtube-guide-card rounded-xl overflow-hidden border shadow-lg" role="document">
        <!-- Modal Header -->
        <div class="guide-header pa-4 pa-sm-5 border-b d-flex align-center justify-space-between gap-3">
          <div class="d-flex align-center gap-3 min-w-0">
            <div class="youtube-guide-avatar d-flex align-center justify-center rounded-lg flex-shrink-0">
              <i class="mdi mdi-youtube text-red-darken-1" style="font-size: 26px;"></i>
            </div>
            <div class="min-w-0">
              <div class="d-flex align-center gap-2 mb-0.5 flex-wrap">
                <h3 class="text-h6 font-weight-bold text-primary-text mb-0 line-height-tight">
                  YouTube API Setup Guide
                </h3>
                <span class="guide-tag font-weight-bold text-caption">Google Cloud Setup</span>
              </div>
              <p class="text-caption text-medium-emphasis mb-0 line-height-tight">
                Step-by-step instructions to create your free API key and enable playlist imports
              </p>
            </div>
          </div>

          <button
            type="button"
            class="guide-close-btn d-flex align-center justify-center rounded-circle flex-shrink-0"
            aria-label="Close setup guide"
            title="Close guide"
            @click="$emit('update:modelValue', false)"
          >
            <i class="mdi mdi-close" style="font-size: 20px;"></i>
          </button>
        </div>

        <!-- Scrollable Guide Body -->
        <div class="guide-content-scroll pa-4 pa-sm-5">
          <!-- Live Status Alert Card -->
          <div
            v-if="apiKeyConfigured"
            class="status-banner status-banner--success d-flex align-center justify-space-between gap-3 pa-3 rounded-lg mb-4"
            role="status"
          >
            <div class="d-flex align-center gap-2 min-w-0">
              <i class="mdi mdi-check-decagram text-success" style="font-size: 22px;"></i>
              <div class="min-w-0">
                <span class="text-subtitle-2 font-weight-bold text-success d-block line-height-tight">
                  API Key Configured & Active
                </span>
                <span class="text-caption text-medium-emphasis">
                  YouTube playlist importing is ready to use in Horizon.
                </span>
              </div>
            </div>
            <button
              type="button"
              class="refresh-status-btn text-caption font-weight-medium"
              :disabled="isCheckingStatus"
              @click="handleRefreshStatus"
            >
              <i class="mdi mdi-refresh me-1" :class="{ 'spin-animation': isCheckingStatus }"></i>
              Re-check
            </button>
          </div>

          <div
            v-else-if="!isServerOnline"
            class="status-banner status-banner--warning d-flex align-center justify-space-between gap-3 pa-3 rounded-lg mb-4"
            role="status"
          >
            <div class="d-flex align-center gap-2 min-w-0">
              <i class="mdi mdi-server-network-off text-warning" style="font-size: 22px;"></i>
              <div class="min-w-0">
                <span class="text-subtitle-2 font-weight-bold text-warning d-block line-height-tight">
                  Backend Server Standby
                </span>
                <span class="text-caption text-medium-emphasis">
                  Start your backend server via <code class="font-mono">npm run server:local</code> or <code class="font-mono">npm run server:ip</code> to detect your key.
                </span>
              </div>
            </div>
            <button
              type="button"
              class="refresh-status-btn text-caption font-weight-medium"
              :disabled="isCheckingStatus"
              @click="handleRefreshStatus"
            >
              <i class="mdi mdi-refresh me-1" :class="{ 'spin-animation': isCheckingStatus }"></i>
              Retry
            </button>
          </div>

          <div
            v-else
            class="status-banner status-banner--amber d-flex align-center justify-space-between gap-3 pa-3 rounded-lg mb-4"
            role="status"
          >
            <div class="d-flex align-center gap-2 min-w-0">
              <i class="mdi mdi-key-alert-outline text-amber-darken-3" style="font-size: 22px;"></i>
              <div class="min-w-0">
                <span class="text-subtitle-2 font-weight-bold text-amber-darken-3 d-block line-height-tight">
                  YouTube Setup Required
                </span>
                <span class="text-caption text-medium-emphasis">
                  Free Google YouTube Data API key required. Follow the 6 steps below to get yours in 2 minutes.
                </span>
              </div>
            </div>
            <button
              type="button"
              class="refresh-status-btn text-caption font-weight-medium"
              :disabled="isCheckingStatus"
              @click="handleRefreshStatus"
            >
              <i class="mdi mdi-refresh me-1" :class="{ 'spin-animation': isCheckingStatus }"></i>
              Check Status
            </button>
          </div>

          <!-- 6 Step-by-Step Instructions -->
          <div class="guide-steps-container d-flex flex-column gap-3">
            <!-- Step 1: Open Google Cloud Console -->
            <div class="guide-step-card pa-4 rounded-xl border">
              <div class="d-flex align-start gap-3">
                <div class="step-number-circle font-weight-bold flex-shrink-0">1</div>
                <div class="flex-grow-1 min-w-0">
                  <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-1">
                    <h4 class="text-subtitle-2 font-weight-bold text-primary-text mb-0">
                      Open Google Cloud Console
                    </h4>
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="step-link-btn text-caption font-weight-medium d-inline-flex align-center gap-1"
                    >
                      <span>console.cloud.google.com</span>
                      <i class="mdi mdi-open-in-new" style="font-size: 14px;"></i>
                    </a>
                  </div>
                  <p class="text-caption text-medium-emphasis mb-0">
                    Go to Google Cloud Console and sign in using your existing Google account. If this is your first visit, agree to the standard terms of service.
                  </p>
                </div>
              </div>
            </div>

            <!-- Step 2: Create a Google Cloud Project -->
            <div class="guide-step-card pa-4 rounded-xl border">
              <div class="d-flex align-start gap-3">
                <div class="step-number-circle font-weight-bold flex-shrink-0">2</div>
                <div class="flex-grow-1 min-w-0">
                  <h4 class="text-subtitle-2 font-weight-bold text-primary-text mb-1">
                    Create a Google Cloud Project
                  </h4>
                  <ol class="text-caption text-medium-emphasis ps-4 mb-0 guide-ordered-list">
                    <li>Click the <strong>Project Selector</strong> dropdown at the top navigation bar.</li>
                    <li>Click <strong>New Project</strong> in the modal window.</li>
                    <li>Enter a descriptive name, for example: <code class="font-mono">Horizon YouTube Integration</code>.</li>
                    <li>Click <strong>Create</strong> and wait a few seconds.</li>
                    <li>Select the newly created project from the project selector.</li>
                  </ol>
                </div>
              </div>
            </div>

            <!-- Step 3: Enable YouTube Data API v3 -->
            <div class="guide-step-card pa-4 rounded-xl border">
              <div class="d-flex align-start gap-3">
                <div class="step-number-circle font-weight-bold flex-shrink-0">3</div>
                <div class="flex-grow-1 min-w-0">
                  <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-1">
                    <h4 class="text-subtitle-2 font-weight-bold text-primary-text mb-0">
                      Enable YouTube Data API v3
                    </h4>
                    <a
                      href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="step-link-btn text-caption font-weight-medium d-inline-flex align-center gap-1"
                    >
                      <span>Open API Library</span>
                      <i class="mdi mdi-open-in-new" style="font-size: 14px;"></i>
                    </a>
                  </div>
                  <ol class="text-caption text-medium-emphasis ps-4 mb-0 guide-ordered-list">
                    <li>Open the <strong>Google Cloud API Library</strong>.</li>
                    <li>Search for <strong>YouTube Data API v3</strong>.</li>
                    <li>Open the official API result card.</li>
                    <li>Click the blue <strong>Enable</strong> button.</li>
                  </ol>
                </div>
              </div>
            </div>

            <!-- Step 4: Create an API Key -->
            <div class="guide-step-card pa-4 rounded-xl border">
              <div class="d-flex align-start gap-3">
                <div class="step-number-circle font-weight-bold flex-shrink-0">4</div>
                <div class="flex-grow-1 min-w-0">
                  <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-1">
                    <h4 class="text-subtitle-2 font-weight-bold text-primary-text mb-0">
                      Create an API Key
                    </h4>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="step-link-btn text-caption font-weight-medium d-inline-flex align-center gap-1"
                    >
                      <span>Open Credentials</span>
                      <i class="mdi mdi-open-in-new" style="font-size: 14px;"></i>
                    </a>
                  </div>
                  <ol class="text-caption text-medium-emphasis ps-4 mb-2 guide-ordered-list">
                    <li>Navigate to <strong>Google Cloud Credentials</strong>.</li>
                    <li>Click <strong>+ Create Credentials</strong> at the top.</li>
                    <li>Select <strong>API key</strong> from the dropdown.</li>
                    <li>Google will immediately generate your API key string.</li>
                    <li>Click the copy icon to copy your generated key.</li>
                  </ol>

                  <!-- Security Guidance Alert -->
                  <div class="security-callout pa-2.5 rounded-lg border">
                    <div class="d-flex align-start gap-2">
                      <i class="mdi mdi-shield-check-outline text-primary mt-0.5" style="font-size: 16px;"></i>
                      <div class="text-caption text-medium-emphasis">
                        <strong class="text-primary-text">Security Guidance:</strong>
                        Never commit your API key to Git or share it publicly. In Horizon, the key lives strictly on your local backend server inside <code class="font-mono">.env</code> and is never sent to or exposed in client-side code.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 5: Configure the API Key in Horizon -->
            <div class="guide-step-card pa-4 rounded-xl border">
              <div class="d-flex align-start gap-3">
                <div class="step-number-circle font-weight-bold flex-shrink-0">5</div>
                <div class="flex-grow-1 min-w-0">
                  <h4 class="text-subtitle-2 font-weight-bold text-primary-text mb-1">
                    Configure the API Key in Horizon (.env)
                  </h4>
                  <ol class="text-caption text-medium-emphasis ps-4 mb-2 guide-ordered-list">
                    <li>Open the Horizon project root directory on your machine.</li>
                    <li>Locate or create the backend <code class="font-mono">.env</code> file in the project root (a template is available in <code class="font-mono">.env.example</code>).</li>
                    <li>Add or edit the <code class="font-mono">YOUTUBE_API_KEY</code> variable:</li>
                  </ol>

                  <!-- Snippet Copy Box -->
                  <div class="snippet-box pa-2.5 rounded-lg border d-flex align-center justify-space-between gap-2 mb-2">
                    <code class="font-mono text-caption text-primary-text font-weight-bold text-truncate">
                      YOUTUBE_API_KEY=YOUR_GOOGLE_YOUTUBE_API_KEY
                    </code>
                    <button
                      type="button"
                      class="copy-snippet-btn font-weight-medium text-caption d-inline-flex align-center gap-1 flex-shrink-0"
                      @click="copyEnvSnippet"
                    >
                      <i :class="copiedSnippet ? 'mdi mdi-check text-success' : 'mdi mdi-content-copy'" style="font-size: 14px;"></i>
                      <span>{{ copiedSnippet ? 'Copied!' : 'Copy' }}</span>
                    </button>
                  </div>

                  <ol start="4" class="text-caption text-medium-emphasis ps-4 mb-0 guide-ordered-list">
                    <li>Replace <code class="font-mono">YOUR_GOOGLE_YOUTUBE_API_KEY</code> with your real key from Google Cloud Console.</li>
                    <li>Save the <code class="font-mono">.env</code> file.</li>
                    <li>Restart the backend server (<code class="font-mono">npm run server:local</code> or <code class="font-mono">npm run server:ip</code>).</li>
                  </ol>
                </div>
              </div>
            </div>

            <!-- Step 6: Verify the Integration -->
            <div class="guide-step-card pa-4 rounded-xl border">
              <div class="d-flex align-start gap-3">
                <div class="step-number-circle font-weight-bold flex-shrink-0">6</div>
                <div class="flex-grow-1 min-w-0">
                  <h4 class="text-subtitle-2 font-weight-bold text-primary-text mb-1">
                    Verify the Integration
                  </h4>
                  <ol class="text-caption text-medium-emphasis ps-4 mb-2 guide-ordered-list">
                    <li>Restart the backend server so it reads the new environment file.</li>
                    <li>Click <strong>Check Status Now</strong> below to verify Horizon backend detects the key.</li>
                    <li>Return to Horizon's YouTube source tab and paste any public playlist URL.</li>
                  </ol>

                  <!-- Sample Test Playlist Box -->
                  <div class="snippet-box pa-2.5 rounded-lg border d-flex align-center justify-space-between gap-2 mb-2">
                    <div class="min-w-0">
                      <span class="text-caption text-medium-emphasis d-block mb-0.5">Quick Test Playlist (Vue 3 Crash Course):</span>
                      <code class="font-mono text-caption text-primary-text text-truncate d-block">
                        https://www.youtube.com/playlist?list=PLF532WzyVstQ
                      </code>
                    </div>
                    <button
                      type="button"
                      class="copy-snippet-btn font-weight-medium text-caption d-inline-flex align-center gap-1 flex-shrink-0"
                      @click="copySampleUrl"
                    >
                      <i :class="copiedSampleUrl ? 'mdi mdi-check text-success' : 'mdi mdi-content-copy'" style="font-size: 14px;"></i>
                      <span>{{ copiedSampleUrl ? 'Copied!' : 'Copy Link' }}</span>
                    </button>
                  </div>

                  <p class="text-caption text-medium-emphasis mb-0">
                    Click the <strong>Import</strong> arrow button. Horizon will retrieve the playlist metadata, parse all lesson videos, and pace your learning milestones!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="guide-footer pa-3 pa-sm-4 border-t d-flex align-center justify-space-between gap-2 flex-wrap">
          <button
            type="button"
            class="guide-text-btn font-weight-medium text-caption"
            @click="$emit('update:modelValue', false)"
          >
            {{ apiKeyConfigured ? 'Close Guide' : "I'll Configure It Later" }}
          </button>

          <div class="d-flex align-center gap-2">
            <button
              type="button"
              class="guide-secondary-btn font-weight-bold text-caption d-inline-flex align-center gap-1"
              :disabled="isCheckingStatus"
              @click="handleRefreshStatus"
            >
              <i class="mdi mdi-refresh" :class="{ 'spin-animation': isCheckingStatus }"></i>
              <span>{{ isCheckingStatus ? 'Checking...' : 'Check Status Now' }}</span>
            </button>

            <button
              type="button"
              class="guide-primary-btn font-weight-bold shadow-orange text-caption d-inline-flex align-center gap-1"
              @click="$emit('update:modelValue', false)"
            >
              <span>Done</span>
              <i class="mdi mdi-check" style="font-size: 16px;"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  apiKeyConfigured: {
    type: Boolean,
    default: false
  },
  isServerOnline: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue', 'refresh-status']);

const isCheckingStatus = ref(false);
const copiedSnippet = ref(false);
const copiedSampleUrl = ref(false);

const SAMPLE_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLF532WzyVstQ';
const ENV_SNIPPET = 'YOUTUBE_API_KEY=YOUR_GOOGLE_YOUTUBE_API_KEY';

async function copyEnvSnippet() {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(ENV_SNIPPET);
      copiedSnippet.value = true;
      setTimeout(() => { copiedSnippet.value = false; }, 2500);
    }
  } catch {
    copiedSnippet.value = true;
    setTimeout(() => { copiedSnippet.value = false; }, 2500);
  }
}

async function copySampleUrl() {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(SAMPLE_PLAYLIST_URL);
      copiedSampleUrl.value = true;
      setTimeout(() => { copiedSampleUrl.value = false; }, 2500);
    }
  } catch {
    copiedSampleUrl.value = true;
    setTimeout(() => { copiedSampleUrl.value = false; }, 2500);
  }
}

function handleRefreshStatus() {
  isCheckingStatus.value = true;
  emit('refresh-status');
  setTimeout(() => {
    isCheckingStatus.value = false;
  }, 700);
}

function handleKeyDown(event) {
  if (event.key === 'Escape' && props.modelValue) {
    emit('update:modelValue', false);
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.youtube-guide-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background-color: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}

.youtube-guide-card {
  width: 100%;
  max-width: 740px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface, #FFFDF8);
  border-color: var(--color-border, #E8DFD0) !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2) !important;
}

.guide-header {
  background-color: var(--color-surface-variant, #FAF5EC);
  border-color: var(--color-border, #E8DFD0) !important;
}

.guide-footer {
  background-color: var(--color-surface-variant, #FAF5EC);
  border-color: var(--color-border, #E8DFD0) !important;
}

.youtube-guide-avatar {
  width: 44px;
  height: 44px;
  background-color: #FFEBEE;
  border: 1px solid #FFCDD2;
}

.guide-tag {
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: var(--color-soft-orange, #FDF4E7);
  color: var(--color-primary-orange, #E97824);
  border: 1px solid rgba(233, 120, 36, 0.2);
}

.guide-close-btn {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  color: var(--color-medium-emphasis, #6B7280);
  cursor: pointer;
  transition: all 0.2s ease;
}

.guide-close-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--color-primary-text, #1E293B);
}

.guide-content-scroll {
  overflow-y: auto;
}

.status-banner {
  border: 1px solid transparent;
}

.status-banner--success {
  background-color: #F0FDF4;
  border-color: #BBF7D0;
}

.status-banner--amber {
  background-color: #FFFBEB;
  border-color: #FDE68A;
}

.status-banner--warning {
  background-color: #FEF2F2;
  border-color: #FECACA;
}

.refresh-status-btn {
  padding: 4px 10px;
  border-radius: 6px;
  background-color: #FFFFFF;
  border: 1px solid var(--color-border, #E8DFD0);
  color: var(--color-primary-text, #1E293B);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.refresh-status-btn:hover {
  background-color: var(--color-surface-variant, #F9F6F0);
  border-color: var(--color-primary-orange, #E97824);
}

.guide-step-card {
  background-color: #FFFFFF;
  border-color: var(--color-border, #E8DFD0) !important;
  transition: box-shadow 0.2s ease;
}

.guide-step-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.step-number-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--color-primary-orange, #E97824);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  box-shadow: 0 2px 4px rgba(233, 120, 36, 0.25);
}

.step-link-btn {
  padding: 3px 8px;
  border-radius: 6px;
  background-color: var(--color-soft-orange, #FDF4E7);
  color: var(--color-primary-orange, #E97824);
  text-decoration: none;
  border: 1px solid rgba(233, 120, 36, 0.25);
  transition: all 0.2s ease;
}

.step-link-btn:hover {
  background-color: var(--color-primary-orange, #E97824);
  color: #FFFFFF;
}

.guide-ordered-list li {
  margin-bottom: 4px;
}

.security-callout {
  background-color: #F8FAFC;
  border-color: #E2E8F0 !important;
}

.snippet-box {
  background-color: #F8FAFC;
  border-color: #E2E8F0 !important;
}

.copy-snippet-btn {
  padding: 4px 10px;
  border-radius: 6px;
  background-color: #FFFFFF;
  border: 1px solid #CBD5E1;
  color: var(--color-primary-text, #1E293B);
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-snippet-btn:hover {
  border-color: var(--color-primary-orange, #E97824);
  color: var(--color-primary-orange, #E97824);
}

.guide-text-btn {
  background: transparent;
  border: none;
  color: var(--color-medium-emphasis, #6B7280);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
}

.guide-text-btn:hover {
  color: var(--color-primary-text, #1E293B);
  background-color: rgba(0, 0, 0, 0.04);
}

.guide-secondary-btn {
  background-color: #FFFFFF;
  border: 1px solid var(--color-border, #E8DFD0);
  color: var(--color-primary-text, #1E293B);
  padding: 7px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.guide-secondary-btn:hover {
  border-color: var(--color-primary-orange, #E97824);
}

.guide-primary-btn {
  background-color: var(--color-primary-orange, #E97824);
  color: #FFFFFF;
  border: none;
  padding: 7px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.guide-primary-btn:hover {
  background-color: var(--color-primary-hover, #D36515);
}

.spin-animation {
  animation: spin 0.75s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.line-height-tight {
  line-height: 1.25;
}
</style>
