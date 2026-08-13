/**
 * Файл: utils/socket.js
 * Единая точка доступа к Socket.io-серверу (паттерн «синглтон»).
 *
 * Зачем нужен отдельный модуль?
 * Экземпляр Socket.io создаётся ОДИН раз при старте сервера (server.js),
 * а эмитить события (news:created / updated / deleted) нужно из контроллеров,
 * которые обрабатывают HTTP-запросы в любой момент. Поэтому через этот модуль
 * любой код может получить работающий экземпляр: getIO().emit(...).
 */

const { Server } = require('socket.io');

// Здесь будет храниться созданный экземпляр Socket.io.
let io = null;

/**
 * Инициализирует Socket.io поверх HTTP-сервера и запоминает экземпляр.
 * Вызывается один раз в server.js после создания http-сервера.
 *
 * @param {import('http').Server} server — созданный HTTP-сервер (http.createServer(app))
 * @returns {import('socket.io').Server} — экземпляр Socket.io
 */
function initIO(server) {
  io = new Server(server, {
    cors: {
      // Разрешаем подключения клиентов с того же домена, что и CORS для API.
      // В dev — Vite на localhost:5173.
      origin: process.env.CORS_ORIGIN || '*',
    },
  });

  // Логируем подключения/отключения клиентов — удобно при отладке.
  io.on('connection', (socket) => {
    console.log('Socket.io: клиент подключён', socket.id);

    socket.on('disconnect', () => {
      console.log('Socket.io: клиент отключён', socket.id);
    });
  });

  return io;
}

/**
 * Возвращает ранее созданный экземпляр Socket.io.
 * Кидаем ошибку, если initIO ещё не вызывался (защита от неверного порядка).
 *
 * @returns {import('socket.io').Server} — экземпляр Socket.io
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.io не инициализирован: сначала вызови initIO(server)');
  }
  return io;
}

module.exports = { initIO, getIO };
