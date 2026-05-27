# 🔐 Twitch Auth — Інструкція налаштування

## Крок 1 — Зареєструй Twitch App

1. Зайди на https://dev.twitch.tv/console
2. Клікни **"Register Your Application"**
3. Заповни:
   - **Name**: SunWukong Site (або будь-яке)
   - **OAuth Redirect URLs**: 
     ```
     https://djesld12q-stack.github.io/sunwukong/twitch-callback.html
     ```
     *(замінити `djesld12q-stack` та `sunwukong` на свій GitHub username і назву репо)*
   - **Category**: Website Integration
4. Клікни **Create**
5. Скопіюй **Client ID**

---

## Крок 2 — Встав Client ID у `twitch-auth.js`

Відкрий `twitch-auth.js`, знайди рядок:
```js
clientId: 'YOUR_TWITCH_CLIENT_ID',
```
І замінити на свій Client ID, наприклад:
```js
clientId: 'abc123xyz456',
```

---

## Крок 3 — Перевір Redirect URI

У `twitch-auth.js` рядок `redirectUri` будується автоматично. Але переконайся що URL збігається з тим що ти вказав на dev.twitch.tv.

Якщо сайт на `https://djesld12q-stack.github.io/sunwukong/` — все має працювати автоматично.

---

## Крок 4 — Пуш на GitHub

Додай файли до репозиторію:
- `twitch-auth.js`
- `twitch-callback.html`
- оновлений `scripts.html`

---

## Як це працює

1. Хтось заходить на `scripts.html`
2. Сторінка одразу прихована (`visibility: hidden`)
3. Якщо немає сесії — показується екран "🔒 ДОСТУП ЗАКРИТО" з кнопкою входу
4. При кліку — редірект на Twitch OAuth
5. Після входу Twitch повертає на `twitch-callback.html` з токеном
6. Callback перевіряє логін через Twitch API
7. Якщо логін = `sun69wukong` → зберігається сесія, редірект назад на `scripts.html`
8. Якщо інший логін → "🚫 НЕМАЄ ДОСТУПУ", через 3 секунди повертає на головну

## ⚠️ Важливо

Сесія зберігається в `sessionStorage` — тобто закрив вкладку → треба входити знову.
Це нормально для client-side auth на статичному сайті.

