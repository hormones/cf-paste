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
	server: {
		port: 5173,
		host: true, // 允许外部访问
		open: true, // 自动打开浏览器
		cors: true, // 启用CORS
		proxy: isCloudflare ? {
			'/api': {
				target: 'http://localhost:8787',
				changeOrigin: true,
				configure: (proxy) => {
					proxy.on('error', (err) => {
						console.log('Cloudflare proxy error:', err)
					})
				}
			}
		} : process.env.PLATFORM === 'selfhost' ? {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				secure: false,
				ws: true, // 支持WebSocket
				configure: (proxy) => {
					proxy.on('error', (err) => {
						console.log('Backend proxy error:', err)
						console.log('Make sure the backend server is running at http://localhost:3000')
					})
					proxy.on('proxyReq', (proxyReq, req) => {
						console.log('\x1b[32m%s\x1b[0m', `[Proxy] ${req.method} ${req.url} -> http://localhost:3000${req.url}`)
					})
				}
			}
		} : undefined,
	},
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
