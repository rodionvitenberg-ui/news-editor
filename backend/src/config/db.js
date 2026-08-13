/**
 * Файл: config/db.js
 * Отвечает за подключение к базе данных MongoDB через Mongoose.
 *
 * Почему отдельный файл?
 * Подключение к БД — это «инфраструктурная» забота. Вынося её в config/db.js,
 * мы держим точку входа (server.js) чистой, а саму логику подключения —
 * переиспользуемой и тестируемой.
 */

const mongoose = require('mongoose');

/**
 * Устанавливает соединение с MongoDB Atlas.
 *
 * Асинхронная функция: mongoose.connect возвращает Promise.
 * Мы ждём его завершения (await), чтобы понять — получилось ли подключиться.
 * В случае ошибки логируем её в консоль и завершаем процесс с кодом 1,
 * потому что без базы данных сервер бесполезен: дальше работать нет смысла.
 *
 * @returns {Promise<void>} — Promise, который разрешается после успешного подключения
 */
async function connectDB() {
  try {
    // process.env.MONGO_URI — строка подключения из файла .env
    // (dotenv уже загрузил все переменные в process.env в server.js)
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB подключена: ${conn.connection.host}`);
  } catch (error) {
    // Любая ошибка подключения (неверный пароль, нет сети, IP не в белом списке...)
    console.error(`Ошибка подключения к MongoDB: ${error.message}`);

    // process.exit(1) — «аварийное» завершение процесса с кодом 1 (ошибка).
    process.exit(1);
  }
}

module.exports = connectDB;