<template>
  <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  data: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 150
  }
})

const qrCodeUrl = ref('')

const generateQRCode = async () => {
  if (props.data) {
    try {
      qrCodeUrl.value = await QRCode.toDataURL(props.data, {
        width: props.size,
        margin: 1
      })
    } catch (err) {
      console.error(err)
    }
  }
}

watch(() => props.data, generateQRCode)

onMounted(generateQRCode)
</script>
