-- ============================================================
-- MATH MATE V27 - COMPLETE DATABASE SCHEMA & RLS POLICIES
-- ============================================================

-- 1. DROP EXISTING TABLES IF REBUILDING
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.math7_progress CASCADE;
DROP TABLE IF EXISTS public.math7_curriculum CASCADE;
DROP TABLE IF EXISTS public.custom_activities CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. CREATE TABLES
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,                       -- User Identification ID (e.g. 'Pulchrify', 'student_001')
  name TEXT NOT NULL,                        -- Linked Display Name
  avatar_url TEXT DEFAULT '',                 -- Base64 or Image URL
  avatar_color TEXT DEFAULT '#3b82f6',       -- Fallback Avatar Color
  bio TEXT DEFAULT 'Mathematics Learner',    -- Customizable Bio / Goal
  xp INT DEFAULT 0,                          -- Accumulated EXP Points
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.math7_progress (
  id TEXT PRIMARY KEY,                       -- Format: prog_{user_id}_{lesson_id}
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,                   -- e.g. 'math-7-t1-l1'
  score INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  percentage INT DEFAULT 0,
  exp_earned INT DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,                     -- Target User ID or 'ALL'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.conversations (
  id TEXT PRIMARY KEY,                       -- e.g. 'userA_direct_userB' or 'group_12345'
  type TEXT DEFAULT 'direct',                -- 'direct' or 'group'
  name TEXT,                                 -- Group name
  members JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_sticker BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY & PUBLIC PERMISSIVE POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_policy" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.math7_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "math7_progress_policy" ON public.math7_progress FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_policy" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_policy" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_policy" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- 4. ENABLE REALTIME PUBLICATIONS
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.messages,
  public.conversations,
  public.notifications,
  public.profiles;

-- 5. SEED INITIAL DEMO ACCOUNTS
INSERT INTO public.profiles (id, name, xp, bio)
VALUES 
  ('Pulchrify', 'Pulchrify', 250, 'Math Mate Lead Explorer'),
  ('student_001', 'Juan Dela Cruz', 180, 'Grade 7 Math Student'),
  ('student_002', 'Maria Santos', 120, 'Gusa Science High Scholar')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  bio = EXCLUDED.bio;
