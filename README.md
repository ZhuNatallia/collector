# AI-комплектатор интерьеров (MVP)

Русскоязычная рабочая область: загрузка изображения, интерактивные метки распознавания, подбор товаров по трём бюджетам, ведомость, наценка и экспорт. В каталоге есть вручную сверенные карточки мебели, светильников, ковров, текстиля и декора с российских и белорусских сайтов (в том числе Hoff, Divan.ru, Maytoni, БелКа, La Prima, Textile Home, Витебские ковры и 3D Dom). Цены сверены 20.11.2026 и указаны в валюте магазина.

## Разработка

```bash
npm install
npx next dev
```

## Распознавание интерьера

Фронтенд остаётся статическим. Для локальной демонстрации задайте `NEXT_PUBLIC_INTERIOR_AI_MOCK=true` в `.env.local` и перезапустите Next.js. Появятся демонстрационные метки и товары. Этот режим работает без Supabase и Replicate. По умолчанию распознавание выключено.

### Развёртывание через Supabase Dashboard

1. В существующем проекте откройте **Authentication → Users**. Подготовьте пользователя с подтверждённым email и паролем, затем скопируйте его UUID.
2. В **Edge Functions → Secrets** добавьте `INTERIOR_AI_USER_IDS` (разрешённые UUID через запятую), `INTERIOR_APP_ORIGINS` (origin фронтенда через запятую, с протоколом и без завершающего слеша), и для первой бесплатной проверки — `INTERIOR_AI_MODE=mock`. `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` предоставляет среда выполнения Supabase.
3. Откройте **Edge Functions → Deploy a new function → Via Editor**. Укажите имя `interior-ai` и вставьте содержимое `supabase/functions/interior-ai/index.ts` в `index.ts`. Нажмите **Deploy function**. В настройках функции отключите **Verify JWT with legacy secret**. Настройки локального `supabase/config.toml` при вставке в редактор не переносятся. Обработчик сам проверяет пользовательский access token через Supabase Auth и сверяет UUID со списком доступа.

[Инструкция Supabase по редактору Dashboard](https://supabase.com/docs/guides/functions/quickstart-dashboard)

### Бесплатная проверка после развёртывания

Оставьте `INTERIOR_AI_MODE=mock` и пока не добавляйте `REPLICATE_API_TOKEN`. Задайте публичные параметры статики и пересоберите фронтенд. Локальный mock-флаг должен отсутствовать или иметь значение `false`, чтобы браузер действительно вызвал Edge Function.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PUBLIC_KEY
NEXT_PUBLIC_INTERIOR_AI=true
NEXT_PUBLIC_INTERIOR_AI_MOCK=false
```

Войдите по email и паролю, загрузите JPEG и проверьте запрос `POST /functions/v1/interior-ai` в браузере. Ожидается HTTP 200, `source: "mock"` и одна условная метка с `confidence: null`. Интерфейс показывает «Серверный демо-режим». ID prediction отсутствует. Для проверки CORS добавьте origin, с которого открыли фронтенд, например `http://localhost:3000`.

### Реальное распознавание и каталог

После бесплатной проверки добавьте `REPLICATE_API_TOKEN` только в Edge Function Secrets. Пока действует `INTERIOR_AI_MODE=mock`, функция продолжает возвращать демо-результат. Для включения реальных запросов удалите этот секрет режима. Следующая загрузка фото вошедшим пользователем запустит платный вызов. `npm run build` создаёт статический каталог `out/`.

Grounding DINO закреплён на версии `efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa`. Параметры `image` и `query` обязательны для этого приложения. `box_threshold` и `text_threshold` заданы как `0.25`, `show_visualisation` — `false`. Формат bbox и ответа описан в `app/api-contract.md`.

[Карточка и API Grounding DINO на Replicate](https://replicate.com/adirik/grounding-dino/api)

Для распознавания достаточно настроить функцию и Auth. Для CLIP-поиска в существующей базе с базовой схемой примените `supabase/migrations/20261122210000_clip_catalog.sql` через **SQL Editor**. Для пустой базы сначала нужна `supabase/schema.sql`. Миграция добавляет `embedding_clip vector(768)`, функции поиска и приватный bucket для временных crop. Без CLIP-векторов интерфейс показывает статус индекса. Импорт поставщика не запускает индексацию.
