// =============================================
// ALCOPOINT TASK — TİP TƏRİFLƏRİ
// =============================================

export type Rol = 'admin' | 'user'
export type Prioritet = 'asagi' | 'orta' | 'yuksek'
export type Status = 'gozleyir' | 'icra_olunur' | 'tamamlanib'
export type NotifikasiyaTip = 'yeni_tapsirig' | 'status_deyisdi' | 'yeni_serh'
export type XatirlatmaTekrar = 'hec' | 'gundelik' | 'heftelik' | 'ayliq'

export interface Profile {
  id: string
  ad_soyad: string
  email: string
  rol: Rol
  avatar_url?: string | null
  yaradilib: string
  updated_at?: string
}

export interface Task {
  id: string
  basliq: string
  tesvir?: string | null
  icraci?: string | null
  yaradan: string
  prioritet: Prioritet
  status: Status
  son_tarix?: string | null
  fayl_url?: string[] | null
  yaradilib: string
  updated_at?: string
  // Xatırlatma sahələri
  xatirlatma_aktiv?: boolean
  xatirlatma_vaxt?: string | null
  xatirlatma_tekrar?: XatirlatmaTekrar | null
  // Relations (join ilə gəlir)
  icraci_profile?: Profile | null
  yaradan_profile?: Profile | null
  comments?: Comment[]
  task_files?: TaskFile[]
  _count?: {
    comments: number
    task_files: number
  }
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  yaradilib: string
  user_profile?: Profile | null
}

export interface Notification {
  id: string
  user_id: string
  task_id?: string | null
  tip: NotifikasiyaTip
  mesaj: string
  oxunub: boolean
  yaradilib: string
  task?: Task | null
}

export interface TaskFile {
  id: string
  task_id: string
  fayl_adi: string
  fayl_url: string
  fayl_olcusu?: number | null
  yukleyen?: string | null
  yaradilib: string
  yukleyen_profile?: Profile | null
}

export interface ActivityLog {
  id: string
  user_id?: string | null
  task_id?: string | null
  emeliyyat: string
  detallar?: Record<string, unknown> | null
  yaradilib: string
  user_profile?: Profile | null
  task?: Task | null
}

// Dashboard statistikaları
export interface DashboardStats {
  umumi: number
  tamamlanmis: number
  davam_eden: number
  gecikmis: number
}

// Task yaratmaq üçün form tipi
export interface TaskFormData {
  basliq: string
  tesvir?: string
  icraci?: string
  prioritet: Prioritet
  status: Status
  son_tarix?: string
  xatirlatma_aktiv?: boolean
  xatirlatma_vaxt?: string
  xatirlatma_tekrar?: XatirlatmaTekrar
}

// Auth
export interface AuthUser {
  id: string
  email: string
  profile?: Profile
}

// API cavabları
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Filter tipi
export interface TaskFilters {
  status?: Status | 'all'
  prioritet?: Prioritet | 'all'
  icraci?: string | 'all'
  axtaris?: string
  son_tarix?: 'all' | 'bu_gun' | 'bu_hefte' | 'gecikmis'
}
