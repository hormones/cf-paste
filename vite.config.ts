import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import { cloudflare } from "@cloudflare/vite-plugin"

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

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
		Components({
			resolvers: [ElementPlusResolver()],
		}),
	].filter(Boolean),
	server: {
		port: 5173,
		host: true, // 允许外部访问
		open: '/test', // 开发环境自动打开 /test 页面
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
	build: {
		sourcemap: isDev,
		rollupOptions: {
			external: isCloudflare ? [] : ['better-sqlite3'],
			output: {
				manualChunks: {
					// Vue 核心运行时
					'vendor-vue': ['vue', 'vue-router', 'pinia'],
					// Element Plus 组件库
					'vendor-element': ['element-plus'],
					// Markdown 编辑器（体积最大，单独隔离）
					'vendor-md-editor': ['md-editor-v3'],
					// 其余工具库
					'vendor-utils': ['axios', 'vue-i18n', '@noble/hashes', 'crypto-js', 'qrcode'],
				},
			},
		},
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'shared': fileURLToPath(new URL('./shared', import.meta.url))
		},
	},
})
