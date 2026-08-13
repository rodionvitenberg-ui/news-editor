/**
 * TypeScript-типы, зеркалирующие ответы бэкенда (Express API).
 *
 * Правило «Type Synchronization»: при изменении форматов на бэкенде
 * эти типы обновляются в ту же итерацию. Никаких `any`.
 */

/** Пользователь (то, что возвращает API после toObject() и удаления passwordHash). */
export interface User {
  _id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/** Ответ авторизации: пользователь + JWT. */
export interface AuthResponse {
  user: User;
  token: string;
}

/** Ответ GET /api/auth/me. */
export interface MeResponse {
  user: User;
}

/**
 * Блок контента новости.
 * Поля опциональны — у разных типов блоков они свои:
 * text: text/style; image: url/caption; quote: text/author;
 * code: code/language; file: url/name/size.
 */
export interface Block {
  type: 'text' | 'image' | 'quote' | 'code' | 'file';
  text?: string;
  style?: string;
  url?: string;
  caption?: string;
  author?: string;
  code?: string;
  language?: string;
  name?: string;
  size?: number;
}

/** Статус публикации. */
export type NewsStatus = 'draft' | 'published';

/** Новость (сущность News из бэкенда). */
export interface News {
  _id: string;
  title: string;
  blocks: Block[];
  author: string;
  status: NewsStatus;
  publishAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Ответ списка новостей с пагинацией. */
export interface NewsListResponse {
  news: News[];
  total: number;
  page: number;
  limit: number;
}

/** Ответ создания/обновления/чтения одной новости. */
export interface NewsResponse {
  news: News;
}

/** Ответ загрузки файла. */
export interface UploadResponse {
  url: string;
  name: string;
  size: number;
  mimetype: string;
}

/** Данные реального события Socket.io (см. news.controller.js на бэке). */
export interface NewsSocketEvent {
  id: string;
  title: string;
  status: NewsStatus;
}
