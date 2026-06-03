// ─────────────────────────────────────────────────────────
// js/components.js — Reusable UI primitives
// ─────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  Loader2, Sun, Moon, Languages, Check, Bell, BellOff,
} from 'lucide-react';
import { cn, initials, colorFor, avatarBg, audioNotification, systemNotification } from './utils.js';
import { usePrefs } from './contexts.js';

const h = React.createElement;

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ className }) {
  return h(Loader2, { className: cn('animate-spin', className) });
}

// ── Button ────────────────────────────────────────────────
const VARIANTS = {
  primary:  'bg-accent hover:bg-accentH text-white font-semibold',
  secondary:'bg-elev hover:bg-sunken text-ctext border border-edge',
  ghost:    'hover:bg-elev text-ctext',
  danger:   'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30',
  outline:  'border border-edge hover:bg-elev text-ctext',
};
const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2  text-sm rounded-md',
  lg: 'px-5 py-2.5 text-sm rounded-lg',
};

export function Button({ children, variant = 'primary', size = 'md', className, ...rest }) {
  return h(
    'button',
    {
      className: cn(
        'inline-flex items-center gap-2 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant], SIZES[size], className,
      ),
      ...rest,
    },
    children,
  );
}

// ── Form controls ─────────────────────────────────────────
const fieldBase =
  'w-full bg-surface border border-edge rounded-md px-3 py-2 text-sm text-ctext ' +
  'placeholder:text-ctext3 focus:outline-none focus:border-accent transition-colors';

export function Input({ className, ...rest }) {
  return h('input', { className: cn(fieldBase, className), ...rest });
}
export function Textarea({ className, ...rest }) {
  return h('textarea', { className: cn(fieldBase, 'resize-none', className), ...rest });
}
export function Select({ className, children, ...rest }) {
  return h('select', { className: cn(fieldBase, className), ...rest }, children);
}
export function Label({ children, className }) {
  return h(
    'label',
    { className: cn('block text-[11px] uppercase tracking-widest text-ctext3 mb-1.5 font-semibold', className) },
    children,
  );
}

// ── Badge ─────────────────────────────────────────────────
const BADGE_VARIANTS = {
  default:  'bg-sunken text-ctext2 border-edge',
  ember:    'bg-accent/15 text-accent border-accent/30',
  leader:   'bg-violet-500/15 text-violet-500 border-violet-500/30',
  worker:   'bg-sky-500/15 text-sky-500 border-sky-500/30',
  pending:  'bg-amber-500/15 text-amber-500 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
};

export function Badge({ children, variant = 'default', className }) {
  return h(
    'span',
    {
      className: cn(
        'inline-flex items-center gap-1 text-[10px] uppercase tracking-wider',
        'px-2 py-0.5 rounded border font-semibold',
        BADGE_VARIANTS[variant], className,
      ),
    },
    children,
  );
}

// ── Avatar ────────────────────────────────────────────────
const AVATAR_SIZES = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

export function Avatar({ user, size = 'md' }) {
  const color = colorFor(user?.id || user?.username || 'x');
  return h(
    'div',
    {
      className: cn(
        'rounded-full inline-flex items-center justify-center font-bold flex-shrink-0',
        AVATAR_SIZES[size], avatarBg[color],
      ),
      title: user?.full_name || user?.username,
    },
    initials(user?.full_name || user?.username),
  );
}

// ── Modal ─────────────────────────────────────────────────
const MODAL_SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return h(
    'div',
    {
      className: 'fixed inset-0 z-50 bg-base/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto',
      onClick: onClose,
    },
    h(
      'div',
      {
        className: cn(
          'w-full bg-surface border border-edge rounded-xl shadow-2xl mt-16 fade-up',
          MODAL_SIZES[size],
        ),
        onClick: (e) => e.stopPropagation(),
      },
      children,
    ),
  );
}

// ── LogoMark ──────────────────────────────────────────────
// Alcopoint-Task logosu: logo.png faylını göstərir.
export function LogoMark({ size = 'md' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const inner = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  if (!imgFailed) {
    return h(
      'div',
      { className: cn(dim, 'flex-shrink-0 rounded-lg overflow-hidden') },
      h('img', {
        src: 'logo.png',
        alt: 'Alcopoint-Task',
        className: 'logo-img w-full h-full object-cover',
        onError: () => setImgFailed(true),
      }),
    );
  }

  // Fallback geometric mark
  return h(
    'div',
    { className: cn(dim, 'bg-accent rounded-lg flex items-center justify-center flex-shrink-0') },
    h('div', { className: cn(inner, 'bg-base rounded-sm') }),
  );
}

// ── PrefsToggle (theme + language + sound toggle) ─────────
export function PrefsToggle() {
  const { theme, setTheme, lang, setLang, t } = usePrefs();
  const [open, setOpen] = useState(false);

  // Səs vəziyyəti — localStorage-dən başlangıc dəyərini oxu
  const [soundEnabled, setSoundEnabled] = useState(() => audioNotification.isSoundEnabled());

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    setTimeout(() => document.addEventListener('click', close), 0);
    return () => document.removeEventListener('click', close);
  }, [open]);

  // İlk render-da brauzerdən notification icazəsi tələb et
  useEffect(() => {
    systemNotification.requestPermission();
  }, []);

  const toggleSound = (e) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioNotification.setSoundEnabled(next);
  };

  return h(
    'div',
    { className: 'flex items-center gap-0.5' },

    // ── Səs keçidi ──────────────────────────────────────
    h(
      'button',
      {
        onClick: toggleSound,
        className: cn(
          'p-1.5 rounded-md hover:bg-elev transition-colors',
          soundEnabled ? 'text-accent' : 'text-ctext3',
        ),
        title: soundEnabled ? 'Səsi söndür' : 'Səsi aç',
      },
      soundEnabled
        ? h(Bell,    { className: 'w-4 h-4' })
        : h(BellOff, { className: 'w-4 h-4' }),
    ),

    // ── Mövzu keçidi ────────────────────────────────────
    h(
      'button',
      {
        onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
        className: 'p-1.5 rounded-md hover:bg-elev text-ctext2 hover:text-ctext transition-colors',
        title: theme === 'dark' ? t('light') : t('dark'),
      },
      theme === 'dark'
        ? h(Sun,  { className: 'w-4 h-4' })
        : h(Moon, { className: 'w-4 h-4' }),
    ),

    // ── Dil seçimi ──────────────────────────────────────
    h(
      'div',
      { className: 'relative' },
      h(
        'button',
        {
          onClick: (e) => { e.stopPropagation(); setOpen(!open); },
          className: 'p-1.5 rounded-md hover:bg-elev text-ctext2 hover:text-ctext flex items-center gap-0.5 transition-colors',
          title: 'Language',
        },
        h(Languages, { className: 'w-4 h-4' }),
        h('span', { className: 'text-[10px] font-mono uppercase ml-0.5' }, lang),
      ),
      open && h(
        'div',
        { className: 'absolute right-0 top-full mt-1 bg-surface border border-edge rounded-lg shadow-xl z-50 min-w-[150px] overflow-hidden' },
        ['az', 'en'].map(L =>
          h(
            'button',
            {
              key: L,
              onClick: () => { setLang(L); setOpen(false); },
              className: cn(
                'w-full text-left px-4 py-2.5 text-sm hover:bg-elev flex items-center justify-between transition-colors',
                lang === L && 'text-accent',
              ),
            },
            t('lang_' + L),
            lang === L && h(Check, { className: 'w-3.5 h-3.5' }),
          )
        ),
      ),
    ),
  );
}
