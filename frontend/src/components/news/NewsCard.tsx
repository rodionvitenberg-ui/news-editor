/**
 * NewsCard — карточка новости в списке на главной странице.
 *
 * Используется в двух режимах:
 * - публичный список («Все»): карточка кликабельна, показывает заголовок/дату;
 * - «Мои» (свои новости автора): дополнительно бейдж статуса и кнопки
 *   «Редактировать», «Опубликовать», «Удалить».
 *
 * Статус выводится по правилам ADR 0001 (публикация = данные, а не таймер):
 * - status === 'published' → «Опубликовано»;
 * - status === 'draft' и publishAt в будущем → «Отложено»;
 * - иначе → «Черновик».
 */

'use client';

import Link from 'next/link';
import { apiClient } from '../../api/client';
import type { News } from '../../types/api';

interface NewsCardProps {
  item: News;
  /** Режим «Мои» — показываем статус и кнопки управления. */
  isMyView: boolean;
  /** Колбэк после успешного удаления (чтобы родитель убрал карточку из списка). */
  onDeleted: (id: string) => void;
}

/** Возвращает текст и класс бейджа статуса по правилам ADR 0001. */
function getStatusBadge(item: News): { label: string; className: string } {
  // Опубликованные — только те, у кого status 'published' (дата уже наступила
  // в момент чтения, иначе бэкенд не вернул бы её в публичный список).
  if (item.status === 'published') {
    return { label: 'Опубликовано', className: 'badge badge--published' };
  }

  // Черновик с будущей датой публикации — «отложено».
  const publishAt = new Date(item.publishAt).getTime();
  if (!Number.isNaN(publishAt) && publishAt > Date.now()) {
    return { label: 'Отложено', className: 'badge badge--scheduled' };
  }

  return { label: 'Черновик', className: 'badge badge--draft' };
}

/** Человеческая дата публикации. */
function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU');
}

export function NewsCard({ item, isMyView, onDeleted }: NewsCardProps) {
  const badge = getStatusBadge(item);

  /** Удаление с подтверждением; при успехе сообщаем родителю id удалённой новости. */
  async function handleDelete() {
    if (!window.confirm('Удалить новость навсегда?')) return;
    try {
      await apiClient.delete(`/api/news/${item._id}`);
      onDeleted(item._id);
    } catch {
      // Ошибка удаления (например, истёк токен) — молча игнорируем в списке;
      // пользователь увидит новость на месте и сможет повторить попытку.
    }
  }

  /** «Опубликовать сейчас» — PUT c publishNow: true (бэкенд ставит status published). */
  async function handlePublish() {
    try {
      await apiClient.put(`/api/news/${item._id}`, { publishNow: true });
      onDeleted(item._id);
    } catch {
      // Аналогично удалению — не ломаем список при сетевой ошибке.
    }
  }

  return (
    <article className="news-card">
      <Link href={`/news/${item._id}`} className="news-card__link">
        <h2 className="news-card__title">{item.title}</h2>
        <span className="news-card__date">{formatDate(item.publishAt)}</span>
      </Link>

      {isMyView && (
        <div className="news-card__footer">
          <span className={badge.className}>{badge.label}</span>
          <div className="news-card__actions">
            <Link href={`/editor?id=${item._id}`} className="btn btn--ghost btn--sm">
              Редактировать
            </Link>
            <button type="button" className="btn btn--ghost btn--sm" onClick={handlePublish}>
              Опубликовать
            </button>
            {/* Удаление — опасное действие, поэтому красный hover через btn--danger */}
            <button type="button" className="btn btn--danger btn--sm news-card__delete" onClick={handleDelete}>
              Удалить
            </button>
          </div>
        </div>
      )}
    </article>
  );
}