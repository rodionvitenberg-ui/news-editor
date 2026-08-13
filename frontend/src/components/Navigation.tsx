/**
 * Навигация приложения.
 * Показывает логотип, ссылку «Новая статья», email пользователя
 * и кнопку выхода (если авторизован) либо ссылки «Вход/Регистрация».
 */

'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Bell } from './notifications/Bell';

export function Navigation() {
  const { user, logout } = useAuth();

  return (
    <header className="nav">
      <Link href="/" className="nav__logo">
        WINbd
      </Link>

      <nav className="nav__links">
        {user ? (
          <>
            <Bell />
            <Link href="/editor" className="btn btn--secondary">
              Новая статья
            </Link>
            <span className="nav__user">{user.email}</span>
            <button type="button" className="btn btn--ghost" onClick={logout}>
              Выйти
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn--secondary">
              Вход
            </Link>
            <Link href="/register" className="btn btn--primary">
              Регистрация
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
