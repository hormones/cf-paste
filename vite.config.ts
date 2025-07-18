import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import { cloudflare } from "@cloudflare/vite-plugin"

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import ElementPlus from 'unplugin-element-plus/vite'

console.log('NODE_ENV', process.env.NODE_ENV)
console.log('PLATFORM', process.env.PLATFORM)

const isDev = process.env.NODE_ENV === 'development'
const isCloudflare = process.env.PLATFORM === 'cloudflare'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		isDev && vueDevTools(),
		// Only include Cloudflare plugin for Cloudflare builds
		isCloudflare && cloudflare(),
		AutoImport({
			resolvers: [ElementPlusResolver()],
		}),
		ElementPlus({
			useSource: true,
		}),
		Components({
			resolvers: [
				ElementPlusResolver({
					importStyle: 'sass',
				}),
			],
		}),
	].filter(Boolean),
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@use "@/assets/element.scss" as *;`,
			},
		},
	},
	build: {
		sourcemap: isDev,
		// Platform-specific build optimizations
		rollupOptions: {
			external: isCloudflare ? [] : ['better-sqlite3'],
		},
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'shared': fileURLToPath(new URL('./shared', import.meta.url))
		},
	},
})
