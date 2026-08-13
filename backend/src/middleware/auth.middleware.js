/**
 * Файл: middleware/auth.middleware.js
 * Middleware проверки JWT-токена — «охранник» защищённых маршрутов.
 *
 * Как работает:
 * 1. Браузер прикладывает токен к каждому запросу в заголовке Authorization: "Bearer <токен>".
 * 2. Этот middleware вынимает токен, проверяет его подпись секретом (JWT_SECRET из .env).
 * 3. Если токен валиден — кладёт его payload (с id пользователя) в req.user и вызывает next().
 * 4. Если невалиден/отсутствует — отвечает 401 и НЕ пропускает дальше.
 *
 * Именно это требует ТЗ: «middleware, в котором будет проверка валидного токена».
 */

const jwt = require('jsonwebtoken');

/**
 * Проверяет наличие и валидность JWT в заголовке Authorization.
 * При успехе сохраняет payload (userId, iat, exp) в req.user и вызывает next().
 * При ошибке возвращает 401 и прекращает обработку запроса.
 *
 * @param {import('express').Request} req — объект запроса
 * @param {import('express').Response} res — объект ответа
 * @param {import('express').NextFunction} next — функция передачи управления дальше по конвейеру
 */
function authMiddleware(req, res, next) {
  try {
    // Заголовок Authorization имеет вид: "Bearer eyJhbGciOi...". Разбиваем строку по пробелу.
    // Должно получиться два элемента: ['Bearer', '<токен>'].
    const authHeader = req.headers.authorization;

    // Если заголовка нет — не авторизован.
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Доступ запрещён: токен не передан' });
    }

    // Берём вторую часть заголовка — сам токен.
    const token = authHeader.split(' ')[1];

    // jwt.verify проверяет подпись секретом и срок действия (exp).
    // Если что-то не так — будет выброшено исключение, которое поймает catch ниже.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Кладём payload в req.user — дальше по конвейеру (в контроллер) запрос придёт уже «осведомлённым».
    req.user = payload;

    // Передаём управление следующему middleware/маршруту.
    next();
  } catch (error) {
    // Токен невалиден (подпись не совпала), истёк или испорчен.
    return res.status(401).json({ message: 'Доступ запрещён: недействительный токен' });
  }
}

module.exports = authMiddleware;