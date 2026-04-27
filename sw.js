// ══════════════════════════════════════════════════════════
//  sw.js — Service Worker для sun69wukong
//  Офлайн пуш-сповіщення про стріми
//  Версія: 1.3 (fix: SET_SCHEDULE delivery + IDB persistence)
// ══════════════════════════════════════════════════════════

const CACHE_NAME = 'sun69-v1';
const IDB_NAME   = 'sun69db';
const IDB_STORE  = 'state';

// Розклад зберігаємо і в пам'яті, і в IndexedDB
let SCHEDULE = [];

// ── IndexedDB helpers ──────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Встановлення SW ────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activated');
  event.waitUntil(
    self.clients.claim().then(() => {
      // Відновлюємо розклад з IndexedDB після перезапуску SW
      return restoreSchedule();
    })
  );
});

async function restoreSchedule() {
  try {
    const saved = await idbGet('schedule');
    if (saved && saved.length > 0) {
      SCHEDULE = saved;
      console.log('[SW] Schedule restored from IDB:', SCHEDULE.length, 'days');
      startPeriodicCheck();
    }
  } catch (e) {
    console.warn('[SW] Could not restore schedule:', e);
  }
}

// ── Повідомлення зі сторінки ───────────────────────────────
self.addEventListener('message', async event => {
  const { type } = event.data || {};

  if (type === 'SET_SCHEDULE') {
    SCHEDULE = event.data.schedule || [];
    console.log('[SW] Schedule received:', SCHEDULE.length, 'days');
    // Зберігаємо в IndexedDB щоб пережити перезапуск SW
    try { await idbSet('schedule', SCHEDULE); } catch (e) {}
    startPeriodicCheck();
    // Підтверджуємо отримання
    event.source?.postMessage({ type: 'SCHEDULE_OK' });
  }

  if (type === 'TEST_NOTIF') {
    showNotification('✅ Сповіщення увімкнені!', {
      body: 'Отримаєш пуш за 15 хв до стріму від sun69wukong 🔔',
      tag:  'test-notif'
    });
  }

  if (type === 'UNSUBSCRIBE') {
    stopPeriodicCheck();
    try { await idbSet('schedule', []); } catch (e) {}
  }
});

// ── Клік по сповіщенню ─────────────────────────────────────
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

// ══════════════════════════════════════════════════════════
//  ОФЛАЙН ПЕРЕВІРКА РОЗКЛАДУ
// ══════════════════════════════════════════════════════════
let checkTimer = null;

function startPeriodicCheck() {
  if (checkTimer) clearInterval(checkTimer); // скидаємо старий якщо є
  checkSchedule(); // одразу
  checkTimer = setInterval(checkSchedule, 60 * 1000);
  console.log('[SW] Periodic check started');
}

function stopPeriodicCheck() {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
}

async function checkSchedule() {
  if (!SCHEDULE || SCHEDULE.length === 0) return;

  const now    = new Date();
  const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const entry  = SCHEDULE[dayIdx];

  if (!entry || !entry.stream || !entry.time) return;

  const match = entry.time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return;

  const streamTime = new Date();
  streamTime.setHours(+match[1], +match[2], 0, 0);
  const diffMin = (streamTime - now) / 60000;

  const dateStr  = now.toDateString();
  const key15    = `shown15_${dateStr}`;
  const keyLive  = `shownLive_${dateStr}`;

  // Перевіряємо через IDB (переживає перезапуск SW)
  const already15   = await idbGet(key15).catch(() => null);
  const alreadyLive = await idbGet(keyLive).catch(() => null);

  // Пуш за 15 хвилин
  if (diffMin >= 14 && diffMin < 15 && !already15) {
    await idbSet(key15, '1').catch(() => {});
    showNotification('⚡ sun69wukong стрімить через 15 хв!', {
      body: `${entry.note ? entry.note + ' · ' : ''}Початок о ${entry.time}`,
      tag:  'stream-soon',
      data: { url: 'https://twitch.tv/sun69wukong' }
    });
  }

  // Пуш при старті
  if (diffMin >= -1 && diffMin < 0 && !alreadyLive) {
    await idbSet(keyLive, '1').catch(() => {});
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
