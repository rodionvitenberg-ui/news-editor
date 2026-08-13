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

const router = express.Router();

// authMiddleware применяется ко ВСЕМ маршрутам этого роутера сразу:
// router.use(...) — «навесить middleware на каждый запрос этого роутера».
router.use(authMiddleware);

// Создать новость.
router.post('/', newsController.createNews);

// Список новостей (?all=1 — только свои; без параметра — только опубликованные).
router.get('/', newsController.getNews);

// Одна новость по id.
router.get('/:id', newsController.getNewsById);

// Обновить новость (только автор).
router.put('/:id', newsController.updateNews);

// Удалить новость (только автор).
router.delete('/:id', newsController.deleteNews);

module.exports = router;