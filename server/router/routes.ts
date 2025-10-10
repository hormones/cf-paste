import { router } from '.'
import { authMiddleware } from '../middleware/auth'
import { adminAuthMiddleware } from '../middleware/adminAuth'
import {
  createLogMiddleware,
  deleteFileLogMiddleware,
  deleteLogMiddleware,
  downloadFileLogMiddleware,
  updateLogMiddleware,
  uploadFileLogMiddleware,
  viewLogMiddleware
} from '../middleware/activityLog'
import * as dataApi from '../api/data'
import * as fileApi from '../api/file'
import * as passApi from '../api/pass'
import * as adminAuthApi from '../api/admin/auth'
import * as adminOverviewApi from '../api/admin/overview'
import * as adminActivityApi from '../api/admin/activity'
import * as adminRankingApi from '../api/admin/ranking'
import * as adminLogsApi from '../api/admin/logs'

export function registerRoutes() {
  // Data routes
  router.register({
    path: '/api/:word/data',
    method: 'GET',
    handler: dataApi.getData,
    middleware: [authMiddleware, viewLogMiddleware]
  })
  router.register({
    path: '/api/:word/data',
    method: 'POST',
    handler: dataApi.createData,
    middleware: [authMiddleware, createLogMiddleware]
  })
  router.register({
    path: '/api/:word/data',
    method: 'PUT',
    handler: dataApi.updateData,
    middleware: [authMiddleware, updateLogMiddleware]
  })
  router.register({
    path: '/api/:word/data',
    method: 'DELETE',
    handler: dataApi.deleteData,
    middleware: [authMiddleware, deleteLogMiddleware]
  })
  router.register({
    path: '/api/:word/data/settings',
    method: 'PATCH',
    handler: dataApi.updateSettings,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/data/view_word',
    method: 'PATCH',
    handler: dataApi.updateViewWord,
    middleware: [authMiddleware]
  })

  // View routes
  router.register({
    path: '/api/v/:view_word/data',
    method: 'GET',
    handler: dataApi.getData,
    middleware: [authMiddleware, viewLogMiddleware]
  })

  // File routes
  router.register({
    path: '/api/:word/file/list',
    method: 'GET',
    handler: fileApi.handleFileList,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/file/download',
    method: 'GET',
    handler: fileApi.handleFileDownload,
    middleware: [authMiddleware, downloadFileLogMiddleware]
  })
  router.register({
    path: '/api/:word/file',
    method: 'POST',
    handler: fileApi.handleFileUpload,
    middleware: [authMiddleware, uploadFileLogMiddleware]
  })
  router.register({
    path: '/api/:word/file',
    method: 'DELETE',
    handler: fileApi.handleFileDelete,
    middleware: [authMiddleware, deleteFileLogMiddleware]
  })
  router.register({
    path: '/api/:word/file/all',
    method: 'DELETE',
    handler: fileApi.handleFileDeleteAll,
    middleware: [authMiddleware, deleteFileLogMiddleware]
  })
  router.register({
    path: '/api/:word/file/multipart/init',
    method: 'POST',
    handler: fileApi.handleMultipartInit,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/file/multipart/cancel/:uploadId',
    method: 'DELETE',
    handler: fileApi.handleMultipartCancel,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/file/multipart/chunk/:uploadId/:chunkIndex',
    method: 'POST',
    handler: fileApi.handleMultipartChunk,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/file/multipart/complete/:uploadId',
    method: 'POST',
    handler: fileApi.handleMultipartComplete,
    middleware: [authMiddleware]
  })

  // View file routes
  router.register({
    path: '/api/v/:view_word/file/list',
    method: 'GET',
    handler: fileApi.handleFileList,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/v/:view_word/file/download',
    method: 'GET',
    handler: fileApi.handleFileDownload,
    middleware: [authMiddleware, downloadFileLogMiddleware]
  })

  // Pass routes
  router.register({
    path: '/api/:word/pass/verify',
    method: 'POST',
    handler: passApi.handlePasswordVerify,
  })

  // View pass routes
  router.register({
    path: '/api/v/:view_word/pass/verify',
    method: 'POST',
    handler: passApi.handlePasswordVerify,
  })
  router.register({
    path: '/api/pass/config',
    method: 'GET',
    handler: passApi.handleGetConfig,
  })

  // Admin routes - Authentication endpoints (no middleware required)
  router.register({
    path: '/api/admin/auth',
    method: 'POST',
    handler: adminAuthApi.handleAuth
  })
  router.register({
    path: '/api/admin/logout',
    method: 'POST',
    handler: adminAuthApi.handleLogout,
    middleware: [adminAuthMiddleware]
  })

  // Admin routes - Protected endpoints (require authentication middleware)
  router.register({
    path: '/api/admin/overview',
    method: 'GET',
    handler: adminOverviewApi.handleOverview,
    middleware: [adminAuthMiddleware]
  })
  router.register({
    path: '/api/admin/activity',
    method: 'GET',
    handler: adminActivityApi.handleActivity,
    middleware: [adminAuthMiddleware]
  })
  router.register({
    path: '/api/admin/ranking',
    method: 'GET',
    handler: adminRankingApi.handleRanking,
    middleware: [adminAuthMiddleware]
  })
  router.register({
    path: '/api/admin/logs',
    method: 'GET',
    handler: adminLogsApi.handleLogs,
    middleware: [adminAuthMiddleware]
  })
}
