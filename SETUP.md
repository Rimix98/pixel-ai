# Pixel AI - Инструкция по настройке

## 1. Supabase

1. Перейдите на [supabase.com](https://supabase.com) и создайте новый проект
2. В разделе **Settings > API** скопируйте:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. В разделе **SQL Editor** выполните два скрипта:
   - Сначала `supabase/schema.sql` (таблицы conversations, messages)
   - Затем `supabase/profiles.sql` (таблица profiles + триггер)
4. **Google OAuth** (опционально):
   - Перейдите в **Authentication > Providers > Google**
   - Включите Google Provider
   - Вставьте `Client ID` и `Client Secret` из Google Cloud Console
   - Callback URL: `https://<your-project>.supabase.co/auth/v1/callback`

## 2. Groq API

1. Перейдите на [console.groq.com](https://console.groq.com)
2. Создайте аккаунт/войдите
3. Нажмите **Create API Key**
4. Скопируйте ключ → `GROQ_API_KEY`

## 3. Stripe

1. Перейдите на [dashboard.stripe.com](https://dashboard.stripe.com)
2. Создайте аккаунт/войдите
3. В разделе **Developers > API keys** скопируйте:
   - `Secret key` → `STRIPE_SECRET_KEY`
4. Создайте **Products**:
   - Перейдите в **Products > Add product**
   - **Pro Plan**: Name = "Pro", Price = 990 ₽/month
   - **Enterprise Plan**: Name = "Enterprise", Price = 4990 ₽/month
   - Скопируйте Price ID (начинается с `price_`) → `STRIPE_PRO_PRICE_ID` и `STRIPE_ENTERPRISE_PRICE_ID`
5. Настройте **Webhook**:
   - Перейдите в **Developers > Webhooks > Add endpoint**
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Скопируйте `Webhook signing secret` → `STRIPE_WEBHOOK_SECRET`
6. Настройте **Customer Portal**:
   - Перейдите в **Settings > Billing > Customer portal**
   - Включите доступ

## 4. Заполните .env.local

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Groq
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxxxxx

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 5. Запуск

```bash
npm run dev
```

Откройте http://localhost:3000

## Деплой на Vercel

1. Запушьте код в GitHub
2. Импортируйте проект в Vercel
3. Добавьте все переменные окружения в **Settings > Environment Variables**
4. Обновите `NEXT_PUBLIC_BASE_URL` на ваш домен Vercel
5. Деплой автоматически запустится

## Структура проекта

```
src/
├── app/
│   ├── (auth)/          # Страницы авторизации
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/     # Основной интерфейс
│   │   ├── chat/        # Чат со стримингом
│   │   ├── pricing/     # Тарифы
│   │   ├── settings/    # Настройки профиля
│   │   └── layout.tsx   # Layout с Sidebar + ConversationList
│   ├── api/
│   │   ├── auth/        # OAuth callback
│   │   ├── chat/        # Groq API прокси со стримингом
│   │   ├── conversations/ # CRUD диалогов
│   │   └── stripe/      # Checkout, Portal, Webhook
│   └── layout.tsx       # Root layout с ThemeProvider
├── components/
│   ├── layout/          # Sidebar, ConversationList
│   └── ui/              # Button, Card, Input (M3)
├── hooks/
│   └── useAuth.ts       # Хук авторизации
├── lib/
│   └── stripe.ts        # Stripe клиент и планы
├── messages/            # Переводы (ru.json, en.json)
├── utils/supabase/      # Supabase клиенты (browser/server)
└── proxy.ts             # Next.js 16 proxy (intl routing)
```

## API Endpoints

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/chat` | Стриминг ответа Groq + сохранение в БД |
| GET | `/api/conversations` | Список диалогов пользователя |
| POST | `/api/conversations` | Создать диалог |
| GET | `/api/conversations/[id]` | Сообщения диалога |
| PATCH | `/api/conversations/[id]` | Обновить диалог |
| DELETE | `/api/conversations/[id]` | Удалить диалог |
| POST | `/api/stripe/checkout` | Создать сессию оплаты |
| POST | `/api/stripe/portal` | Stripe Portal |
| POST | `/api/stripe/webhook` | Webhook Stripe |
