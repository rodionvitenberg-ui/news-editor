/**
 * NewsCard — карточка новости в списке на главной странице.
 *
 * Используется в трёх режимах:
 * - публичный список («Все»): карточка кликабельна, показывает заголовок/дату;
 * - «Мои» (свои новости автора): дополнительно бейдж статуса и кнопки
 *   «Редактировать», «Опубликовать», «Удалить»;
 * - «Отложенные»: бейдж «Отложено», но БЕЗ кнопок управления — чужие
 *   отложенные статьи читатель видит, но редактировать не может.
 *
 * Статус выводится по правилам ADR 0001 (публикация = данные, а не таймер):
 * - publishAt в будущем → «Отложено» (скрыта до наступления даты);
 * - иначе status === 'published' → «Опубликовано»;
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
  /** Режим «Отложенные» — показываем бейдж «Отложено», но без кнопок управления. */
  isScheduledView?: boolean;
  /** Колбэк после успешного удаления (чтобы родитель убрал карточку из списка). */
  onDeleted: (id: string) => void;
}

/** Возвращает текст и класс бейджа статуса по правилам ADR 0001. */
function getStatusBadge(item: News): { label: string; className: string } {
  // «Отложено» — будущая дата публикации. Отложенные статьи имеют status
  // 'published', но скрыты до наступления даты — поэтому проверяем дату ПЕРВОЙ.
  const publishAt = new Date(item.publishAt).getTime();
  if (!Number.isNaN(publishAt) && publishAt > Date.now()) {
    return { label: 'Отложено', className: 'badge badge--scheduled' };
  }

  // Опубликовано — дата наступила и status published.
  if (item.status === 'published') {
    return { label: 'Опубликовано', className: 'badge badge--published' };
  }

  return { label: 'Черновик', className: 'badge badge--draft' };
}

/** Человеческая дата публикации. */
function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU');
}

export function NewsCard({ item, isMyView, isScheduledView = false, onDeleted }: NewsCardProps) {
  const badge = getStatusBadge(item);
  // Кнопки управления (Редактировать/Опубликовать/Удалить) доступны только
  // автору в режиме «Мои». В «Отложенных» чужие/свои отложенные показываем
  // просто с бейджем статуса.
  const showFooter = isMyView || isScheduledView;
  const showActions = isMyView;

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

      {showFooter && (
        <div className="news-card__footer">
          <span className={badge.className}>{badge.label}</span>
          {showActions && (
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
          )}
        </div>
      )}
    </article>
  );
}