import { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}
