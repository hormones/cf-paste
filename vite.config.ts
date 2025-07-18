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
const isDev = process.env.NODE_ENV === 'development'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		isDev && vueDevTools(),
		cloudflare(),
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
	],
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@use "@/assets/element.scss" as *;`,
			},
		},
	},
	build: {
		sourcemap: isDev,
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'shared': fileURLToPath(new URL('./shared', import.meta.url))
		},
	},
})
