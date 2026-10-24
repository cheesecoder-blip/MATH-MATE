-- ============================================================
-- MATH MATE V22 - COMPLETE DATABASE SCHEMA WITH RLS POLICIES
-- ============================================================

-- 1. DROP EXISTING TABLES IF REBUILDING
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.math7_progress CASCADE;
DROP TABLE IF EXISTS public.math7_curriculum CASCADE;
DROP TABLE IF EXISTS public.custom_activities CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. CREATE SCHEMAS & TABLES

-- USER PROFILES TABLE
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,                       -- e.g. 'Pulchrify' or 'student_001'
  name TEXT NOT NULL,                        -- e.g. 'Pulchrify' or 'Juan Dela Cruz'
  avatar_url TEXT DEFAULT '',                 -- Image URL or base64 data URL
  avatar_color TEXT DEFAULT '#007aff',       -- Hex color for initials avatar
  bio TEXT DEFAULT 'Math Mate Student',      -- Short bio
  xp INT DEFAULT 0,                          -- Total Experience Points
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEDICATED MATH 7 PROGRESS TABLE
CREATE TABLE public.math7_progress (
  id TEXT PRIMARY KEY,                       -- Format: progress_{user_id}_{lesson_id}
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,                  -- e.g. 'math-7-t1-l1'
  course_id TEXT DEFAULT 'math-7',          -- Course ID
  score INT DEFAULT 0,                      -- Number of correct answers
  total_questions INT DEFAULT 0,            -- Total question items
  percentage INT DEFAULT 0,                 -- Score percentage (0 - 100)
  exp_earned INT DEFAULT 0,                 -- EXP earned (1 XP per correct item)
  status TEXT DEFAULT 'completed',          -- e.g. 'completed'
  answers JSONB DEFAULT '{}'::jsonb,        -- User submitted options mapping
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS TABLE (FOR INDIVIDUAL & ALL USERS)
CREATE TABLE public.notifications (
  id TEXT PRIMARY KEY,                       -- e.g. 'notif_12345678'
  user_id TEXT NOT NULL,                    -- Target User ID or 'ALL'
  title TEXT NOT NULL,                      -- Notification Title
  message TEXT NOT NULL,                    -- Notification Message Body
  is_read BOOLEAN DEFAULT FALSE,            -- Read Status
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONVERSATIONS TABLE (DIRECT & GROUP CHATS)
CREATE TABLE public.conversations (
  id TEXT PRIMARY KEY,                       -- e.g. 'conv_user1_direct_user2' or 'group_math_squad'
  type TEXT DEFAULT 'direct',               -- 'direct' or 'group'
  name TEXT,                                -- Group Chat Name
  members JSONB DEFAULT '[]'::jsonb,        -- Array of user IDs for group chat
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES TABLE
CREATE TABLE public.messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_sticker BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI CUSTOM GENERATED ACTIVITIES TABLE
CREATE TABLE public.custom_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STANDALONE MATHEMATICS 7 CURRICULUM TABLE
CREATE TABLE public.math7_curriculum (
  id TEXT PRIMARY KEY DEFAULT 'math-7',
  title TEXT DEFAULT 'Grade 7 General Mathematics',
  grade TEXT DEFAULT 'Grade 7',
  description TEXT DEFAULT 'Gusa Regional Science High School - Grade 7 Curriculum across 3 Terms.',
  curriculum_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS) & ATTACH PUBLIC POLICIES
-- ============================================================

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

ALTER TABLE public.custom_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_activities_policy" ON public.custom_activities FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.math7_curriculum ENABLE ROW LEVEL SECURITY;
CREATE POLICY "math7_curriculum_policy" ON public.math7_curriculum FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 4. SEED INITIAL REAL ACCOUNTS
-- ============================================================
INSERT INTO public.profiles (id, name, xp, bio)
VALUES 
  ('Pulchrify', 'Pulchrify', 150, 'Math Mate Lead Explorer'),
  ('student_001', 'Juan Dela Cruz', 85, 'Grade 7 Math Student'),
  ('student_002', 'Maria Santos', 120, 'Gusa Science High Scholar')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  bio = EXCLUDED.bio;
