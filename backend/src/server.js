/**
 * Файл: server.js — ТОЧКА ВХОДА приложения.
 *
 * Порядок выполнения (сверху вниз) критичен:
 * 1. Подключаем dotenv ПЕРВЫМ, чтобы process.env уже содержал
 *    переменные из .env к моменту, когда их прочитает app.js / db.js.
 * 2. Создаём Express-приложение (createApp) и НАШ HTTP-сервер.
 * 3. Подключаемся к MongoDB.
 * 4. Инициализируем Socket.io поверх этого HTTP-сервера.
 * 5. Запускаем сервер (listen).
 *
 * Почему http.createServer(app) вместо app.listen()?
 * Socket.io работает поверх обычного HTTP-сервера. Чтобы передать сервер
 * в initIO(), создаём его явно через встроенный модуль http.
 */

// 1. dotenv читает файл .env и кладёт его содержимое в process.env.
require('dotenv').config();

const http = require('http');

const createApp = require('./app');
const connectDB = require('./config/db');
const { initIO } = require('./utils/socket');

/**
 * Стартует сервер: подключается к БД, настраивает Socket.io и начинает слушать порт.
 */
async function startServer() {
  // 2. Собираем приложение (middleware + маршруты) из app.js.
  const app = createApp();

  // 2.1. Создаём HTTP-сервер поверх Express-приложения.
  const server = http.createServer(app);

  // 3. Подключаемся к MongoDB Atlas. Если не получится — функция завершит
  //    процесс кодом 1, и до listen мы просто не дойдём.
  await connectDB();

  // 4. Инициализируем Socket.io: теперь контроллеры могут вызывать getIO().emit(...).
  initIO(server);

  // 5. Порт берём из .env (по умолчанию 5000).
  const PORT = process.env.PORT || 5000;

  // server.listen — запускает HTTP-сервер на указанном порту.
  server.listen(PORT, () => {
    console.log(`API сервер запущен: http://localhost:${PORT}`);
  });
}

// Запускаем только если файл выполняется напрямую (node src/server.js),
// а не импортируется (такое нам понадобится для тестов — импортируем app, не server).
startServer();

module.exports = { startServer };
