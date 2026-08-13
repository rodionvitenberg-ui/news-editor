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

type ViewMode = 'all' | 'mine';

export default function HomePage() {
  const { user } = useAuth();

  const [view, setView] = useState<ViewMode>('all');
  const [news, setNews] = useState<News[]>([]);
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(true);

  /** Обработчик переключения вкладки: сразу сбрасываем данные на «загрузку». */
  const switchView = (next: ViewMode) => {
    setView(next);
    setNews([]);
    setError('');
    setLoading(true);
  };

  /**
   * Загрузка списка. Вкладка «Мои» доступна только авторизованным.
   * effect перезапускается при смене вкладки или пользователя.
   */
  useEffect(() => {
    // «Мои» без токена невозможны — грузим публичный список (без setState-в-эффекте).
    // Кнопки «Мои» видны только авторизованным, так что для гостей view всегда 'all'.
    const effectiveView: ViewMode = view === 'mine' && !user ? 'all' : view;

    let cancelled = false;

    apiClient
      .get<NewsListResponse>(effectiveView === 'mine' ? '/api/news?all=1' : '/api/news')
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
          </div>
        )}

        {loading && <p className="muted-text">Загрузка...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && news.length === 0 && (
          <p className="muted-text">
            {view === 'mine' ? 'У вас пока нет новостей' : 'Новостей пока нет'}
          </p>
        )}

        <div className="news-grid">
          {news.map((item) => (
            <NewsCard key={item._id} item={item} isMyView={view === 'mine'} onDeleted={handleRemoved} />
          ))}
        </div>
      </main>
    </>
  );
}