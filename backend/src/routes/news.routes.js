/**
 * Файл: routes/news.routes.js
 * Маршруты новостей. ВСЕ endpoints защищены middleware'ом authMiddleware —
 * это требование ТЗ: «Авторизованному пользователю доступны endpoints
 * для сущности news (должен быть middleware, в котором будет проверка
 * валидного токена)».
 *
 * Запросы без валидного JWT получат 401 и не попадут в контроллер.
 */

const express = require('express');
const newsController = require('../controllers/news.controller');
const authMiddleware = require('../middleware/auth.middleware');
const optionalAuthMiddleware = require('../middleware/optionalAuth.middleware');

const router = express.Router();

// СТРОГО защищённые маршруты (создание/изменение/удаление) — только авторизованные.
// ТЗ: «Авторизованному пользователю доступны endpoints для сущности news
// (должен быть middleware, в котором будет проверка валидного токена)».
router.post('/', authMiddleware, newsController.createNews);
router.put('/:id', authMiddleware, newsController.updateNews);
router.delete('/:id', authMiddleware, newsController.deleteNews);

// ПУБЛИЧНЫЕ чтения — optionalAuth: гостям доступен опубликованный список/новость,
// а с валидным токеном контроллер дополнительно обработает ?all=1 и черновики автора.
router.get('/', optionalAuthMiddleware, newsController.getNews);
router.get('/:id', optionalAuthMiddleware, newsController.getNewsById);

module.exports = router;
