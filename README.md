# AlcoPoint Task — Tapşırıq İdarəetmə Sistemi

Tam funksional tapşırıq idarəetmə sistemi. Next.js 15, TypeScript, Supabase, Tailwind CSS ilə hazırlanmışdır.

---

## 📁 Layihə Strukturu

```
alcopoint-task/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  ← Ana səhifə (dashboard)
│   │   ├── tasks/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   ├── users/
│   │   │   └── page.tsx              ← Yalnız admin
│   │   └── notifications/
│   │       └── page.tsx
│   ├── api/
│   │   └── notifications/
│   │       └── route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                           ← Shadcn UI komponentləri
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ForgotPasswordForm.tsx
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── RecentActivity.tsx
│   │   └── TaskChart.tsx
│   ├── tasks/
│   │   ├── TaskCard.tsx
│   │   ├── TaskForm.tsx
│   │   ├── TaskList.tsx
│   │   ├── TaskFilters.tsx
│   │   ├── CommentSection.tsx
│   │   └── FileUpload.tsx
│   ├── users/
│   │   ├── UserTable.tsx
│   │   └── AddUserModal.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── NotificationBell.tsx
│   │   └── ThemeToggle.tsx
│   └── shared/
│       ├── PriorityBadge.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTasks.ts
│   │   ├── useNotifications.ts
│   │   └── useRealtime.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── index.ts
│   └── constants.ts
├── middleware.ts
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 🚀 Quraşdırma Təlimatı

### 1. Supabase Layihəsinin Yaradılması

1. [supabase.com](https://supabase.com) saytına daxil olun
2. "New Project" düyməsinə klikləyin
3. Layihəyə ad verin: `alcopoint-task`
4. Güclü şifrə seçin (yadda saxlayın)
5. Region seçin: `Frankfurt (eu-central-1)` (ən yaxın)
6. "Create new project" düyməsinə klikləyin

### 2. SQL Cədvəllərinin Yaradılması

Supabase Dashboard → SQL Editor → New query açın və aşağıdakı SQL-i icra edin:

```sql
-- =============================================
-- ALCOPOINT TASK — VERİTABANI STRUKTURU
-- =============================================

-- UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES CƏDVƏLİ
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  ad_soyad text not null,
  email text not null unique,
  rol text not null default 'user' check (rol in ('admin', 'user')),
  avatar_url text,
  yaradilib timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now()
);

-- =============================================
-- TASKS CƏDVƏLİ
-- =============================================
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  basliq text not null,
  tesvir text,
  icraci uuid references public.profiles(id) on delete set null,
  yaradan uuid references public.profiles(id) on delete set null not null,
  prioritet text not null default 'orta' check (prioritet in ('asagi', 'orta', 'yuksek')),
  status text not null default 'gozleyir' check (status in ('gozleyir', 'icra_olunur', 'tamamlanib')),
  son_tarix timestamp with time zone,
  fayl_url text[],
  yaradilib timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now()
);

-- =============================================
-- COMMENTS CƏDVƏLİ
-- =============================================
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  yaradilib timestamp with time zone default now() not null
);

-- =============================================
-- NOTIFICATIONS CƏDVƏLİ
-- =============================================
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete cascade,
  tip text not null check (tip in ('yeni_tapsirig', 'status_deyisdi', 'yeni_serh')),
  mesaj text not null,
  oxunub boolean default false,
  yaradilib timestamp with time zone default now() not null
);

-- =============================================
-- TASK_FILES CƏDVƏLİ
-- =============================================
create table public.task_files (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  fayl_adi text not null,
  fayl_url text not null,
  fayl_olcusu bigint,
  yukleyen uuid references public.profiles(id) on delete set null,
  yaradilib timestamp with time zone default now() not null
);

-- =============================================
-- ACTIVITY LOG
-- =============================================
create table public.activity_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  emeliyyat text not null,
  detallar jsonb,
  yaradilib timestamp with time zone default now() not null
);

-- =============================================
-- INDEXES
-- =============================================
create index idx_tasks_icraci on public.tasks(icraci);
create index idx_tasks_yaradan on public.tasks(yaradan);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_prioritet on public.tasks(prioritet);
create index idx_comments_task_id on public.comments(task_id);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_oxunub on public.notifications(oxunub);
create index idx_activity_log_task_id on public.activity_log(task_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- NEW USER TRIGGER (profiles avtomatik yaradir)
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, ad_soyad, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'ad_soyad', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'rol', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.task_files enable row level security;
alter table public.activity_log enable row level security;

-- PROFILES RLS
create policy "Hər kəs öz profilini görə bilər"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admin bütün profilləri görə bilər"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

create policy "Hər kəs öz profilini yeniləyə bilər"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admin profil yarada bilər"
  on public.profiles for insert
  with check (
    auth.uid() = id or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

-- TASKS RLS
create policy "Admin bütün tapşırıqları görə bilər"
  on public.tasks for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

create policy "İşçi öz tapşırıqlarını görə bilər"
  on public.tasks for select
  using (
    icraci = auth.uid() or yaradan = auth.uid()
  );

create policy "Admin tapşırıq yarada bilər"
  on public.tasks for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

create policy "Admin tapşırıq yeniləyə bilər"
  on public.tasks for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

create policy "İşçi öz tapşırığının statusunu yeniləyə bilər"
  on public.tasks for update
  using (icraci = auth.uid())
  with check (icraci = auth.uid());

create policy "Admin tapşırıq silə bilər"
  on public.tasks for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

-- COMMENTS RLS
create policy "Tapşırığa aid hər kəs şərh görə bilər"
  on public.comments for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
      and (
        t.icraci = auth.uid() or
        t.yaradan = auth.uid() or
        exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
      )
    )
  );

create policy "İstifadəçi şərh əlavə edə bilər"
  on public.comments for insert
  with check (user_id = auth.uid());

create policy "Öz şərhini silə bilər"
  on public.comments for delete
  using (
    user_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
  );

-- NOTIFICATIONS RLS
create policy "Öz bildirişlərini görə bilər"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Bildiriş yaratmaq (system)"
  on public.notifications for insert
  with check (true);

create policy "Öz bildirişini yeniləyə bilər"
  on public.notifications for update
  using (user_id = auth.uid());

-- TASK_FILES RLS
create policy "Tapşırıq fayllarını görə bilər"
  on public.task_files for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
      and (
        t.icraci = auth.uid() or
        t.yaradan = auth.uid() or
        exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
      )
    )
  );

create policy "Fayl yükləyə bilər"
  on public.task_files for insert
  with check (yukleyen = auth.uid());

create policy "Admin fayl silə bilər"
  on public.task_files for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
  );

-- ACTIVITY LOG RLS
create policy "Admin activity görə bilər"
  on public.activity_log for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
  );

create policy "Activity yaratmaq"
  on public.activity_log for insert
  with check (true);

-- =============================================
-- İLK ADMİN İSTİFADƏÇİ YARATMAQ
-- (Supabase Auth-da əvvəlcə qeydiyyatdan keçin,
--  sonra bu SQL-i icra edin)
-- =============================================
-- UPDATE public.profiles
-- SET rol = 'admin'
-- WHERE email = 'your-admin@email.com';
```

### 3. Storage Bucket Yaratmaq

Supabase Dashboard → Storage → New Bucket:
- Name: `task-files`
- Public bucket: ❌ (private saxlayın)
- File size limit: 50MB

Storage Policy əlavə edin (SQL Editor):

```sql
-- Storage Policy
insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', false);

create policy "Authenticated istifadəçilər fayl yükləyə bilər"
  on storage.objects for insert
  with check (bucket_id = 'task-files' and auth.role() = 'authenticated');

create policy "Authenticated istifadəçilər faylları görə bilər"
  on storage.objects for select
  using (bucket_id = 'task-files' and auth.role() = 'authenticated');

create policy "Admin fayl silə bilər"
  on storage.objects for delete
  using (
    bucket_id = 'task-files' and
    exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin')
  );
```

### 4. Realtime Aktivləşdirmə

Supabase Dashboard → Database → Replication:
- `tasks` cədvəlini aktiv edin
- `notifications` cədvəlini aktiv edin
- `comments` cədvəlini aktiv edin

### 5. Authentication Ayarları

Supabase Dashboard → Authentication → Settings:
- Site URL: `https://alcopoint-task.vercel.app`
- Redirect URLs: `https://alcopoint-task.vercel.app/**`

### 6. .env.local Faylı

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App
NEXT_PUBLIC_APP_URL=https://alcopoint-task.vercel.app
```

Açarları tapmaq üçün: Supabase Dashboard → Settings → API

### 7. Vercel Deploy

```bash
# 1. Layihəni GitHub-a yükləyin
git init
git add .
git commit -m "Initial commit: AlcoPoint Task"
git remote add origin https://github.com/yourusername/alcopoint-task.git
git push -u origin main

# 2. vercel.com saytına daxil olun
# 3. "Add New Project" → GitHub repo seçin
# 4. Environment Variables əlavə edin:
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - SUPABASE_SERVICE_ROLE_KEY
#    - NEXT_PUBLIC_APP_URL
# 5. "Deploy" düyməsinə klikləyin
```

---

## 📦 Paketlərin Quraşdırılması

```bash
npx create-next-app@latest alcopoint-task --typescript --tailwind --eslint --app --src-dir=false

cd alcopoint-task

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Shadcn UI
npx shadcn@latest init

# Shadcn komponentləri
npx shadcn@latest add button input label card badge
npx shadcn@latest add dialog sheet dropdown-menu
npx shadcn@latest add select textarea avatar
npx shadcn@latest add table toast tabs
npx shadcn@latest add form progress separator
npx shadcn@latest add popover calendar

# İlave paketlər
npm install react-hook-form @hookform/resolvers zod
npm install date-fns
npm install lucide-react
npm install next-themes
npm install recharts
npm install @tanstack/react-query
npm install sonner
npm install clsx tailwind-merge
```

---

## 🔐 İlk Admin İstifadəçi

1. Sayta daxil olun: `https://alcopoint-task.vercel.app/register`
2. Qeydiyyatdan keçin
3. Supabase Dashboard → SQL Editor:
```sql
UPDATE public.profiles
SET rol = 'admin'
WHERE email = 'sizin@email.com';
```
