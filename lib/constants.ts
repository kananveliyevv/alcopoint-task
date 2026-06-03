import { Status, Prioritet } from '@/lib/types'

export const STATUS_LABELS: Record<Status, string> = {
  gozleyir: 'Gözləyir',
  icra_olunur: 'İcra olunur',
  tamamlanib: 'Tamamlanıb',
  'ləğv_edilib': 'Ləğv edilib',
}

export const PRIORITET_LABELS: Record<Prioritet, string> = {
  asagi: 'Aşağı',
  orta: 'Orta',
  yuksek: 'Yüksək',
}

export const STATUS_COLORS: Record<Status, string> = {
  gozleyir: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  icra_olunur: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  tamamlanib: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  'ləğv_edilib': 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
}

export const PRIORITET_COLORS: Record<Prioritet, string> = {
  asagi: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  orta: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  yuksek: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
}

export const NOTIFIKASIYA_LABELS: Record<string, string> = {
  bir_defe: 'Bir dəfə',
  'hər_gun': 'Hər gün',
  'hər_həftə': 'Hər həftə',
}
