/**
 * Главная страница: список новостей с переключателем «Все» / «Мои».
 *
 * - «Все» — публичный список: бэкенд отдаёт только опубликованные новости
 *   с наступившей датой (GET /api/news).
 * - «Мои» — все свои новости автора: черновики, отложенные и опубликованные
 *   (GET /api/news?all=1 требует валидный JWT — axios-интерцептор добавит его).
 *
 * Для неавторизованного пользователя вкладка «Мои» недоступна.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Navigation } from '../components/Navigation';
import { NewsCard } from '../components/news/NewsCard';
import { useAuth } from '../context/AuthContext';
import type { News, NewsListResponse } from '../types/api';

type ViewMode = 'all' | 'mine' | 'scheduled';

/** Ключ localStorage — запоминаем, в какой вкладке был пользователь. */
const VIEW_STORAGE_KEY = 'winbd_news_view';

export default function HomePage() {
  const { user } = useAuth();

  // Ленивая инициализация из localStorage: при возврате со страницы новости
  // пользователь остаётся в той же вкладке («Мои», «Отложенные» и т.д.).
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'all';
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === 'mine' || saved === 'scheduled' ? saved : 'all';
  });
  const [news, setNews] = useState<News[]>([]);
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(true);

  /** Обработчик переключения вкладки: сразу сбрасываем данные на «загрузку». */
  const switchView = (next: ViewMode) => {
    setView(next);
    // Запоминаем выбор, чтобы после возврата со статьи остаться в той же вкладке.
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // localStorage может быть недоступен (SSR/privacy) — молча игнорируем.
    }
    setNews([]);
    setError('');
    setLoading(true);
  };

  /**
   * Загрузка списка. Вкладка «Мои» доступна только авторизованным.
   * effect перезапускается при смене вкладки или пользователя.
   */
  useEffect(() => {
    // Вкладки «Мои» и «Отложенные» недоступны без токена — грузим публичный список.
    // Кнопки показаны только авторизованным, для гостей view остаётся 'all'.
    const needsAuth = view === 'mine' || view === 'scheduled';
    const effectiveView: ViewMode = needsAuth && !user ? 'all' : view;

    let cancelled = false;

    // '/api/news?all=1' — свои; '?scheduled=1' — отложенные всех авторов.
    const path =
      effectiveView === 'mine'
        ? '/api/news?all=1'
        : effectiveView === 'scheduled'
          ? '/api/news?scheduled=1'
          : '/api/news';

    apiClient
      .get<NewsListResponse>(path)
      .then(({ data }) => {
        if (!cancelled) setNews(data.news);
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить новости');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [view, user]);

  /** Убираем карточку из списка после удаления/публикации. */
  const handleRemoved = useCallback((id: string) => {
    setNews((prev) => prev.filter((item) => item._id !== id));
  }, []);

  return (
    <>
      <Navigation />
      <main className="news-list">
        <h1 className="news-list__title">Новости</h1>

        {/* Вкладки доступны только авторизованным — анонимам показываем «Все». */}
        {user && (
          <div className="news-list__tabs">
            <button
              type="button"
              className={`btn ${view === 'all' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => switchView('all')}
            >
              Все
            </button>
            <button
              type="button"
              className={`btn ${view === 'mine' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => switchView('mine')}
            >
              Мои
            </button>
            <button
              type="button"
              className={`btn ${view === 'scheduled' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => switchView('scheduled')}
            >
              Отложенные
            </button>
          </div>
        )}

        {loading && <p className="muted-text">Загрузка...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && news.length === 0 && (
          <p className="muted-text">
            {view === 'mine'
              ? 'У вас пока нет новостей'
              : view === 'scheduled'
                ? 'Отложенных новостей нет'
                : 'Новостей пока нет'}
          </p>
        )}

        <div className="news-grid">
          {news.map((item) => (
            <NewsCard
              key={item._id}
              item={item}
              isMyView={view === 'mine'}
              isScheduledView={view === 'scheduled'}
              onDeleted={handleRemoved}
            />
          ))}
        </div>
      </main>
    </>
  );
}