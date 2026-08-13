/**
 * Файл: models/User.js
 * Модель пользователя. Определяет, как документ пользователя
 * выглядит и хранится в MongoDB, а также методы для работы с ним.
 *
 * ВАЖНО о безопасности:
 * - Пароль в базе НИКОГДА не хранится в открытом виде — только хеш (bcrypt).
 * - Поле называется passwordHash, чтобы прямо в коде напоминать: здесь хеш, а не пароль.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Схема пользователя.
 * Второй аргумент объекта — настройки схемы:
 * - timestamps: true — mongoose автоматически добавит поля createdAt и updatedAt.
 */
const userSchema = new mongoose.Schema(
  {
    /**
     * Email пользователя (логин).
     * - required — обязательное поле;
     * - unique — индекс уникальности в MongoDB (двух пользователей с одним email быть не может);
     * - lowercase — храним email всегда в нижнем регистре, чтобы «User@x.com» и «user@x.com»
     *   считались одним адресом.
     */
    email: {
      type: String,
      required: [true, 'Email обязателен'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    /**
     * Хеш пароля (результат bcrypt.hash). Сам пароль не хранится!
     * select: false — это «скрытое» поле: оно НЕ будет возвращаться
     * обычными запросами find(). Чтобы получить его, нужен явный
     * запрос .select('+passwordHash'). Это защита от случайной утечки.
     */
    passwordHash: {
      type: String,
      required: [true, 'Пароль обязателен'],
      select: false,
    },
  },
  { timestamps: true }
);

/**
 * Сравнивает введённый пароль с хешем, хранящимся у пользователя.
 * Используется при логине.
 *
 * @param {string} candidatePassword — пароль, который ввёл пользователь
 * @returns {Promise<boolean>} — true, если пароль верный
 */
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);