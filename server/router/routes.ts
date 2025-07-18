import { router } from '.'
import { authMiddleware } from '../middleware/auth'
import * as dataApi from '../api/data'
import * as fileApi from '../api/file'
import * as passApi from '../api/pass'

export function registerRoutes() {
  // Data routes
  router.register({
    path: '/api/:word/data',
    method: 'GET',
    handler: dataApi.getData,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/data',
    method: 'POST',
    handler: dataApi.createData,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/data',
    method: 'PUT',
    handler: dataApi.updateData,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/data',
    method: 'DELETE',
    handler: dataApi.deleteData,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/settings',
    method: 'PUT',
    handler: dataApi.updateSettings,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/view_word',
    method: 'PUT',
    handler: dataApi.updateViewWord,
    middleware: [authMiddleware]
  })

  // View routes
  router.register({
    path: '/api/v/:view_word/data',
    method: 'GET',
    handler: dataApi.getData,
    middleware: [authMiddleware]
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
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/file',
    method: 'POST',
    handler: fileApi.handleFileUpload,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/file',
    method: 'DELETE',
    handler: fileApi.handleFileDelete,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/file/all',
    method: 'DELETE',
    handler: fileApi.handleFileDeleteAll,
    middleware: [authMiddleware]
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
    middleware: [authMiddleware]
  })

  // Pass routes
  router.register({
    path: '/api/:word/pass/verify',
    method: 'POST',
    handler: passApi.handlePasswordVerify,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/:word/pass/config',
    method: 'GET',
    handler: passApi.handleGetConfig,
    middleware: [authMiddleware]
  })

  // View pass routes
  router.register({
    path: '/api/v/:view_word/pass/verify',
    method: 'POST',
    handler: passApi.handlePasswordVerify,
    middleware: [authMiddleware]
  })
  router.register({
    path: '/api/v/:view_word/pass/config',
    method: 'GET',
    handler: passApi.handleGetConfig,
    middleware: [authMiddleware]
  })
}
