/**
 * Файл: routes/upload.routes.js
 * Маршрут загрузки файлов.
 *
 * Защищён middleware'ом authMiddleware — загружать файлы могут
 * только авторизованные пользователи (аналогично узлам упомянутым endpoints).
 *
 * upload.single('file') — это middleware multer:
 * принимает multipart/form-data с полем «file» и сохраняет файл на диск.
 */

const express = require('express');
const upload = require('../config/upload');
const uploadController = require('../controllers/upload.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Авторизация для всех маршрутов этого роутера.
router.use(authMiddleware);

// POST /api/upload — загрузка одного файла (поле «file»).
router.post('/', upload.single('file'), uploadController.uploadFile);

module.exports = router;
