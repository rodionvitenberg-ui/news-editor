/**
 * Файл: controllers/news.controller.js
 * Бизнес-логика новостей: создание, чтение, обновление, удаление + публикация.
 *
 * Маршруты записи (POST/PUT/DELETE) защищены authMiddleware — req.user.userId
 * содержит id автора из проверенного JWT. Маршруты чтения (GET) защищены
 * optionalAuthMiddleware: req.user есть только если прислан валидный токен.
 *
 * Логика отложенной публикации (см. ADR docs/adr/0001-scheduled-publication-as-data.md):
 * «Публикация — данные, а не таймер»: новость с любой датой publishAt имеет
 * status: 'published', а до наступления этой даты её скрывает публичный фильтр
 * (status === 'published' && publishAt <= now). Черновик (status: 'draft')
 * никогда не попадает в публичный список.
 */

const News = require('../models/News');
const { getIO } = require('../utils/socket');

/**
 * POST /api/news — создать новость (только для авторизованных).
 * Тело: { title, blocks?, publishNow?, publishAt? }
 *
 * @param {import('express').Request} req — req.user.userId (автор), req.body
 * @param {import('express').Response} res — ответ
 */
async function createNews(req, res) {
  try {
    const { title, blocks = [], publishNow = false, publishAt } = req.body;

    // Заголовок обязателен (валидация дублируется на уровне контроллера).
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Заголовок обязателен' });
    }

    // Логика публикации (семантика ADR 0001 — «публикация — данные, а не таймер»):
    // 1) publishNow: true → status: 'published', publishAt: now;
    // 2) publishAt указана (любая дата) → status: 'published', publishAt = дата.
    //    Пока дата в будущем, публичный фильтр (status published && publishAt <= now)
    //    скрывает новость — это и есть «отложенная публикация»;
    // 3) ни то, ни другое → обычный черновик: status: 'draft' (никогда не публикуется).
    const isPublishedNow = publishNow === true;

    // Если хотим опубликовать сейчас — ставим дату сейчас; иначе берём дату из запроса
    // (для отложенной публикации) либо оставляем default схемы (Date.now) для черновика.
    const publishDate = isPublishedNow
      ? new Date()
      : publishAt
        ? new Date(publishAt)
        : undefined;

    // Если publishAt передан, но это невалидная дата — new Date(publishAt) даст Invalid Date.
    // Выбрасываем понятную ошибку, чтобы не сохранить мусор в базу.
    if (publishDate && Number.isNaN(publishDate.getTime())) {
      return res.status(400).json({ message: 'Некорректная дата публикации' });
    }

    // Собираем данные для создания.
    // ВАЖНО: наличие publishDate (сейчас/прошлое/будущее) означает, что новость
    // «опубликована»; будущая дата скрывает её до наступления момента.
    const newsData = {
      title: title.trim(),
      blocks,
      author: req.user.userId, // из проверенного токена
      status: publishDate ? 'published' : 'draft',
    };

    // publishDate ставим только если она определена, иначе — default схемы (Date.now).
    if (publishDate) newsData.publishAt = publishDate;

    const news = await News.create(newsData);

    // Real-time: сообщаем всем подключённым клиентам о создании новости.
    // Данные: id, заголовок, статус — клиент сам решит, как их показать
    // (например, в «колокольчике» уведомлений).
    getIO().emit('news:created', {
      id: news._id.toString(),
      title: news.title,
      status: news.status,
    });

    // 201 — Created.
    res.status(201).json({ news });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при создании новости', error: error.message });
  }
}

/**
 * GET /api/news — список новостей.
 * - С query-параметром ?all=1 и токеном автора: автор видит ВСЕ свои новости
 *   (черновики + опубликованные + отложенные). Это «черновики автора».
 * - Без параметра (публичный список): только опубликованные с наступившей датой.
 *   Пагинация ?page=1&limit=10.
 *
 * Маршрут защищён optionalAuthMiddleware: req.user есть только если прислан
 * валидный JWT. Гости получают публичный список, ?all=1 без токена — 401.
 *
 * @param {import('express').Request} req — query: all, page, limit; req.user (опц.)
 * @param {import('express').Response} res — ответ
 */
async function getNews(req, res) {
  try {
    const { all, scheduled } = req.query;
    // ?all=1 — «свои новости»; ?scheduled=1 — отложенные всех авторов.
    // Оба режима требуют авторизации (иначе 401).
    if ((all === '1' || scheduled === '1') && !req.user) {
      return res.status(401).json({ message: 'Доступ запрещён: токен не передан' });
    }
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

    // База для запроса: all=1 — только свои; иначе без авторского фильтра.
    let filter = all === '1' ? { author: req.user.userId } : {};

    // ?scheduled=1 — отложенные: status published, но дата ещё НЕ наступила
    // ($gt — строго больше now). Видны ВСЕМ авторизованным (любой автор).
    if (scheduled === '1') {
      filter.status = 'published';
      filter.publishAt = { $gt: new Date() };
    } else if (all !== '1') {
      // Публичный список (не all и не scheduled): опубликованные с наступившей датой.
      filter.status = 'published';
      filter.publishAt = { $lte: new Date() }; // $lte — "less than or equal"
    }

    // find → фильтр; sort: -createdAt — новые сверху; skip/limit — пагинация.
    const [news, total] = await Promise.all([
      News.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      News.countDocuments(filter),
    ]);

    res.json({ news, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при получении новостей', error: error.message });
  }
}

/**
 * GET /api/news/:id — одна новость по id (публичный, optionalAuth).
 * - Автор видит любую свою новость (в том числе черновик).
 * - Все остальные (включая гостей без токена) — только опубликованную.
 *
 * @param {import('express').Request} req — params.id, req.user (опц.)
 * @param {import('express').Response} res — ответ
 */
async function getNewsById(req, res) {
  // ObjectId неизвестного формата (CastError) сразу превращаем в 404 —
  // это пользовательская ошибка, а не сбой сервера.
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(404).json({ message: 'Новость не найдена' });
  }

  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({ message: 'Новость не найдена' });
    }

    // Автор может быть и гостем (req.user может отсутствовать) —
    // isOwner истинно только если токен прислан и userId совпадает.
    const isOwner = Boolean(req.user && news.author.toString() === req.user.userId);

    // Опубликованная с наступившей датой — видна всем (включая гостей).
    const isPublic = news.status === 'published' && news.publishAt <= new Date();

    // Отложенная (published, но дата в будущем) — видна любому АВТОРИЗОВАННОМУ
    // пользователю, но не гостю. Черновики (status draft) — только автору.
    const isScheduledVisible = Boolean(
      req.user && news.status === 'published' && news.publishAt > new Date()
    );

    if (!isOwner && !isPublic && !isScheduledVisible) {
      return res.status(403).json({ message: 'Доступ запрещён: новость не опубликована' });
    }

    res.json({ news });
  } catch (error) {
    // Ошибка формата ObjectId тоже попадёт сюда (CastError).
    res.status(500).json({ message: 'Ошибка сервера при получении новости', error: error.message });
  }
}

/**
 * PUT /api/news/:id — обновить новость. Только автор.
 * Тело: { title?, blocks?, publishNow?, publishAt? }
 *
 * @param {import('express').Request} req — params.id, req.user.userId, req.body
 * @param {import('express').Response} res — ответ
 */
async function updateNews(req, res) {
  // Невалидный формат id — это «не найдено», а не 500.
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(404).json({ message: 'Новость не найдена' });
  }

  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({ message: 'Новость не найдена' });
    }

    // Только автор может редактировать («право автора» из глоссария).
    if (news.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Доступ запрещён: только автор может редактировать новость' });
    }

    const { title, blocks, publishNow = false, publishAt } = req.body;

    // Меняем поля, которые пришли в запросе.
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: 'Заголовок не может быть пустым' });
      news.title = title.trim();
    }

    if (blocks !== undefined) {
      news.blocks = blocks;
    }

    // Логика смены статуса при редактировании (ADR 0001):
    // - publishNow: true — немедленная публикация: published, publishAt = now;
    // - publishAt указан — новость «опубликована» с этой датой: status = published.
    //   Будущая дата скрывает её до наступления (отложенная публикация);
    // - ни publishNow, ни publishAt не переданы — статус и дату не трогаем
    //   (например, редактор просто поправил заголовок/блоки).
    if (publishNow === true) {
      news.status = 'published';
      news.publishAt = new Date();
    } else if (publishAt !== undefined) {
      const parsed = new Date(publishAt);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Некорректная дата публикации' });
      }
      news.publishAt = parsed;
      news.status = 'published';
    }

    const updated = await news.save();

    // Real-time: сообщаем всем о изменении новости.
    getIO().emit('news:updated', {
      id: updated._id.toString(),
      title: updated.title,
      status: updated.status,
    });

    res.json({ news: updated });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при обновлении новости', error: error.message });
  }
}

/**
 * DELETE /api/news/:id — удалить новость. Только автор.
 *
 * @param {import('express').Request} req — params.id, req.user.userId
 * @param {import('express').Response} res — ответ
 */
async function deleteNews(req, res) {
  // Невалидный формат id — это «не найдено», а не 500.
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(404).json({ message: 'Новость не найдена' });
  }

  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({ message: 'Новость не найдена' });
    }

    if (news.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Доступ запрещён: только автор может удалить новость' });
    }

    await news.deleteOne();

    // Real-time: сообщаем всем об удалении новости.
    getIO().emit('news:deleted', {
      id: news._id.toString(),
      title: news.title,
    });

    res.json({ message: 'Новость удалена' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при удалении новости', error: error.message });
  }
}

module.exports = { createNews, getNews, getNewsById, updateNews, deleteNews };