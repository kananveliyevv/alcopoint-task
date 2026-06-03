-- =============================================
-- ALCOPOINT TASK — TAM VERİTABANI QURULMASI
-- Supabase SQL Editor-ə yapışdırın və icra edin
-- =============================================

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES CƏDVƏLİ
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  ad_soyad TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL DEFAULT 'user' CHECK (rol IN ('admin', 'user')),
  avatar_url TEXT,
  yaradilib TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. TASKS CƏDVƏLİ
-- =============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  basliq TEXT NOT NULL,
  tesvir TEXT,
  icraci UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  yaradan UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  prioritet TEXT NOT NULL DEFAULT 'orta' CHECK (prioritet IN ('asagi', 'orta', 'yuksek')),
  status TEXT NOT NULL DEFAULT 'gozleyir' CHECK (status IN ('gozleyir', 'icra_olunur', 'tamamlanib')),
  son_tarix TIMESTAMPTZ,
  fayl_url TEXT[],
  yaradilib TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. COMMENTS CƏDVƏLİ
-- =============================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  yaradilib TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- 4. NOTIFICATIONS CƏDVƏLİ
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  tip TEXT NOT NULL CHECK (tip IN ('yeni_tapsirig', 'status_deyisdi', 'yeni_serh')),
  mesaj TEXT NOT NULL,
  oxunub BOOLEAN DEFAULT FALSE,
  yaradilib TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- 5. TASK_FILES CƏDVƏLİ
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  fayl_adi TEXT NOT NULL,
  fayl_url TEXT NOT NULL,
  fayl_olcusu BIGINT,
  yukleyen UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  yaradilib TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- 6. ACTIVITY LOG CƏDVƏLİ
-- =============================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  emeliyyat TEXT NOT NULL,
  detallar JSONB,
  yaradilib TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- 7. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tasks_icraci ON public.tasks(icraci);
CREATE INDEX IF NOT EXISTS idx_tasks_yaradan ON public.tasks(yaradan);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_prioritet ON public.tasks(prioritet);
CREATE INDEX IF NOT EXISTS idx_tasks_son_tarix ON public.tasks(son_tarix);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_oxunub ON public.notifications(oxunub);
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON public.task_files(task_id);

-- =============================================
-- 8. UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_tasks_updated_at ON public.tasks;
CREATE TRIGGER handle_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- =============================================
-- 9. YENİ İSTİFADƏÇİ TRIGGER (Profile avtomatik yaradır)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, ad_soyad, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'ad_soyad', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- TASKS POLICIES
DROP POLICY IF EXISTS "tasks_select_admin" ON public.tasks;
CREATE POLICY "tasks_select_admin"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own"
  ON public.tasks FOR SELECT
  USING (icraci = auth.uid() OR yaradan = auth.uid());

DROP POLICY IF EXISTS "tasks_insert_admin" ON public.tasks;
CREATE POLICY "tasks_insert_admin"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "tasks_update_admin" ON public.tasks;
CREATE POLICY "tasks_update_admin"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "tasks_update_assignee" ON public.tasks;
CREATE POLICY "tasks_update_assignee"
  ON public.tasks FOR UPDATE
  USING (icraci = auth.uid())
  WITH CHECK (icraci = auth.uid());

DROP POLICY IF EXISTS "tasks_delete_admin" ON public.tasks;
CREATE POLICY "tasks_delete_admin"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- COMMENTS POLICIES
DROP POLICY IF EXISTS "comments_select" ON public.comments;
CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND (
          t.icraci = auth.uid()
          OR t.yaradan = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete" ON public.comments;
CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- TASK_FILES POLICIES
DROP POLICY IF EXISTS "task_files_select" ON public.task_files;
CREATE POLICY "task_files_select"
  ON public.task_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND (
          t.icraci = auth.uid()
          OR t.yaradan = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "task_files_insert" ON public.task_files;
CREATE POLICY "task_files_insert"
  ON public.task_files FOR INSERT
  WITH CHECK (yukleyen = auth.uid());

DROP POLICY IF EXISTS "task_files_delete_admin" ON public.task_files;
CREATE POLICY "task_files_delete_admin"
  ON public.task_files FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- ACTIVITY LOG POLICIES
DROP POLICY IF EXISTS "activity_log_select_admin" ON public.activity_log;
CREATE POLICY "activity_log_select_admin"
  ON public.activity_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

DROP POLICY IF EXISTS "activity_log_insert" ON public.activity_log;
CREATE POLICY "activity_log_insert"
  ON public.activity_log FOR INSERT
  WITH CHECK (TRUE);

-- =============================================
-- 11. REALTIME AKTIVLƏŞDIRMƏ
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- =============================================
-- UĞURLA TAMAMLANDI!
-- İndi ilk admin istifadəçini yaradın:
-- 1. Sayta qeydiyyatdan keçin
-- 2. Aşağıdakı SQL-i icra edin (emaili dəyişin):
-- =============================================
-- UPDATE public.profiles
-- SET rol = 'admin'
-- WHERE email = 'sizin-email@example.com';

-- =============================================
-- XATIRLATMA SÜTUNLARI (Tasks cədvəlinə əlavə et)
-- Bu SQL-i əlavə olaraq icra edin
-- =============================================
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS xatirlatma_aktiv BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS xatirlatma_vaxt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS xatirlatma_tekrar TEXT DEFAULT 'hec'
    CHECK (xatirlatma_tekrar IN ('hec', 'gundelik', 'heftelik', 'ayliq'));

CREATE INDEX IF NOT EXISTS idx_tasks_xatirlatma ON public.tasks(xatirlatma_aktiv, xatirlatma_vaxt)
  WHERE xatirlatma_aktiv = TRUE;

-- =============================================
-- XATIRLATMA FUNKSIYASI (Gündəlik tapşırıqları yeniləyir)
-- Supabase Edge Function və ya cron job ilə çağırın
-- =============================================
CREATE OR REPLACE FUNCTION public.process_recurring_reminders()
RETURNS void AS $$
DECLARE
  task_rec RECORD;
  next_time TIMESTAMPTZ;
BEGIN
  FOR task_rec IN
    SELECT id, xatirlatma_vaxt, xatirlatma_tekrar
    FROM public.tasks
    WHERE xatirlatma_aktiv = TRUE
      AND xatirlatma_vaxt < NOW()
      AND xatirlatma_tekrar != 'hec'
      AND status != 'tamamlanib'
  LOOP
    CASE task_rec.xatirlatma_tekrar
      WHEN 'gundelik' THEN next_time := task_rec.xatirlatma_vaxt + INTERVAL '1 day';
      WHEN 'heftelik' THEN next_time := task_rec.xatirlatma_vaxt + INTERVAL '7 days';
      WHEN 'ayliq'   THEN next_time := task_rec.xatirlatma_vaxt + INTERVAL '1 month';
      ELSE next_time := NULL;
    END CASE;

    IF next_time IS NOT NULL THEN
      UPDATE public.tasks
      SET xatirlatma_vaxt = next_time
      WHERE id = task_rec.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
