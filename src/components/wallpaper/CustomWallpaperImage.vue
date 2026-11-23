<template>
  <div class="custom-wallpaper-image-container">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/png, image/jpeg, image/jpg, image/webp"
      class="d-none"
      @change="onFileSelected"
    />

    <!-- State 1: Active In-Memory Image Preview -->
    <div v-if="activeObjectUrl" class="w-100 d-flex flex-column align-center">
      <div class="custom-photo-preview mb-3 rounded-lg overflow-hidden border shadow-sm position-relative">
        <img
          :src="activeObjectUrl"
          alt="Temporary wallpaper preview"
          class="w-100 h-100 object-cover"
        />
        <div class="photo-overlay-badge">
          <v-icon icon="mdi-check-circle" color="success" size="14" class="me-1" />
          Active Session Background
        </div>
      </div>

      <div class="d-flex align-center gap-2 flex-wrap justify-center">
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-camera-retake-outline"
          class="font-weight-medium"
          @click="triggerFileInput"
        >
          Replace Photo
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          color="error"
          prepend-icon="mdi-trash-can-outline"
          class="font-weight-medium"
          @click="clearImage"
        >
          Clear Photo
        </v-btn>
      </div>

      <div class="d-flex align-center justify-center gap-1 mt-3 text-caption text-medium-emphasis text-center" style="font-size: 0.725rem !important;">
        <v-icon icon="mdi-shield-lock-outline" color="success" size="14" class="me-1" />
        <span>Temporary in-memory only (Object URL). Zero bytes stored in LocalStorage or cloud. Clears on reload.</span>
      </div>
    </div>

    <!-- State 2: Dropzone / File Picker Trigger -->
    <div v-else class="w-100 d-flex flex-column align-center text-center py-2">
      <v-avatar color="primary" size="48" class="mb-3 shadow-orange">
        <v-icon icon="mdi-cloud-upload-outline" color="white" size="26" />
      </v-avatar>

      <h4 class="text-subtitle-2 font-weight-bold mb-1">
        Upload Custom Wallpaper Photo
      </h4>

      <p class="text-caption text-medium-emphasis max-w-400 mx-auto mb-3">
        Select a high-resolution landscape, mountain, or personal aesthetic photo (PNG, JPG, or WebP up to 10 MB).
      </p>

      <v-btn
        color="primary"
        variant="flat"
        size="default"
        prepend-icon="mdi-folder-image"
        class="font-weight-bold shadow-orange px-5"
        @click="triggerFileInput"
      >
        Select Image (PNG, JPG, WebP)
      </v-btn>

      <div class="d-flex align-center justify-center gap-1 mt-3 text-caption text-medium-emphasis" style="font-size: 0.725rem !important;">
        <v-icon icon="mdi-memory" size="14" class="me-1" />
        <span>In-memory temporary session: Image will be rendered onto exported PNG without server storage.</span>
      </div>
    </div>

    <!-- Validation Error Alert -->
    <v-alert
      v-if="validationError"
      type="error"
      variant="tonal"
      density="comfortable"
      closable
      class="mt-3 text-caption"
      @click:close="validationError = ''"
    >
      {{ validationError }}
    </v-alert>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const props = defineProps({
  modelValue: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'image-selected', 'image-cleared']);

const fileInputRef = ref(null);
const activeObjectUrl = ref(props.modelValue || null);
const validationError = ref('');

// Synchronize external value changes
watch(() => props.modelValue, (newVal) => {
  if (newVal !== activeObjectUrl.value) {
    activeObjectUrl.value = newVal;
  }
});

function triggerFileInput() {
  validationError.value = '';
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
}

function onFileSelected(event) {
  validationError.value = '';
  const file = event.target?.files?.[0];
  if (!file) return;

  // 1. File Type Validation
  const isValidType = ALLOWED_TYPES.includes(file.type) ||
    file.name.match(/\.(png|jpe?g|webp)$/i);

  if (!isValidType) {
    validationError.value = 'Unsupported file format. Please upload a PNG, JPG, or WebP image.';
    return;
  }

  // 2. File Size Validation (<= 10MB)
  if (file.size > MAX_FILE_SIZE) {
    validationError.value = `Image exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please choose a smaller image.`;
    return;
  }

  // 3. Revoke existing Object URL before creating a new one to prevent memory leaks
  if (activeObjectUrl.value && activeObjectUrl.value.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(activeObjectUrl.value);
    } catch {
      // ignore
    }
  }

  // 4. Create in-memory temporary Object URL (zero server upload, zero LocalStorage)
  try {
    const objectUrl = URL.createObjectURL(file);
    activeObjectUrl.value = objectUrl;
    emit('update:modelValue', objectUrl);
    emit('image-selected', {
      objectUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
  } catch (err) {
    validationError.value = `Failed to process image: ${err.message}`;
  }
}

function clearImage() {
  if (activeObjectUrl.value && activeObjectUrl.value.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(activeObjectUrl.value);
    } catch {
      // ignore
    }
  }
  activeObjectUrl.value = null;
  validationError.value = '';
  emit('update:modelValue', null);
  emit('image-cleared');
}

// Clean up Object URL when component unmounts
onBeforeUnmount(() => {
  if (activeObjectUrl.value && activeObjectUrl.value.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(activeObjectUrl.value);
    } catch {
      // ignore
    }
  }
});
</script>

<style scoped>
.custom-photo-preview {
  width: 140px;
  height: 100px;
  background: #000;
  position: relative;
}

.object-cover {
  object-fit: cover;
}

.photo-overlay-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  right: 6px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
