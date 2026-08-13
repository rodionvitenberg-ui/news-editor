/**
 * Файл: app.js
 * Собирает Express-приложение: подключает глобальные middleware,
 * регистрирует маршруты и обрабатывает ошибки.
 *
 * Почему app.js отдельно от server.js?
 * - app.js отвечает на вопрос «как настроено приложение» (middleware, роуты).
 * - server.js отвечает на вопрос «как сервер запущен» (порт, БД, listen).
 * Такое разделение позволяет тестировать приложение без реального запуска
 * и позже легко подключить Socket.io.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const newsRoutes = require('./routes/news.routes');
const uploadRoutes = require('./routes/upload.routes');

/**
 * Проверка здоровья сервера: GET /api/health.
 * Используется, чтобы убедиться, что сервер жив (пригодится и для деплоя —
 * многие хостинги опрашивают health-check).
 *
 * @param {import('express').Request} req — объект запроса
 * @param {import('express').Response} res — объект ответа
 */
function healthHandler(req, res) {
  // Отдаём JSON со статусом и временем — удобно смотреть в браузере/curl.
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
}

/**
 * Создаёт и возвращает настроенное Express-приложение.
 *
 * @returns {import('express').Express} — экземпляр приложения Express
 */
function createApp() {
  const app = express();

  // --- Глобальные middleware (применяются к КАЖДОМУ запросу) ---

  // 1. cors() — разрешает браузеру на другом домене (наш фронтенд на :5173)
  //    обращаться к нашему API на :5000. Без этого браузер заблокирует запрос
  //    политикой «same-origin». ВАЖНО: cors() надо подключить ДО маршрутов.
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.use(cors({ origin: corsOrigin }));

  // 2. express.json() — парсит тело запроса, если оно в формате JSON,
  //    и кладёт результат в req.body. Без этого req.body был бы undefined.
  app.use(express.json());

  // 3. express.urlencoded({ extended: true }) — то же для форм
  //    (application/x-www-form-urlencoded). Пригодится для обычных форм.
  app.use(express.urlencoded({ extended: true }));

  // --- Маршруты ---

  // Health-check: простейший способ убедиться, что сервер отвечает.
  app.get('/api/health', healthHandler);

  // Маршруты авторизации: /api/auth/register, /api/auth/login, /api/auth/me.
  app.use('/api/auth', authRoutes);

  // Маршруты новостей: /api/news (все защищены middleware'ом авторизации).
  app.use('/api/news', newsRoutes);

  // Маршрут загрузки файлов: /api/upload (защищён middleware'ом авторизации).
  app.use('/api/upload', uploadRoutes);

  // Раздача загруженных файлов как статики: любой запрос /uploads/<файл>
  // возвращает файл из папки uploads/ (без авторизации — файлы публичны по URL).
  // express.static — встроенный middleware Express для раздачи статических файлов.
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // --- Обработчик 404 для неизвестных маршрутов ---
  app.use((req, res) => {
    res.status(404).json({ message: 'Маршрут не найден' });
  });

  // --- Централизованный обработчик ошибок ---
  // Express сам вызывает этот middleware, когда в любом роуте/контроллере
  // ошибка была передана в next(error) (multer так и делает при файле с
  // неразрешённым типом или превышением размера).
  //
  // КАЖДЫЙ обработчик ошибок Express обязан иметь 4 параметра (даже если
  // next не используется) — иначе Express не распознает его как error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // Multer кладёт в ошибку свойство status (например, LIMIT_FILE_SIZE или 400
    // для fileFilter). Учитываем его; иначе 500.
    const status = err.status || 500;

    // В продакшене не стоит отдавать стек ошибки клиенту — только сообщение.
    res.status(status).json({ message: err.message || 'Ошибка сервера' });
  });

  return app;
}

module.exports = createApp;