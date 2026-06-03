// ─────────────────────────────────────────────────────────
// js/utils.js — Pure utility functions + Notification System
// ─────────────────────────────────────────────────────────
import React from 'react';

/** Classname merger */
export const cn = (...classes) => classes.filter(Boolean).join(' ');

/** Random 6-char team code */
export const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

/** Format date for display — GG.AA.İL */
export const formatDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  const day   = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year  = date.getFullYear();
  return `${day}.${month}.${year}`;
};

/** Format datetime for display — GG.AA.İL SS:DD */
export const formatDateTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const day   = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year  = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins  = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${mins}`;
};

/** Initials from full name */
export const initials = (name) =>
  (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

/** Deterministic colour bucket from any string ID */
export const colorFor = (id) => {
  const palette = ['ember', 'emerald', 'sky', 'violet', 'rose', 'cyan'];
  const idx = (id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  return palette[idx];
};

/** Tailwind background + text classes per colour bucket */
export const avatarBg = {
  ember:   'bg-orange-500 text-white',
  emerald: 'bg-emerald-600 text-white',
  sky:     'bg-sky-600 text-white',
  violet:  'bg-violet-600 text-white',
  rose:    'bg-rose-600 text-white',
  cyan:    'bg-cyan-600 text-white',
};

/** Format seconds → "2h 15m" */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
};

/** Extract mentioned user IDs from comment text */
export const parseMentions = (text, members) => {
  const ids = [];
  const re = /@(\w+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const u = members.find(mb => mb.username === m[1]);
    if (u && !ids.includes(u.id)) ids.push(u.id);
  }
  return ids;
};

/** Render comment text with @mention spans highlighted */
export const renderWithMentions = (text, members) => {
  const parts = [];
  const re = /(@\w+)/g;
  let lastIdx = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const uname = m[0].slice(1);
    const u = members.find(mb => mb.username === uname);
    parts.push(
      u
        ? React.createElement('span', { key: m.index, className: 'mention' }, m[0])
        : m[0]
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
};

// ─────────────────────────────────────────────────────────
// 🔔 AUDIO NOTIFICATION SYSTEM
// localStorage key: 'alcopoint_sound_enabled' ('true' | 'false')
// ─────────────────────────────────────────────────────────

/**
 * Pulsuz, açıq mənbəli .mp3 linkləri (freesound.org / mixkit.co).
 * CDN üzərindən birbaşa yüklənir — heç bir quraşdırma tələb olunmur.
 */
const SOUND_URLS = {
  // Tapşırıq tamamlandı (Done statusu)
  taskDone:    'https://assets.mixkit.co/active_storage/sfx/2018/2018.wav',
  // Yeni tapşırıq yaradıldı
  taskCreated: 'https://assets.mixkit.co/active_storage/sfx/2869/2869.wav',
  // Xəbərdarlıq / diqqət (approval, urgent)
  warning:     'https://assets.mixkit.co/active_storage/sfx/2869/2869.wav',
};

/** Audio cache — hər URL üçün tək bir Audio nümunəsi saxlayır */
const _audioCache = {};

/**
 * audioNotification — Səs bildirişlərini idarə edən obyekt.
 *
 * İstifadə:
 *   audioNotification.play('taskDone');
 *   audioNotification.setSoundEnabled(false);
 *   audioNotification.isSoundEnabled(); // → true/false
 */
export const audioNotification = {
  /** Səsin aktiv/deaktiv vəziyyətini localStorage-dən oxu */
  isSoundEnabled() {
    const stored = localStorage.getItem('alcopoint_sound_enabled');
    return stored === null ? true : stored === 'true';
  },

  /** Səs vəziyyətini dəyiş və localStorage-ə yaz */
  setSoundEnabled(enabled) {
    localStorage.setItem('alcopoint_sound_enabled', String(Boolean(enabled)));
  },

  /**
   * Müəyyən bir səsi çal.
   * @param {'taskDone'|'taskCreated'|'warning'} type
   */
  async play(type) {
    if (!this.isSoundEnabled()) return;
    const url = SOUND_URLS[type];
    if (!url) return;

    try {
      // Cache-dən mövcud Audio nümunəsini götür və ya yenisini yarat
      if (!_audioCache[type]) {
        _audioCache[type] = new Audio(url);
        _audioCache[type].volume = 0.55;
      }
      const audio = _audioCache[type];
      // Əvvəlki çalınmanı sıfırla (sürətli ardıcıl çağırışlar üçün)
      audio.currentTime = 0;
      await audio.play();
    } catch (err) {
      // Brauzerin autoplay siyasəti blok edə bilər — susqun idarə et
      console.warn('[Alcopoint] Audio play blocked:', err.message);
    }
  },
};

// ─────────────────────────────────────────────────────────
// 🖥️  SYSTEM (PUSH) NOTIFICATION
// ─────────────────────────────────────────────────────────

/**
 * systemNotification — Brauzerin Notification API-sindən istifadə edən obyekt.
 *
 * İstifadə:
 *   await systemNotification.requestPermission();
 *   systemNotification.send({ title: 'Tapşırıq tamamlandı', body: 'Design Review ✓' });
 */
export const systemNotification = {
  /** İcazə vəziyyətini yoxla */
  isSupported() {
    return 'Notification' in window;
  },

  isGranted() {
    return this.isSupported() && Notification.permission === 'granted';
  },

  /** Brauzerdən icazə tələb et (yalnız bir dəfə soruşulur) */
  async requestPermission() {
    if (!this.isSupported()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  /**
   * Bildiriş göndər.
   * @param {{ title: string, body?: string, icon?: string, tag?: string }} options
   */
  send({ title, body = '', icon = 'logo.png', tag = 'alcopoint' } = {}) {
    if (!this.isGranted()) return;
    try {
      const notif = new Notification(title, { body, icon, tag, silent: false });
      // 6 saniyə sonra avtomatik bağla
      setTimeout(() => notif.close(), 6000);
    } catch (err) {
      console.warn('[Alcopoint] Notification send failed:', err.message);
    }
  },
};

// ─────────────────────────────────────────────────────────
// 🎯 Yüksək Səviyyəli Köməkçi Funksiyalar
// (components.js / team.js-dən birbaşa çağırılır)
// ─────────────────────────────────────────────────────────

/**
 * Yeni tapşırıq yaradıldıqda çağırılır.
 * @param {string} taskTitle
 */
export async function notifyTaskCreated(taskTitle) {
  audioNotification.play('taskCreated');
  systemNotification.send({
    title: '📋 Yeni tapşırıq yaradıldı',
    body:  taskTitle,
    tag:   'task-created',
  });
}

/**
 * Tapşırıq "Done" statusuna keçdikdə çağırılır.
 * @param {string} taskTitle
 */
export async function notifyTaskDone(taskTitle) {
  audioNotification.play('taskDone');
  systemNotification.send({
    title: '✅ Tapşırıq tamamlandı',
    body:  taskTitle,
    tag:   'task-done',
  });
}

/**
 * Xəbərdarlıq/diqqət tələb edən hallarda çağırılır (approval, urgent).
 * @param {string} message
 */
export async function notifyWarning(message) {
  audioNotification.play('warning');
  systemNotification.send({
    title: '⚠️ Xəbərdarlıq',
    body:  message,
    tag:   'task-warning',
  });
}
