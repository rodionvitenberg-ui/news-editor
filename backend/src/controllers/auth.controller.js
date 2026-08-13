/**
 * Файл: controllers/auth.controller.js
 * Бизнес-логика авторизации: регистрация, вход, получение данных по токену.
 *
 * Контроллер — это «менеджер»: он получает запрос, достаёт нужные данные,
 * работает с моделью (БД) и формирует ответ клиенту.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Стоимость хеширования bcrypt. 10 — разумный баланс «безопасно/быстро»
// для учебного проекта (в бою часто берут 10–12).
const SALT_ROUNDS = 10;

/**
 * Создаёт и подписывает JWT для пользователя.
 * В payload кладём только userId — всё, что нужно для идентификации.
 * Важно: НЕ кладём в токен passwordHash и прочие чувствительные данные.
 *
 * @param {string} userId — идентификатор пользователя (из MongoDB)
 * @returns {string} — подписанный JWT
 */
function signToken(userId) {
  return jwt.sign(
    { userId }, // payload
    process.env.JWT_SECRET, // секрет подписи из .env
    { expiresIn: process.env.JWT_EXPIRES_IN } // срок жизни (например, 7d)
  );
}

/**
 * POST /api/auth/register — регистрация нового пользователя.
 *
 * @param {import('express').Request} req — тело: { email, password }
 * @param {import('express').Response} res — ответ
 */
async function register(req, res) {
  try {
    const { email, password } = req.body;

    // Валидация на уровне контроллера (в дополнение к схеме модели).
    if (!email || !password) {
      return res.status(400).json({ message: 'Email и пароль обязательны' });
    }

    // Пароль должен быть не короче 6 символов.
    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль должен быть не короче 6 символов' });
    }

    // 1. Проверяем, не занят ли email. unique-индекс в схеме не даст создать дубликат,
    //    но лучше проверить явно и вернуть понятную ошибку.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Пользователь с таким email уже существует' });
    }

    // 2. bcrypt.hash — хешируем пароль. Хеш — это одностороннее преобразование:
    //    из хеша нельзя восстановить пароль. bcrypt также добавляет «соль» (случайные данные),
    //    поэтому одинаковые пароли дают разные хеши.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Создаём пользователя в БД.
    const user = await User.create({ email, passwordHash });

    // 4. Выдаём токен (симметрия с логином: после регистрации пользователь сразу «в системе»).
    const token = signToken(user._id.toString());

    // Возвращаем пользователя (без passwordHash) и токен.
    // user.toObject() превращает документ mongoose в обычный объект,
    // чтобы можно было удалить лишнее поле перед отправкой клиенту.
    const userData = user.toObject();
    delete userData.passwordHash;

    res.status(201).json({ user: userData, token });
  } catch (error) {
    // Любая другая ошибка (например, сбой БД).
    res.status(500).json({ message: 'Ошибка сервера при регистрации', error: error.message });
  }
}

/**
 * POST /api/auth/login — вход: проверка email + пароль, выдача JWT.
 *
 * @param {import('express').Request} req — тело: { email, password }
 * @param {import('express').Response} res — ответ
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email и пароль обязательны' });
    }

    // 1. Ищем пользователя по email. ВАЖНО: passwordHash скрыт (select: false),
    //    поэтому запрашиваем его явно через .select('+passwordHash').
    const user = await User.findOne({ email }).select('+passwordHash');

    // Если пользователя нет — отвечаем универсальной ошибкой, чтобы не дать
    // злоумышленнику понять, что email существует («не светим» данные).
    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    // 2. comparePassword — метод модели: bcrypt.compare(введённый, хеш).
    //    Если пароль неверный — 401.
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    // 3. Всё верно — выдаём токен.
    const token = signToken(user._id.toString());

    const userData = user.toObject();
    delete userData.passwordHash;

    res.json({ user: userData, token });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при входе', error: error.message });
  }
}

/**
 * GET /api/auth/me — возвращает данные пользователя по токену.
 * Защищён middleware'ом authMiddleware: сюда запросы доходят только с валидным токеном,
 * а req.user уже содержит userId — ровно то, что требует ТЗ
 * («из JWT можно получить id пользователя»).
 *
 * @param {import('express').Request} req — req.user.userId (установлен middleware'ом)
 * @param {import('express').Response} res — ответ
 */
async function getMe(req, res) {
  try {
    // Из payload проверенного токена берём id пользователя.
    const userId = req.user.userId;

    // Ищем пользователя в БД.
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const userData = user.toObject();
    delete userData.passwordHash;

    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при получении пользователя', error: error.message });
  }
}

module.exports = { register, login, getMe };