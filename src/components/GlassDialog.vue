<template>
  <GlassOverlay
    :visible="visible"
    :blur="blur"
    :opacity="opacity"
    :clickable="closeOnClickOutside"
    :z-index="zIndex"
    @click="handleOverlayClick"
  >
    <div
      class="glass-dialog"
      :class="[
        `glass-dialog--${size}`,
        { 'glass-dialog--center': center }
      ]"
      :style="dialogStyle"
      @click.stop
    >
      <!-- 对话框头部 -->
      <div v-if="$slots.header || title" class="glass-dialog__header">
        <slot name="header">
          <h2 class="glass-dialog__title">{{ title }}</h2>
        </slot>
        <button
          v-if="showClose"
          class="glass-dialog__close"
          @click="handleClose"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <!-- 对话框内容 -->
      <div class="glass-dialog__body">
        <slot />
      </div>

      <!-- 对话框底部 -->
      <div v-if="$slots.footer" class="glass-dialog__footer">
        <slot name="footer" />
      </div>
    </div>
  </GlassOverlay>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GlassOverlay from './GlassOverlay.vue'

interface Props {
  visible?: boolean
  title?: string
  width?: string | number
  height?: string | number
  size?: 'small' | 'medium' | 'large' | 'full'
  center?: boolean
  blur?: number
  opacity?: number
  closeOnClickOutside?: boolean
  showClose?: boolean
  zIndex?: number
}

interface Emits {
  (e: 'close'): void
  (e: 'update:visible', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  size: 'medium',
  center: true,
  blur: 10,
  opacity: 0.3,
  closeOnClickOutside: true,
  showClose: true,
  zIndex: 2000
})

const emit = defineEmits<Emits>()

const dialogStyle = computed(() => {
  const style: any = {}

  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }

  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }

  return style
})

const handleClose = () => {
  emit('close')
  emit('update:visible', false)
}

const handleOverlayClick = () => {
  if (props.closeOnClickOutside) {
    handleClose()
  }
}
</script>

<style scoped>
.glass-dialog {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: glass-dialog-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-dialog--center {
  margin: auto;
}

/* 不同尺寸 */
.glass-dialog--small {
  width: 320px;
  min-height: 200px;
}

.glass-dialog--medium {
  width: 500px;
  min-height: 300px;
}

.glass-dialog--large {
  width: 800px;
  min-height: 500px;
}

.glass-dialog--full {
  width: 95vw;
  height: 95vh;
}

/* 头部样式 */
.glass-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  padding-bottom: 16px;
}

.glass-dialog__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.glass-dialog__close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: #6b7280;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.glass-dialog__close:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #374151;
}

/* 内容样式 */
.glass-dialog__body {
  flex: 1;
  padding: 0 24px;
  overflow-y: auto;
}

/* 底部样式 */
.glass-dialog__footer {
  padding: 20px 24px 24px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 进入动画 */
@keyframes glass-dialog-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .glass-dialog {
    width: 95vw !important;
    height: auto;
    max-height: 85vh;
    margin: auto;
  }

  .glass-dialog__header,
  .glass-dialog__body,
  .glass-dialog__footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .glass-dialog__title {
    font-size: 16px;
  }
}

/* 深色主题支持 */
@media (prefers-color-scheme: dark) {
  .glass-dialog {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .glass-dialog__title {
    color: #f9fafb;
  }

  .glass-dialog__header,
  .glass-dialog__footer {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .glass-dialog__close {
    color: #9ca3af;
  }

  .glass-dialog__close:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: #d1d5db;
  }
}
</style>
