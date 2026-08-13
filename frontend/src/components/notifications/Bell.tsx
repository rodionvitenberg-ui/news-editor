/**
 * Bell — «колокольчик» уведомлений (⭐ из ТЗ).
 *
 * Показывает:
 * - иконку и счётчик непрочитанных;
 * - выпадающий список последних событий (created/updated/deleted);
 * - кнопку «Очистить».
 *
 * Данные берёт из NotificationsProvider (real-time через Socket.io).
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useNotifications } from './NotificationsProvider';

/** Человекочитаемая подпись для типа события. */
const KIND_LABEL: Record<string, string> = {
  created: 'Создана новость',
  updated: 'Изменена новость',
  deleted: 'Удалена новость',
};

export function Bell() {
  const { notifications, unreadCount, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Закрываем попап при клике вне колокольчика.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="bell" ref={rootRef}>
      <button
        type="button"
        className={`bell__btn ${unreadCount > 0 ? 'bell__btn--has' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Уведомления"
      >
        🔔
        {unreadCount > 0 && <span className="bell__badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="bell__panel">
          <div className="bell__head">
            <span>Уведомления</span>
            {notifications.length > 0 && (
              <button type="button" className="bell__clear" onClick={clear}>
                Очистить
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="bell__empty">Пока нет уведомлений</p>
          ) : (
            <ul className="bell__list">
              {notifications.map((n) => (
                <li key={n.id} className="bell__item">
                  {/* Уведомление кликабельно: переходим на страницу новости.
                      Для удалённой новости (deleted) страницы уже нет — обычная строка. */}
                  {n.kind !== 'deleted' ? (
                    <Link
                      href={`/news/${n.newsId}`}
                      className="bell__link"
                      onClick={() => setOpen(false)}
                    >
                      <span className={`bell__kind bell__kind--${n.kind}`}>{KIND_LABEL[n.kind]}</span>
                      <span className="bell__title">{n.title}</span>
                      <time className="bell__time">
                        {new Date(n.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </Link>
                  ) : (
                    <>
                      <span className={`bell__kind bell__kind--${n.kind}`}>{KIND_LABEL[n.kind]}</span>
                      <span className="bell__title">{n.title}</span>
                      <time className="bell__time">
                        {new Date(n.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
