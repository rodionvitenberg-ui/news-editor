/**
 * Файл: routes/auth.routes.js
 * Маршруты авторизации. Связывают URL-пути с функциями контроллера.
 *
 * Роутер — это «навигация по адресам»:
 * - POST /api/auth/register → controller.register
 * - POST /api/auth/login    → controller.login
 * - GET  /api/auth/me       → authMiddleware → controller.getMe
 *
 * Обрати внимание на GET /me: он защищён middleware'ом authMiddleware,
 * который поставили ПЕРЕД контроллером. Именно так работает «проверка
 * валидного токена» из ТЗ: запрос проходит через охранника и только потом
 * попадает в контроллер.
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Регистрация (публичный маршрут — без проверки токена).
router.post('/register', authController.register);

// Вход (публичный маршрут).
router.post('/login', authController.login);

// Получение данных по токену (защищённый маршрут).
// authMiddleware проверяет токен и кладёт userId в req.user.
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;