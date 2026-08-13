/**
 * Файл: middleware/optionalAuth.middleware.js
 * «Мягкая» проверка JWT-токена для публичных маршрутов.
 *
 * В отличие от authMiddleware (строгий «охранник»), этот middleware НЕ блокирует
 * запрос при отсутствии/невалидности токена — он просто кладёт данные пользователя
 * в req.user, если токен был и оказался валидным.
 *
 * Зачем нужен:
 * - GET /api/news — публичный список доступен всем, но с `?all=1` (свои новости)
 *   требует авторизации. Контроллер сам решит: req.user есть → обработать all,
 *   req.user нет → 401 для all или обычный публичный список.
 * - GET /api/news/:id — опубликованная новость видна всем, но автор должен видеть
 *   и свои черновики. Опять же, решение принимает контроллер по наличию req.user.
 */

const jwt = require('jsonwebtoken');

/**
 * Проверяет JWT, если он есть. Не блокирует запрос:
 * - токен валиден → req.user = payload, next();
 * - токена нет или он невалиден → req.user = undefined, next().
 *
 * @param {import('express').Request} req — объект запроса
 * @param {import('express').Response} res — объект ответа
 * @param {import('express').NextFunction} next — функция передачи управления дальше
 */
function optionalAuthMiddleware(req, res, next) {
  // Авторизация не обязательна — при любом исходе вызываем next().
  try {
    const authHeader = req.headers.authorization;

    // Нет заголовка — просто пропускаем дальше (гость).
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Токен валиден — кладём payload (userId) в req.user.
    req.user = payload;
    next();
  } catch (error) {
    // Токен невалиден/истёк — обрабатываем как гостя (не блокируем).
    // Строгие маршруты (POST/PUT/DELETE) защищены authMiddleware отдельно.
    next();
  }
}

module.exports = optionalAuthMiddleware;