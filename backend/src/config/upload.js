/**
 * Файл: config/upload.js
 * Настройка multer — библиотеки для загрузки файлов (multipart/form-data).
 *
 * Чего мы добиваемся:
 * - сохраняем файлы в папку uploads/;
 * - ограничиваем размер файла 5 МБ (предел, чтобы не «уронить» сервер);
 * - разрешаем только нужные типы: картинки, PDF и офисные документы.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Папка для загрузок (в корне backend).
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

// Если папки uploads/ ещё нет — создаём (дисковая защита от сбоев при старте).
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Хранилище: куда именно сохранять файл и под каким именем.
 * diskStorage — сохраняет файл на диск.
 */
const storage = multer.diskStorage({
  /**
   * destination — в какую папку сохранять.
   * callback(null, uploadDir) — «ошибки нет, папка вот такая».
   */
  destination(req, file, callback) {
    callback(null, uploadDir);
  },

  /**
   * filename — под каким именем сохранить.
   * Используем уникальное имя: <timestamp>-<random>.<ext>,
   * чтобы два файла с одинаковым именем не конфликтовали.
   */
  filename(req, file, callback) {
    // path.extname(originalname) — расширение файла (например .jpg, .pdf)
    const ext = path.extname(file.originalname);
    // Уникальная часть имени: время в миллисекундах + случайное число (base36).
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9).toString(36)}`;
    callback(null, `${unique}${ext}`);
  },
});

/**
 * Фильтр файлов: разрешаем только определённые MIME-типы.
 * MIME-тип — это «паспорт» формата: image/jpeg, application/pdf и т.д.
 */
const fileFilter = (req, file, callback) => {
  // Список разрешённых MIME-типов.
  const allowed = [
    'image/jpeg', // .jpg .jpeg
    'image/png', // .png
    'image/webp', // .webp
    'image/gif', // .gif
    'application/pdf', // .pdf
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ];

  if (allowed.includes(file.mimetype)) {
    // Всё в порядке — принимаем файл (ошибки нет, true).
    callback(null, true);
  } else {
    // Тип не разрешён — отклоняем с понятной ошибкой.
    // error.status = 400: помечаем как ошибку клиента, чтобы central error handler
    // вернул корректный HTTP-статус (не 500).
    const error = new Error(`Тип файла не поддерживается: ${file.mimetype}`);
    error.status = 400;
    callback(error, false);
  }
};

/**
 * Готовая конфигурация multer: хранилище + фильтр + лимит размера 5 МБ.
 * Её используем в маршруте /api/upload как middleware.
 */
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 МБ
});

module.exports = upload;
