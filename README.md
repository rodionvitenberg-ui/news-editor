# Редактор новостных статей (News Editor)

Полноценный редактор новостных статей с JWT-авторизацией, блочным редактором (текст, картинки, цитаты, код, файлы), отложенной публикацией, загрузкой файлов и real-time уведомлениями.

Стек: Node.js (Express) + MongoDB Atlas + Socket.io · Next.js (App Router) + TypeScript + SCSS

---

## Возможности

- Авторизация: регистрация и вход, JWT (из токена достаётся id пользователя), bcrypt-хеширование паролей.
- Middleware проверки валидного JWT для всех protected-маршрутов.
- Новости: создание, редактирование, удаление, публикация сейчас или по заданной дате (отложенная публикация).
- Блочный редактор: абзацы/H1/H2/жирный/курсив, картинки, цитаты, куски кода с выбором языка, файлы (pdf, doc и т.п.).
- Предпросмотр статьи до публикации.
- Загрузка файлов с клиента (multer) и раздача статики.
- Real-time уведомления: колокольчик в шапке, события при создании/изменении/удалении новостей.

---

## Архитектура

Проект — monorepo из двух приложений:

```
news-editor/
├── backend/      # REST API: Express + MongoDB (Mongoose) + Socket.io
└── frontend/     # SPA: Next.js (App Router) + TypeScript + SCSS
```

Браузер общается с API по HTTP (REST) и по WebSocket (Socket.io) — соединение для уведомлений.

### Структура backend

```
backend/
├── src/
│   ├── server.js            # точка входа: dotenv → createApp → connectDB → initIO → listen
│   ├── app.js               # Express: middleware, CORS, маршруты, 404, error handler
│   ├── config/
│   │   ├── db.js            # подключение к MongoDB (mongoose.connect)
│   │   └── upload.js        # multer: место хранения, фильтр типов, лимит 5 МБ
│   ├── models/
│   │   ├── User.js          # email + passwordHash (bcrypt)
│   │   └── News.js          # title + blocks[] + author + status + publishAt
│   ├── routes/
│   │   ├── auth.routes.js   # /api/auth/register, /login, /me
│   │   ├── news.routes.js   # /api/news CRUD (все под authMiddleware)
│   │   └── upload.routes.js # /api/upload (под authMiddleware)
│   ├── controllers/
│   │   ├── auth.controller.js   # register, login, getMe
│   │   ├── news.controller.js   # CRUD + публикация + emit Socket.io
│   │   └── upload.controller.js # ответ { url, name, size, mimetype }
│   ├── middleware/
│   │   └── auth.middleware.js   # проверка JWT (Bearer-токен) → req.user
│   └── utils/
│       └── socket.js        # синглтон Socket.io: initIO(server), getIO()
└── uploads/                 # загруженные файлы (раздаются как статика)
```

### Структура frontend

```
frontend/
├── src/
│   ├── app/                 # страницы App Router: /, /login, /register, /editor, /news/[id]
│   ├── api/client.ts        # axios-инстанс с автоматической подстановкой JWT
│   ├── components/
│   │   ├── Navigation.tsx   # шапка: лого, ссылки, колокольчик, профиль
│   │   ├── editor/          # Editor, Toolbar, BlockEditor, BlockPreview, UploadButton, blocks/*
│   │   └── notifications/   # NotificationsProvider (socket.io-client) + Bell
│   ├── context/AuthContext.tsx  # авторизация: user, token, login/register/logout
│   ├── styles/              # SCSS: _variables, _base, _components, main
│   └── types/api.ts         # TypeScript-типы, зеркалящие ответы API
├── .env.example
└── package.json
```

---

## Модель данных

### User

```js
{
  email: String,          // уникальный, lowercase
  passwordHash: String,   // bcrypt, скрыт select:false
  createdAt, updatedAt    // timestamps
}
```

### News

```js
{
  title: String,
  blocks: [
    { type: 'text',  text, style: 'paragraph|h1|h2|bold|italic' },
    { type: 'image', url, caption },
    { type: 'quote', text, author },
    { type: 'code',  code, language },
    { type: 'file',  url, name, size }
  ],
  author: ObjectId(реф User),
  status: 'draft' | 'published',
  publishAt: Date,
  createdAt, updatedAt
}
```

### Отложенная публикация — данные, а не таймер

Статья со status: 'draft' и publishAt в будущем становится публичной в момент запроса: список читает только те новости, где status === 'published' и publishAt <= now. Никаких фоновых таймеров — публикация переживает рестарты сервера.

### JWT-поток

1. POST /api/auth/login (или /register) — сервер создаёт JWT с { userId, iat, exp }, подписанный секретом JWT_SECRET.
2. Клиент хранит токен в localStorage (winbd_token).
3. axios-интерцептор добавляет Authorization: Bearer token к каждому запросу.
4. authMiddleware проверяет подпись и кладёт req.user = payload, из которого берётся userId.

---

## API

Базовый URL: http://localhost:5000 (в dev).

### Auth

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| POST | /api/auth/register | публичный | Регистрация: { email, password } → { user, token } |
| POST | /api/auth/login | публичный | Вход → { user, token } |
| GET | /api/auth/me | токен | Данные текущего пользователя |

### News

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| GET | /api/news | токен | Публичный список опубликованных (пагинация ?page=&limit=) |
| GET | /api/news?all=1 | токен | Все СВОИ новости (черновики + опубликованные) |
| POST | /api/news | токен | Создать: { title, blocks?, publishNow?, publishAt? } |
| GET | /api/news/:id | токен | Одна новость (автор видит черновик) |
| PUT | /api/news/:id | автор | Обновить (в т.ч. publishNow/publishAt) |
| DELETE | /api/news/:id | автор | Удалить |

### Upload

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| POST | /api/upload | токен | multipart/form-data, поле file → { url, name, size, mimetype } |

Раздача статики: GET /uploads/файл (публично).

### Примеры (curl)

```bash
# Регистрация
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'

# Вход
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'

# Создать и сразу опубликовать
curl -X POST http://localhost:5000/api/news \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Первая","publishNow":true,"blocks":[{"type":"text","text":"Привет","style":"paragraph"}]}'

# Отложить публикацию на час
curl -X POST http://localhost:5000/api/news \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Позже","publishAt":"2026-08-13T20:00:00Z"}'

# Загрузка файла
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@photo.jpg"
```

---

## Запуск проекта локально

Требования: Node.js 18+ и npm. Для MongoDB нужен кластер Atlas (бесплатный M0) или локальная MongoDB.

### 1. Backend

```bash
cd backend
npm install

# Создай файл .env из шаблона:
cp .env.example .env
# и заполни:
#   PORT=5000
#   MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/db?retryWrites=true&w=majority
#   JWT_SECRET=длинная_случайная_строка
#   JWT_EXPIRES_IN=7d
#   CORS_ORIGIN=http://localhost:3000

npm run dev
```

После запуска в консоли:
```
MongoDB подключена: адрес...
API сервер запущен: http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install

# Создай .env.local из шаблона:
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:5000

npm run dev
```

Открой http://localhost:3000 — регистрируйся, создавай новости, смотри колокольчик.

### Проверка E2E-сценария руками

1. Открой приложение, зарегистрируйся.
2. Новая статья — добавь блок Текст (например, H1), Картинку, Цитату, Код, Файл. Включи Предпросмотр. Опубликуй.
3. Во второй вкладке открой главную: опубликованная новость видна. Открой новость — все блоки отображаются.
4. В первом окне измени/удали новость — во втором окне увидишь уведомление в колокольчике.

---

## Тестирование API (кратко)

Пока сервер запущен, в отдельном терминале:

```bash
# 1. health
curl http://localhost:5000/api/health

# 2. регистрация (запомни token из ответа)
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"secret123"}'

# 3. защищённый маршрут без токена → 401
curl http://localhost:5000/api/auth/me
```

---

## Деплой

### Backend (Render / Railway / Fly.io)

Не используй Vercel для backend — он не поддерживает постоянные WebSocket-соединения (Socket.io).

1. Создай аккаунт на render.com (или railway.app / fly.io).
2. Импортируй этот репозиторий, Root Directory: backend.
3. Build Command: npm install.
4. Start Command: npm start.
5. Environment Variables:
   - PORT (Render задаёт сам)
   - MONGO_URI (свой из Atlas)
   - JWT_SECRET (надёжная случайная строка)
   - JWT_EXPIRES_IN=7d
   - CORS_ORIGIN=URL фронтенда на Vercel
6. Деплой — получишь URL вида your-api.onrender.com.

### Frontend (Vercel)

1. vercel.com → Import Repository.
2. Root Directory: frontend, Framework: Next.js.
3. Environment Variable: NEXT_PUBLIC_API_URL=https://your-api.onrender.com.
4. Deploy → URL вида your-app.vercel.app.

После деплоя обнови CORS_ORIGIN на backend, указав URL Vercel.

---

## Real-time: схема событий

| Событие | Когда | Полезная нагрузка |
|---------|-------|-------------------|
| news:created | создана новость | { id, title, status } |
| news:updated | изменена новость | { id, title, status } |
| news:deleted | удалена новость | { id, title } |

Клиент подключается к socket.io-client один раз (NotificationsProvider) и слушает эти события.

---

## Лицензия

MIT
