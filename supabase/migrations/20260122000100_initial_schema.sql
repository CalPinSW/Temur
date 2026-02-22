-- Initial Schema Migration for Mobile App Template
-- Creates core tables and policies for:
-- 1) user profiles
-- 2) friendships
-- 3) notification preferences and push tokens

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- PROFILES TABLE
-- Extends auth.users with app-specific profile + notification settings
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  push_token TEXT,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_push_token
  ON profiles(push_token)
  WHERE push_token IS NOT NULL;
CREATE INDEX idx_profiles_notifications_enabled
  ON profiles(notifications_enabled)
  WHERE notifications_enabled = true;

-- ============================================
-- FRIENDSHIPS TABLE
-- Directed relationship rows to support request flow and status transitions
-- ============================================
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- ============================================
-- SHARED updated_at TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Auto-create profile on auth.users signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Profiles: authenticated users can discover profiles, but only mutate self.
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Service role can delete profiles"
  ON profiles FOR DELETE
  TO service_role
  USING (true);

-- Friendships: users can only access relationships they are part of.
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update relevant friendships"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================
-- AVATAR STORAGE
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- AVATAR CLEANUP
-- ============================================
CREATE OR REPLACE FUNCTION public.extract_avatar_path(avatar_url TEXT)
RETURNS TEXT AS $$
DECLARE
  bucket_path TEXT;
BEGIN
  IF avatar_url IS NULL OR avatar_url = '' THEN
    RETURN NULL;
  END IF;

  IF avatar_url LIKE '%/avatars/%' THEN
    bucket_path := split_part(avatar_url, '/avatars/', 2);
    RETURN bucket_path;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_avatar_file(avatar_url TEXT)
RETURNS VOID AS $$
DECLARE
  file_path TEXT;
BEGIN
  file_path := public.extract_avatar_path(avatar_url);

  IF file_path IS NOT NULL THEN
    BEGIN
      DELETE FROM storage.objects
      WHERE bucket_id = 'avatars'
        AND name = file_path;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not delete avatar file %: %', file_path, SQLERRM;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cleanup_old_avatar_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    IF OLD.avatar_url IS NOT NULL AND OLD.avatar_url <> '' THEN
      PERFORM public.delete_avatar_file(OLD.avatar_url);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cleanup_avatar_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.avatar_url IS NOT NULL AND OLD.avatar_url <> '' THEN
    PERFORM public.delete_avatar_file(OLD.avatar_url);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_cleanup_old_avatar_on_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_avatar_on_update();

CREATE TRIGGER trigger_cleanup_avatar_on_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_avatar_on_delete();

GRANT EXECUTE ON FUNCTION public.extract_avatar_path(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_avatar_file(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_avatar_on_update() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_avatar_on_delete() TO authenticated, service_role;
