<template>
  <Teleport to="body">
    <Transition
      name="glass-overlay"
      enter-active-class="glass-overlay-enter-active"
      leave-active-class="glass-overlay-leave-active"
      enter-from-class="glass-overlay-enter-from"
      leave-to-class="glass-overlay-leave-to"
    >
      <div
        v-if="visible"
        class="glass-overlay"
        :class="{ 'glass-overlay--clickable': clickable }"
        :style="overlayStyle"
        @click="handleOverlayClick"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  visible?: boolean
  blur?: number
  opacity?: number
  backgroundColor?: string
  clickable?: boolean
  zIndex?: number
}

interface Emits {
  (e: 'click'): void
  (e: 'update:visible', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  blur: 10,
  opacity: 0.3,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  clickable: true,
  zIndex: 2000
})

const emit = defineEmits<Emits>()

const overlayStyle = computed(() => ({
  '--blur-amount': `${props.blur}px`,
  '--overlay-opacity': props.opacity,
  '--overlay-bg': props.backgroundColor,
  '--overlay-z-index': props.zIndex
}))

const handleOverlayClick = () => {
  if (props.clickable) {
    emit('click')
    emit('update:visible', false)
  }
}
</script>

<style scoped>
.glass-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--overlay-z-index);
  backdrop-filter: blur(var(--blur-amount));
  -webkit-backdrop-filter: blur(var(--blur-amount));
  background-color: var(--overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.glass-overlay--clickable {
  cursor: pointer;
}

/* 过渡动画 */
.glass-overlay-enter-active,
.glass-overlay-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-overlay-enter-from,
.glass-overlay-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

/* 支持不同的模糊强度 */
.glass-overlay.blur-light {
  --blur-amount: 5px;
}

.glass-overlay.blur-medium {
  --blur-amount: 10px;
}

.glass-overlay.blur-heavy {
  --blur-amount: 20px;
}
</style>

