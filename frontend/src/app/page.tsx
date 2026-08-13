/**
 * Главная страница: список новостей.
 *
 * Для неавторизованного пользователя бэкенд отдаёт только опубликованные
 * новости; для авторизованного — тот же публичный список, а СВОИ все можно
 * получить через ?all=1 (требует токен). Здесь показываем публичный список.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../api/client';
import { Navigation } from '../components/Navigation';
import type { News, NewsListResponse } from '../types/api';

export default function HomePage() {
  const [news, setNews] = useState<News[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // При монтировании загружаем публичный список новостей.
  useEffect(() => {
    apiClient
      .get<NewsListResponse>('/api/news')
      .then(({ data }) => setNews(data.news))
      .catch(() => setError('Не удалось загрузить новости'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navigation />
      <main className="news-list">
        <h1 className="news-list__title">Новости</h1>

        {loading && <p className="muted-text">Загрузка...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && news.length === 0 && (
          <p className="muted-text">Новостей пока нет</p>
        )}

        <div className="news-grid">
          {news.map((item) => {
            // Дата в человеческом виде по локальным правилам.
            const date = new Date(item.publishAt).toLocaleDateString('ru-RU');
            return (
              <Link key={item._id} href={`/news/${item._id}`} className="news-card">
                <h2 className="news-card__title">{item.title}</h2>
                <span className="news-card__date">{date}</span>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
