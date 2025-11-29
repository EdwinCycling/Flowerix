-- RUN THIS SCRIPT IN THE SUPABASE SQL EDITOR

-- 1. Grant usage on schema to authenticated users (Basic access)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Grant table permissions (Crucial step often missed causing 403s)
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon; 

-- 3. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop potentially conflicting or restrictive policies to clean up
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles select social" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles insert own" ON public.profiles;
DROP POLICY IF EXISTS "profiles select own" ON public.profiles;
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
DROP POLICY IF EXISTS "read own profile" ON public.profiles;

-- 5. Create simplified and correct policies

-- Allow users to insert their own profile (Required for the self-heal logic in AuthContext)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to view ALL profiles 
-- (Required for Social Feed to show names/avatars of other users)
CREATE POLICY "Authenticated can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
