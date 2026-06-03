// =============================================
// ALCOPOINT TASK — SABİTLƏR
// =============================================

import { Prioritet, Status, NotifikasiyaTip } from './types'

export const PRIORITET_LABELS: Record<Prioritet, string> = {
  asagi: 'Aşağı',
  orta: 'Orta',
  yuksek: 'Yüksək',
}

export const STATUS_LABELS: Record<Status, string> = {
  gozleyir: 'Gözləyir',
  icra_olunur: 'İcra olunur',
  tamamlanib: 'Tamamlanıb',
}

export const NOTIFIKASIYA_LABELS: Record<NotifikasiyaTip, string> = {
  yeni_tapsirig: 'Yeni tapşırıq təyin edildi',
  status_deyisdi: 'Tapşırıq statusu dəyişdi',
  yeni_serh: 'Yeni şərh əlavə edildi',
}

export const PRIORITET_COLORS: Record<Prioritet, string> = {
  asagi: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  orta: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  yuksek: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

export const STATUS_COLORS: Record<Status, string> = {
  gozleyir: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  icra_olunur: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  tamamlanib: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
]

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  TASKS: '/dashboard/tasks',
  TASK_NEW: '/dashboard/tasks/new',
  TASK_DETAIL: (id: string) => `/dashboard/tasks/${id}`,
  TASK_EDIT: (id: string) => `/dashboard/tasks/${id}/edit`,
  USERS: '/dashboard/users',
  NOTIFICATIONS: '/dashboard/notifications',
} as const
