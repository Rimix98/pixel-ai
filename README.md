# Pixel AI

Персональный AI-ассистент с чатом, генерацией изображений, кода и оплатой через TON.

## Стек

- **Frontend:** Next.js 16 / React 19 / TypeScript / Tailwind CSS 4
- **Backend:** Next.js API Routes / SQLite (better-sqlite3)
- **LLM:** Groq API (Llama 3.3 70B)
- **Оплата:** TON blockchain
- **Auth:** JWT (jose) + httpOnly cookies
- **UI:** Material Design 3 tokens / Radix UI / Lucide icons

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # заполни переменные
npm run dev
```

Открой http://localhost:3000

## Команды

```bash
npm run dev       # dev-сервер на :3000
npm run build     # production-сборка (+ type-check)
npm run lint      # eslint
```

## Переменные окружения

| Переменная | Обязательность | Описание |
|---|---|---|
| `JWT_SECRET` | Required | Секрет для JWT-токенов (минимум 32 символа) |
| `OLLAMA_URL` | Required | URL LLM API (OpenAI-совместимый) |
| `OLLAMA_API_KEY` | Required | API-ключ |
| `NEXT_PUBLIC_BASE_URL` | Required | Базовый URL приложения |
| `TON_WALLET_ADDRESS` | Required | Адрес TON-кошелька для оплаты |
| `TON_PRO_AMOUNT` | Required | Стоимость Pro-тарифа в TON |
| `TON_MAX_AMOUNT` | Required | Стоимость Max-тарифа в TON |
| `TAVILY_API_KEY` | Optional | API-ключ для поиска в интернете |

## Структура проекта

```
src/
├── app/
│   ├── (auth)/              # Login, Register, Onboarding
│   ├── (dashboard)/         # Chat, Projects, Artifacts, Design, Code, Settings, Pricing
│   └── api/                 # REST API routes
├── components/
│   ├── layout/              # Sidebar
│   └── ui/                  # Button, Card, Input
├── hooks/useAuth.ts         # Auth hook
├── lib/
│   ├── auth.ts              # JWT session management
│   ├── db.ts                # SQLite + Supabase-compatible query builder
│   ├── ton.ts               # TON payment utilities
│   ├── search.ts            # Tavily web search
│   └── rate-limit.ts        # In-memory rate limiter
└── messages/                # i18n (ru.json, en.json)
```

## API

| Метод | Эндпоинт | Описание |
|--------|-----------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/auth/me` | Текущий пользователь |
| POST | `/api/chat` | Стриминг AI-ответа (SSE) |
| GET | `/api/conversations` | Список чатов |
| POST | `/api/conversations` | Создать чат |
| GET/PATCH/DELETE | `/api/conversations/[id]` | Управление чатом |
| POST | `/api/ton/checkout` | Создать платёж TON |
| GET | `/api/ton/status/[comment]` | Статус оплаты |
| GET | `/api/health` | Health check |

## Тарифы

| Тариф | Лимит в час | Лимит в неделю | Модель |
|-------|-------------|----------------|--------|
| Free | 15 | 300 | gemma4:31b |
| Pro | 30 | ∞ | qwen3-coder-next |
| Max | ∞ | ∞ | nemotron-3-super |

## Деплой на Vercel

1. Запушьте код в GitHub
2. Импортируйте проект в [Vercel](https://vercel.com/new)
3. Добавьте переменные окружения в **Settings > Environment Variables**
4. Обновите `NEXT_PUBLIC_BASE_URL` на ваш домен
5. Деплой запустится автоматически

> **Важно:** SQLite работает в Vercel через writable tmp-filesystem. Данные сбрасываются при холодных стартах. Для persistent storage рассмотрите PostgreSQL.

## Лицензия

Private
