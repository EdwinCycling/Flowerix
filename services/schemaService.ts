
export const FULL_SCHEMA_SQL = `-- 1. Profiles Table (Users & Settings)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'pending',
  settings JSONB DEFAULT '{"tier": "FREE"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Gardens Table (Garden Areas/Zones)
CREATE TABLE IF NOT EXISTS public.gardens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Plants Table
CREATE TABLE IF NOT EXISTS public.plants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  scientific_name TEXT,
  image_url TEXT,
  description TEXT,
  care_instructions TEXT,
  is_indoor BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  date_planted DATE,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  sequence_number INTEGER DEFAULT 0,
  location JSONB DEFAULT '[]'::jsonb, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Logs Table (Events, Photos, Weather)
CREATE TABLE IF NOT EXISTS public.logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  log_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  weather JSONB,
  type TEXT DEFAULT 'PLANT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Social Posts (World Feed)
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plant_name TEXT,
  title TEXT,
  description TEXT,
  image_url TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  weather JSONB,
  country_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Social Likes
CREATE TABLE IF NOT EXISTS public.social_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, user_id)
);

-- 7. Social Comments
CREATE TABLE IF NOT EXISTS public.social_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Notebook Entries
CREATE TABLE IF NOT EXISTS public.notebook_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, 
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  image_url TEXT,
  is_done BOOLEAN DEFAULT false,
  recurrence TEXT DEFAULT 'none',
  original_parent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. User Subscriptions (Stripe Sync)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT DEFAULT 'FREE', -- 'SILVER', 'GOLD', etc.
  status TEXT, -- 'active', 'canceled', 'past_due', etc.
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ############################################################
-- MIGRATIONS: Fix Missing Columns in Existing Tables
-- ############################################################
DO $$
BEGIN
    -- PLANTS: Ensure all fields exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'is_indoor') THEN
        ALTER TABLE public.plants ADD COLUMN is_indoor BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'is_active') THEN
        ALTER TABLE public.plants ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'date_planted') THEN
        ALTER TABLE public.plants ADD COLUMN date_planted DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'sequence_number') THEN
        ALTER TABLE public.plants ADD COLUMN sequence_number INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'location') THEN
        ALTER TABLE public.plants ADD COLUMN location JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'scientific_name') THEN
        ALTER TABLE public.plants ADD COLUMN scientific_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'care_instructions') THEN
        ALTER TABLE public.plants ADD COLUMN care_instructions TEXT;
    END IF;

    -- LOGS: Ensure type and weather exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logs' AND column_name = 'type') THEN
        ALTER TABLE public.logs ADD COLUMN type TEXT DEFAULT 'PLANT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logs' AND column_name = 'weather') THEN
        ALTER TABLE public.logs ADD COLUMN weather JSONB;
    END IF;

    -- NOTEBOOK: Ensure recurrence fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notebook_entries' AND column_name = 'recurrence') THEN
        ALTER TABLE public.notebook_entries ADD COLUMN recurrence TEXT DEFAULT 'none';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notebook_entries' AND column_name = 'original_parent_id') THEN
        ALTER TABLE public.notebook_entries ADD COLUMN original_parent_id TEXT;
    END IF;

    -- PROFILES: Ensure settings exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'settings') THEN
        ALTER TABLE public.profiles ADD COLUMN settings JSONB DEFAULT '{\"tier\": \"FREE\"}'::jsonb;
    END IF;

    -- SOCIAL
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_posts' AND column_name = 'country_code') THEN
        ALTER TABLE public.social_posts ADD COLUMN country_code TEXT;
    END IF;
END $$;

-- ############################################################
-- SECURITY POLICIES (RLS)
-- ############################################################

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gardens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper Function for Social Access
CREATE OR REPLACE FUNCTION is_approved()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies: Profiles
DROP POLICY IF EXISTS \"Users can see own profile\" ON public.profiles;
CREATE POLICY \"Users can see own profile\" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS \"Public profiles\" ON public.profiles;
CREATE POLICY \"Public profiles\" ON public.profiles FOR SELECT USING (true); 
DROP POLICY IF EXISTS \"Users can update own profile\" ON public.profiles;
CREATE POLICY \"Users can update own profile\" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS \"Users can insert own profile\" ON public.profiles;
CREATE POLICY \"Users can insert own profile\" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies: Gardens/Plants/Logs
DROP POLICY IF EXISTS \"Owner garden access\" ON public.gardens;
CREATE POLICY \"Owner garden access\" ON public.gardens FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS \"Owner plant access\" ON public.plants;
CREATE POLICY \"Owner plant access\" ON public.plants FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS \"Owner log access\" ON public.logs;
CREATE POLICY \"Owner log access\" ON public.logs FOR ALL USING (auth.uid() = owner_id);

-- Policies: Notebook
DROP POLICY IF EXISTS \"Owner manage notebook\" ON public.notebook_entries;
CREATE POLICY \"Owner manage notebook\" ON public.notebook_entries FOR ALL USING (auth.uid() = owner_id);

-- Policies: Subscriptions
DROP POLICY IF EXISTS \"User view own subscription\" ON public.user_subscriptions;
CREATE POLICY \"User view own subscription\" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Policies: Social
DROP POLICY IF EXISTS \"Public view posts\" ON public.social_posts;
CREATE POLICY \"Public view posts\" ON public.social_posts FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS \"Users create posts\" ON public.social_posts;
CREATE POLICY \"Users create posts\" ON public.social_posts FOR INSERT WITH CHECK (auth.uid() = user_id AND is_approved());

DROP POLICY IF EXISTS \"Owner delete posts\" ON public.social_posts;
CREATE POLICY \"Owner delete posts\" ON public.social_posts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS \"Public view likes\" ON public.social_likes;
CREATE POLICY \"Public view likes\" ON public.social_likes FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS \"Users manage likes\" ON public.social_likes;
CREATE POLICY \"Users manage likes\" ON public.social_likes FOR ALL USING (auth.uid() = user_id AND is_approved());

DROP POLICY IF EXISTS \"Public view comments\" ON public.social_comments;
CREATE POLICY \"Public view comments\" ON public.social_comments FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS \"Users create comments\" ON public.social_comments;
CREATE POLICY \"Users create comments\" ON public.social_comments FOR INSERT WITH CHECK (auth.uid() = user_id AND is_approved());

-- Triggers (Auto Profile & Subscription)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, status, settings)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 
    new.raw_user_meta_data->>'avatar_url',
    'pending',
    '{\"tier\": \"FREE\"}'::jsonb
  );
  -- Init Subscription record
  INSERT INTO public.user_subscriptions (user_id, tier, status)
  VALUES (new.id, 'FREE', 'active');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ############################################################
-- STORAGE POLICIES (CRITICAL FOR IMAGES)
-- ############################################################
INSERT INTO storage.buckets (id, name, public) 
VALUES ('flowerix-media', 'flowerix-media', true)
ON CONFLICT (id) DO NOTHING;

-- 1. ALLOW VIEW (Public)
DROP POLICY IF EXISTS \"Give public access to images\" ON storage.objects;
CREATE POLICY \"Give public access to images\" ON storage.objects FOR SELECT USING ( bucket_id = 'flowerix-media' );

-- 2. ALLOW UPLOAD (Authenticated)
DROP POLICY IF EXISTS \"Allow authenticated uploads\" ON storage.objects;
CREATE POLICY \"Allow authenticated uploads\" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'flowerix-media' AND auth.role() = 'authenticated' );

-- 3. ALLOW DELETE (Authenticated) - REQUIRED FOR DELETION
DROP POLICY IF EXISTS \"Allow authenticated delete\" ON storage.objects;
CREATE POLICY \"Allow authenticated delete\" ON storage.objects FOR DELETE USING ( bucket_id = 'flowerix-media' AND auth.role() = 'authenticated' );

-- 4. ALLOW UPDATE (Authenticated)
DROP POLICY IF EXISTS \"Allow authenticated update\" ON storage.objects;
CREATE POLICY \"Allow authenticated update\" ON storage.objects FOR UPDATE USING ( bucket_id = 'flowerix-media' AND auth.role() = 'authenticated' );

-- Backfill missing profiles/subscriptions for existing users (if needed)
DO $$
DECLARE 
  usr RECORD;
BEGIN
  FOR usr IN SELECT * FROM auth.users LOOP
    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, display_name, status, settings)
    VALUES (usr.id, usr.email, COALESCE(usr.raw_user_meta_data->>'display_name', split_part(usr.email, '@', 1)), 'pending', '{\"tier\": \"FREE\"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
    
    -- Ensure subscription entry exists
    INSERT INTO public.user_subscriptions (user_id, tier, status)
    VALUES (usr.id, 'FREE', 'active')
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;
`;
