import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Tables<"profiles"> | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<{ error: any; requiresEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
type SupabaseClient = (typeof import("@/integrations/supabase/client"))["supabase"];
let supabaseClientPromise: Promise<SupabaseClient> | null = null;

const getSupabaseClient = async (): Promise<SupabaseClient> => {
  if (!supabaseClientPromise) {
    supabaseClientPromise = import("@/integrations/supabase/client").then((module) => module.supabase);
  }
  return supabaseClientPromise;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient();
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle()
      ]);
      
      setProfile(profileRes.data);
      setIsAdmin(!!roleRes.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchData(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      const supabase = await getSupabaseClient();
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        await fetchData(initialSession.user.id);
      }
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          setLoading(true);
          await fetchData(newSession.user.id);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
        setLoading(false);
      });

      unsubscribe = () => subscription.unsubscribe();
      setLoading(false);
    };

    initializeAuth().catch((error) => {
      console.error("Auth initialization failed:", error);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    const supabase = await getSupabaseClient();
    let referredById: string | undefined;
    if (referralCode) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode.toUpperCase())
        .single();
      if (referrer) referredById = referrer.id;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (!error && referredById && data.user) {
      // Small delay to let the trigger create the profile
      setTimeout(async () => {
        await supabase
          .from("profiles")
          .update({ referred_by: referredById })
          .eq("user_id", data.user!.id);
      }, 1000);
    }

    return { error, requiresEmailConfirmation: !error && !data.session };
  };

  const signIn = async (email: string, password: string) => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
