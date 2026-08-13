/**
 * Файл: models/News.js
 * Модель новостной статьи.
 *
 * Ключевая идея (см. ADR docs/adr/0001-scheduled-publication-as-data.md):
 * «отложенная публикация» — это данные, а не таймер. У новости есть:
 *   - status: 'draft' | 'published'
 *   - publishAt: будущая дата-время (для отложенной публикации)
 * Когда приходит запрос на список новостей, публикуемыми считаются только те,
 * у кого status === 'published' И publishAt <= now. Никаких фоновых задач.
 */

const mongoose = require('mongoose');

/**
 * Схема отдельного блока контента.
 * Блоки разнородные: текст, картинка, цитата, код, файл.
 * В document-модели MongoDB это естественно — каждый блок просто объект.
 * Мы не навязываем жёсткую схему (strict: false), а храним type + любые поля,
 * которые нужны данному типу. Это гибкость, ради которой выбран MongoDB.
 */
const blockSchema = new mongoose.Schema(
  {
    /**
     * Тип блока: 'text' | 'image' | 'quote' | 'code' | 'file'.
     * Определяет, как блок отрисуется на фронтенде и какие поля у него есть.
     */
    type: {
      type: String,
      required: true,
      enum: ['text', 'image', 'quote', 'code', 'file'],
    },

    // Ниже — поля для разных типов блоков. Не у всех блоков все эти поля есть:
    // для text — text/style; для image — url/caption; для quote — text/author;
    // для code — code/language; для file — url/name/size.
    // Поле 'text' используется и в text, и в quote. Поле 'url' — в image и file.
    text: String,
    style: String,
    url: String,
    caption: String,
    author: String,
    code: String,
    language: String,
    name: String,
    size: Number,
  },
  { strict: false } // разрешаем и другие поля (например, future block types)
);

/**
 * Схема новости.
 */
const newsSchema = new mongoose.Schema(
  {
    /**
     * Заголовок статьи.
     */
    title: {
      type: String,
      required: [true, 'Заголовок обязателен'],
      trim: true,
    },

    /**
     * Упорядоченный массив блоков контента.
     * default: [] — новая статья начинается с пустым списком блоков.
     */
    blocks: {
      type: [blockSchema],
      default: [],
    },

    /**
     * Автор статьи — ссылка (ObjectId) на пользователя в коллекции users.
     * ref: 'User' позволяет mongoose делать populate, чтобы получить данные автора.
     */
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * Статус публикации.
     * - 'draft' — черновик, виден только автору;
     * - 'published' — опубликовано, видно всем.
     * По умолчанию новая статья — черновик.
     */
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },

    /**
     * Дата-время публикации.
     * - Если не указана и publishNow: true — ставится сейчас (выполнена публикация).
     * - Если указана будущая дата — это отложенная публикация: статус draft,
     *   но фильтр при чтении покажет статью после наступления этой даты.
     * - По умолчанию равна дате создания.
     */
    publishAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('News', newsSchema);