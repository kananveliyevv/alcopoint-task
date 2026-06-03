export type Status = 'gozleyir' | 'icra_olunur' | 'tamamlanib' | 'ləğv_edilib'
export type Prioritet = 'asagi' | 'orta' | 'yuksek'
export type Rol = 'admin' | 'user'

export interface Profile {
  id: string
  ad_soyad: string
  email: string
  rol: Rol
  yaradilib: string
  yenilendi: string
}

export interface Task {
  id: string
  basliq: string
  tesvir?: string
  status: Status
  prioritet: Prioritet
  icraci?: string
  yaradan?: string
  son_tarix?: string
  yaradilib: string
  yenilendi: string
  icraci_profile?: Pick<Profile, 'id' | 'ad_soyad' | 'email'>
  yaradan_profile?: Pick<Profile, 'id' | 'ad_soyad' | 'email'>
  xatirlatmalar?: TaskReminder[]
}

export interface TaskReminder {
  id: string
  task_id: string
  xatirlatma_vaxti: string
  tekrar: XatirlatmaTekrar
  aktiv: boolean
  yaradilib: string
}

export type XatirlatmaTekrar = 'bir_defe' | 'hər_gun' | 'hər_həftə'

export interface Comment {
  id: string
  task_id: string
  istifadeci_id: string
  metn: string
  yaradilib: string
  profile?: Pick<Profile, 'id' | 'ad_soyad' | 'email'>
}

export interface TaskFile {
  id: string
  task_id: string
  fayl_adi: string
  fayl_yolu: string
  fayl_olcusu: number
  fayl_tipi: string
  yukleyen: string
  yaradilib: string
  profile?: Pick<Profile, 'id' | 'ad_soyad' | 'email'>
}

export interface ActivityLog {
  id: string
  task_id: string
  istifadeci_id: string
  emeliyyat: string
  deyisiklikler?: Record<string, unknown>
  yaradilib: string
  profile?: Pick<Profile, 'id' | 'ad_soyad' | 'email'>
}

export interface DashboardStats {
  umumi: number
  tamamlanmis: number
  davam_eden: number
  gecikmis: number
}

export interface TaskFilters {
  status?: Status | 'all'
  prioritet?: Prioritet | 'all'
  axtaris?: string
}
