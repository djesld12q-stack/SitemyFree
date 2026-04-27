// ══════════════════════════════════════════════════════════
//  sw.js — Service Worker для sun69wukong
//  Офлайн пуш-сповіщення про стріми
//  Версія: 1.2
// ══════════════════════════════════════════════════════════

const CACHE_NAME  = 'sun69-v1';
const LS_KEY      = 'sun69_notif';

// Зберігаємо розклад, переданий зі сторінки
let SCHEDULE = [];

// ── Встановлення SW ──
self.addEventListener('install', event => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activated');
  event.waitUntil(self.clients.claim());
  // Запускаємо таймер перевірки розкладу
  startPeriodicCheck();
});

// ── Повідомлення зі сторінки ──
self.addEventListener('message', event => {
  const { type } = event.data || {};

  if (type === 'SET_SCHEDULE') {
    SCHEDULE = event.data.schedule || [];
    console.log('[SW] Schedule received:', SCHEDULE.length, 'days');
    startPeriodicCheck();
  }

  if (type === 'TEST_NOTIF') {
    showNotification('✅ Сповіщення увімкнені!', {
      body: 'Отримаєш пуш за 15 хв до стріму від sun69wukong 🔔',
      tag:  'test-notif'
    });
  }

  if (type === 'UNSUBSCRIBE') {
    stopPeriodicCheck();
  }
});

// ── Клік по сповіщенню ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('sun69') || client.url.includes('schedule')) {
          return client.focus();
        }
      }
      return clients.openWindow('https://twitch.tv/sun69wukong');
    })
  );
});

// ══════════════════════════════════════
//  ОФЛАЙН ПЕРЕВІРКА РОЗКЛАДУ
//  Service Worker живе у фоні навіть
//  коли сторінка закрита (поки браузер
//  відкритий або є у фоні на мобільному)
// ══════════════════════════════════════
let checkTimer = null;
const shownKeys = new Set();

function startPeriodicCheck() {
  if (checkTimer) return;
  // Перевіряємо кожні 60 секунд
  checkTimer = setInterval(checkSchedule, 60 * 1000);
  checkSchedule(); // Одразу при запуску
  console.log('[SW] Periodic check started');
}

function stopPeriodicCheck() {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
}

async function isSubscribed() {
  // Перевіряємо через IndexedDB або повідомлення клієнта
  const allClients = await clients.matchAll();
  // Якщо є відкрита вкладка — довіряємо її стану
  // Якщо немає — використовуємо кешований стан
  return true; // SW реєструється тільки при підписці
}

function checkSchedule() {
  if (SCHEDULE.length === 0) return;

  const now      = new Date();
  const dayIdx   = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const entry    = SCHEDULE[dayIdx];

  if (!entry || !entry.stream || !entry.time) return;

  const match = entry.time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return;

  const streamTime = new Date();
  streamTime.setHours(+match[1], +match[2], 0, 0);
  const diffMin = (streamTime - now) / 60000;

  const dateStr      = now.toDateString();
  const key15        = `15_${dateStr}`;
  const keyLive      = `live_${dateStr}`;

  // Пуш за 15 хвилин
  if (diffMin >= 14 && diffMin < 15 && !shownKeys.has(key15)) {
    shownKeys.add(key15);
    showNotification('⚡ sun69wukong стрімить через 15 хв!', {
      body: `${entry.note ? entry.note + ' · ' : ''}Початок о ${entry.time}`,
      tag:  'stream-soon',
      data: { url: 'https://twitch.tv/sun69wukong' }
    });
  }

  // Пуш при старті
  if (diffMin >= -1 && diffMin < 0 && !shownKeys.has(keyLive)) {
    shownKeys.add(keyLive);
    showNotification('🔴 sun69wukong LIVE зараз!', {
      body: `${entry.note ? entry.note + ' · ' : ''}Стрім вже йде! Заходь!`,
      tag:  'stream-live',
      data: { url: 'https://twitch.tv/sun69wukong' }
    });
  }
}

function showNotification(title, options = {}) {
  self.registration.showNotification(title, {
    icon:    './favicon.ico',
    badge:   './favicon.ico',
    vibrate: [200, 100, 200],
    ...options
  });
}
