import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { NotificationsProvider } from '../components/notifications/NotificationsProvider';
import '../styles/main.scss';

export const metadata: Metadata = {
  title: 'WINbd — редактор новостей',
  description: 'Редактор новостных статей: JWT-авторизация, отложенная публикация, блочный редактор, real-time уведомления.',
};

/**
 * Корневой layout: оборачивает всё приложение.
 * 1. Подключает наши SCSS-стили (main.scss) — один раз.
 * 2. Оборачивает children в <AuthProvider>, чтобы любой компонент
 *    мог воспользоваться useAuth().
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
