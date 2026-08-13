/**
 * Страница редактора (защищена авторизацией).
 *
 * Работает в двух режимах:
 * - без query-параметра `id` — создание новой новости;
 * - с `?id=...` — редактирование существующей (загружаем новость с бэкенда
 *   и передаём её в <Editor initialNews={...} />).
 *
 * Режим определяется по window.location.search в браузере (не через
 * useSearchParams), чтобы не оборачивать страницу в <Suspense> — у нас
 * защищённый маршрут и загрузка данных происходит уже на клиенте.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '../../components/Navigation';
import { Editor } from '../../components/editor/Editor';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import type { News, NewsResponse } from '../../types/api';

/** Возвращает id новости из query-строки (или null). Только в браузере. */
function getEditorId(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('id');
}

export default function EditorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [initialNews, setInitialNews] = useState<News | undefined>(undefined);
  // Ленивая инициализация: если в URL есть ?id=..., загрузка уже идёт —
  // это убирает синхронный setLoadingNews(true) из тела эффекта.
  const [loadingNews, setLoadingNews] = useState(() => Boolean(getEditorId()));
  const [newsError, setNewsError] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);

  // Защита: пока грузится состояние авторизации — ничего не показываем;
  // если пользователь не авторизован — редирект на /login.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Если в URL есть ?id=... — загружаем новость для редактирования.
  // Бэкенд отдаёт новость только её автору (иначе 403), поэтому чужие
  // черновики здесь не появятся. Все setState вызываются в колбэках
  // промиса — синхронного вызова в теле эффекта нет.
  useEffect(() => {
    if (!user) return;

    const id = getEditorId();
    if (!id) {
      // Нет id — режим создания, initialNews остаётся undefined.
      return;
    }

    let cancelled = false;

    apiClient
      .get<NewsResponse>(`/api/news/${id}`)
      .then(({ data }) => {
        if (!cancelled) setInitialNews(data.news);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
        setNewsError(message || 'Не удалось загрузить новость для редактирования');
      })
      .finally(() => {
        if (!cancelled) setLoadingNews(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || !user) {
    return (
      <>
        <Navigation />
        <main className="auth-page">
          <p className="muted-text">Загрузка...</p>
        </main>
      </>
    );
  }

  // Пока идёт загрузка новости для редактирования — не монтируем Editor,
  // чтобы его состояние (title, blocks) сразу подставило корректные значения.
  if (loadingNews) {
    return (
      <>
        <Navigation />
        <main className="auth-page">
          <p className="muted-text">Загрузка новости...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main>
        {newsError ? (
          <div className="editor">
            <p className="error-text">{newsError}</p>
            <Link href="/" className="btn btn--secondary" style={{ marginTop: 16 }}>
              Вернуться к новостям
            </Link>
          </div>
        ) : (
          <>
            <Editor
              onSaved={(id) => setSavedId(id)}
              initialNews={initialNews}
            />
            {savedId && (
              <p className="success-text editor__saved">
                Сохранено: <a href={`/news/${savedId}`}>открыть новость</a>
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}