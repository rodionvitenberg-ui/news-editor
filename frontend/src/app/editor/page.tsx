/**
 * Страница редактора (защищена авторизацией).
 *
 * Фаза 7: здесь живёт полноценный блочный редактор <Editor /> —
 * текст/картинки/цитаты/код/файлы, предпросмотр, публикация сейчас или по дате.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '../../components/Navigation';
import { Editor } from '../../components/editor/Editor';
import { useAuth } from '../../context/AuthContext';

export default function EditorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [savedId, setSavedId] = useState<string | null>(null);

  // Защита: пока грузится состояние авторизации — ничего не показываем;
  // если пользователь не авторизован — редирект на /login.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

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

  return (
    <>
      <Navigation />
      <main>
        <Editor onSaved={(id) => setSavedId(id)} />
        {savedId && (
          <p className="success-text editor__saved">
            Сохранено: <a href={`/news/${savedId}`}>открыть новость</a>
          </p>
        )}
      </main>
    </>
  );
}
