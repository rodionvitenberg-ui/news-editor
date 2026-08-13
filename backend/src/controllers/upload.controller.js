/**
 * Файл: controllers/upload.controller.js
 * Обработка загрузки файлов.
 *
 * Multer уже сохранил файл на диск (см. config/upload.js) и положил
 * информацию о нём (имя, размер, MIME-тип) в req.file.
 * Контроллер остаётся простым: сформировать публичный URL файла и отдать клиенту.
 */

/**
 * POST /api/upload — загрузить файл (защищено middleware'ом авторизации).
 *
 * Возвращается объект { url, name, size, mimetype } — эти данные фронтенд
 * может вставить в блок новости (image или file):
 *   { type: 'image', url: '/uploads/xxxx.jpg', caption: '' }
 *   { type: 'file', url: '/uploads/xxxx.pdf', name: 'doc.pdf', size: 1234 }
 *
 * @param {import('express').Request} req — req.file (заполнен multer)
 * @param {import('express').Response} res — ответ
 */
function uploadFile(req, res) {
  // Если multer отклонил файл — он выбросит ошибку до попадания сюда,
  // а вот случай «запрос дошёл, но файла нет» — это неверный запрос.
  if (!req.file) {
    return res.status(400).json({ message: 'Файл не передан (поле file)' });
  }

  // Публичный URL: файлы раздаются express.static из папки uploads/,
  // поэтому достаточно относительного пути /uploads/<имя файла>.
  const url = `/uploads/${req.file.filename}`;

  res.status(201).json({
    url,
    name: req.file.originalname, // исходное имя файла с клиента
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
}

module.exports = { uploadFile };
