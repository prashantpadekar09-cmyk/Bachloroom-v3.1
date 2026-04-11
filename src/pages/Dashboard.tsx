import { lazy, Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Wallet, Users, TrendingUp, Settings, Home, BookOpen, Star, Loader2, MessageSquare, XCircle, ArrowDownLeft, ArrowDownCircle, LayoutDashboard, Upload, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadPublicFile } from "@/lib/storage";
import { DEFAULT_AVATAR_IMAGE, DEFAULT_ROOM_IMAGE, getDisplayImageUrl } from "@/lib/media";

const sidebarLinks = [
  { icon: Home, label: "Overview", id: "overview" },
  { icon: BookOpen, label: "My Bookings", id: "bookings" },
  { icon: Users, label: "Referrals", id: "referrals" },
  { icon: Wallet, label: "Referral Wallet", id: "wallet" },
  { icon: Settings, label: "Profile", id: "profile" },
];

const RUPEE_SYMBOL = "\u20B9";
const DATE_RANGE_SEPARATOR = "\u2192";
const ReviewModal = lazy(() => import("@/components/ReviewModal"));
const EarningsChart = lazy(() => import("@/components/dashboard/EarningsChart"));

type ReferralProfile = {
  id: string;
  full_name: string | null;
  created_at: string | null;
  referred_by: string | null;
};

const Dashboard = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [reviewBooking, setReviewBooking] = useState<{ id: string; hostId: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFileName, setAvatarFileName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, navigate, user]);

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*, rooms(title, location, city, host_id, image_url)").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ["my-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: referralLevels } = useQuery({
    queryKey: ["my-referrals", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, created_at, referred_by").not("referred_by", "is", null);
      if (error) throw error;

      const allReferrals = (data || []) as ReferralProfile[];
      const level1 = allReferrals.filter((item) => item.referred_by === profile!.id);
      const level1Ids = new Set(level1.map((item) => item.id));

      const level2 = allReferrals.filter((item) => item.referred_by && level1Ids.has(item.referred_by));
      const level2Ids = new Set(level2.map((item) => item.id));

      const level3 = allReferrals.filter((item) => item.referred_by && level2Ids.has(item.referred_by));

      return { level1, level2, level3 };
    },
    enabled: !!profile?.id,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["my-withdrawals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("withdrawal_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to cancel booking"),
  });

  const [withdrawForm, setWithdrawForm] = useState({ amount: "", upi_id: "", bank_details: "" });
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  const submitWithdrawal = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(withdrawForm.amount);
      if (!amt || amt <= 0 || amt > Number(profile?.wallet_balance || 0)) throw new Error("Invalid amount");
      if (!withdrawForm.upi_id && !withdrawForm.bank_details) throw new Error("Enter UPI ID or bank details");
      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user!.id,
        amount: amt,
        upi_id: withdrawForm.upi_id || null,
        bank_details: withdrawForm.bank_details || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal request submitted!");
      setShowWithdrawForm(false);
      setWithdrawForm({ amount: "", upi_id: "", bank_details: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name.trim() || null,
          phone: profileForm.phone.trim() || null,
          avatar_url: profileForm.avatar_url.trim() || null,
        } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["my-referrals"] });
      queryClient.invalidateQueries({ queryKey: ["my-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["my-transactions"] });
      refreshProfile();
    },
    onError: (e: any) => toast.error(e.message || "Failed to update profile"),
  });

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, or PDF files are allowed");
      return;
    }

    setUploadingAvatar(true);
    setAvatarFileName(file.name);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `avatars/${user.id}/${Date.now()}.${ext}`;
    const { publicUrl, error } = await uploadPublicFile({ path, file });
    if (error || !publicUrl) {
      toast.error(error || "Upload failed");
      setUploadingAvatar(false);
      return;
    }

    setProfileForm((prev) => ({ ...prev, avatar_url: publicUrl }));
    setUploadingAvatar(false);
    toast.success("Profile file uploaded");
  };

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      avatar_url: profile.avatar_url || "",
    });
  }, [profile]);

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  const totalEarnings = transactions?.filter(t => t.type === 'referral_earning').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const walletBalance = Number(profile?.wallet_balance || 0);
  const walletTransactions = transactions?.filter(t => t.type === "referral_earning" || t.type === "withdrawal") || [];
  const totalBookings = bookings?.length || 0;
  const level1Referrals = referralLevels?.level1 || [];
  const level2Referrals = referralLevels?.level2 || [];
  const level3Referrals = referralLevels?.level3 || [];
  const totalReferrals = level1Referrals.length;
  const totalNetworkReferrals = level1Referrals.length + level2Referrals.length + level3Referrals.length;
  const confirmedBookings = bookings?.filter(b => b.status === "confirmed").length || 0;
  const completedBookings = bookings?.filter(b => b.status === "completed").length || 0;
  const missingKycFields = [
    !profile?.full_name ? "full name" : null,
    !profile?.phone ? "phone number" : null,
    !profile?.avatar_url ? "profile photo" : null,
  ].filter(Boolean);

  const earningsData = Array.from({ length: 12 }, (_, i) => ({
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
    earnings: 0,
  }));
  transactions?.forEach(t => {
    if (t.type === 'referral_earning' && t.created_at) {
      const month = new Date(t.created_at).getMonth();
      earningsData[month].earnings += Number(t.amount);
    }
  });

  const renderBookings = () => (
    <div className="space-y-3">
      {bookingsLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : bookings && bookings.length > 0 ? (
        bookings.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
            <div className="flex items-center gap-3">
              <img src={getDisplayImageUrl((b as any).rooms?.image_url, DEFAULT_ROOM_IMAGE)} alt="" className="w-12 h-12 rounded-lg object-cover hidden sm:block" />
              <div>
                <p className="font-semibold text-foreground text-sm">{(b as any).rooms?.title || "Room"}</p>
                <p className="text-xs text-muted-foreground">{new Date(b.check_in).toLocaleDateString()} → {new Date(b.check_out).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Room: ₹{Number((b as any).room_price || 0).toLocaleString("en-IN")} + Fee: ₹{Number((b as any).platform_fee || 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {b.status === "completed" && (b as any).rooms?.host_id && (
                <button onClick={() => setReviewBooking({ id: b.id, hostId: (b as any).rooms.host_id })} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/20 text-primary text-[10px] font-medium hover:bg-primary/30 transition-colors">
                  <MessageSquare className="w-3 h-3" /> Review
                </button>
              )}
              {(b.status === "pending" || b.status === "confirmed") && (
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel this booking?")) {
                      cancelBooking.mutate(b.id);
                    }
                  }}
                  disabled={cancelBooking.isPending}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/20 text-destructive text-[10px] font-medium hover:bg-destructive/30 transition-colors"
                >
                  <XCircle className="w-3 h-3" /> Cancel
                </button>
              )}
              <div className="text-right">
                <p className="font-semibold text-gradient text-sm">₹{Number(b.total_amount).toLocaleString("en-IN")}</p>
                <span className={`text-xs font-medium ${b.status === "completed" ? "text-success" : b.status === "confirmed" ? "text-primary" : b.status === "cancelled" ? "text-destructive" : "text-warning"}`}>
                  {b.status?.charAt(0).toUpperCase()}{b.status?.slice(1)}
                </span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No bookings yet. <Link to="/rooms" className="text-primary hover:underline">Explore rooms</Link></p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      <Navbar />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} fixed lg:sticky top-16 lg:top-20 left-0 z-[70] transition-transform duration-300 glass-sidebar w-64 border-r border-border h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] flex flex-col shrink-0`}>
        <div className="p-6 flex items-center gap-3 border-b border-border justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shrink-0 shadow-gold">
              {(profile?.full_name || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-foreground truncate">{profile?.full_name || "User"}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Guest Account</p>
            </div>
          </div>
          <button className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors" onClick={() => setSidebarOpen(false)}>
            <ArrowDownLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {sidebarLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => { setActiveTab(link.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                activeTab === link.id
                  ? "gradient-gold text-primary-foreground shadow-gold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <link.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${activeTab === link.id ? "text-primary-foreground" : "text-primary"}`} />
              <span>{link.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col pt-16 md:pt-20">
        <header className="md:hidden sticky top-16 z-[50] flex items-center justify-between p-4 glass-navbar border-b border-border">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-foreground text-sm uppercase tracking-wider">{sidebarLinks.find(l => l.id === activeTab)?.label}</h1>
          </div>
          <button className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors" onClick={() => setSidebarOpen(true)}>
            <LayoutDashboard className="w-5 h-5 text-foreground" />
          </button>
        </header>

        <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-5xl w-full mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 hidden md:block">
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Welcome back, {profile?.full_name || "User"}!</p>
          </motion.div>

          {profile?.kyc_status !== "verified" && missingKycFields.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6 glass-luxe gold-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning">KYC Update From Admin</p>
              <p className="text-sm text-foreground mt-2">
                Please add your {missingKycFields.join(", ")} to complete KYC verification.
              </p>
            </motion.div>
          )}

          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                {[
                  { icon: Wallet, label: "Wallet Balance", value: walletBalance, prefix: "₹", color: "gradient-gold" },
                  { icon: TrendingUp, label: "Referral Earnings", value: totalEarnings, prefix: "₹", color: "gradient-warm" },
                  { icon: Users, label: "Referrals", value: totalReferrals, color: "gradient-primary" },
                  { icon: Star, label: "Bookings", value: totalBookings, color: "gradient-gold" },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-luxe gold-border rounded-2xl p-5 gold-glow">
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                      <stat.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-xl font-semibold text-foreground mt-1"><AnimatedCounter end={stat.value} prefix={stat.prefix || ""} /></p>
                  </motion.div>
                ))}
              </div>

              {profile?.referral_code && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-luxe gold-border rounded-2xl p-6 mt-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">Your Referral Code</h3>
                  <div className="flex items-center gap-3">
                    <code className="bg-secondary px-4 py-2 rounded-xl font-mono text-foreground font-bold tracking-wider">{profile.referral_code}</code>
                    <button onClick={() => { navigator.clipboard.writeText(profile.referral_code!); toast.success("Copied!"); }} className="btn-gold px-4 py-2 rounded-xl text-sm font-medium">Copy</button>
                  </div>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-luxe gold-border rounded-2xl p-6 mt-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-2">Referral Earnings Overview</h3>
                <p className="text-xs text-muted-foreground mb-4">Guest accounts earn only through referral commissions.</p>
                <Suspense fallback={<div className="h-64 rounded-xl bg-secondary/40 animate-pulse" />}>
                  <EarningsChart data={earningsData} />
                </Suspense>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-luxe gold-border rounded-2xl p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-bold text-foreground">Recent Bookings</h3>
                  <button onClick={() => setActiveTab("bookings")} className="text-xs text-primary font-medium hover:underline">View all →</button>
                </div>
                {renderBookings()}
              </motion.div>
            </>
          )}

          {activeTab === "bookings" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-luxe gold-border rounded-2xl p-6 mt-8">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">All Bookings ({totalBookings})</h3>
              <div className="flex gap-4 mb-4 text-xs">
                <span className="text-muted-foreground">Confirmed: <strong className="text-primary">{confirmedBookings}</strong></span>
                <span className="text-muted-foreground">Completed: <strong className="text-success">{completedBookings}</strong></span>
              </div>
              {renderBookings()}
            </motion.div>
          )}

          {activeTab === "referrals" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mt-8">
              <div className="glass-luxe gold-border rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-2">Referral Network</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Direct referrals: <strong className="text-foreground">{level1Referrals.length}</strong>
                  {" "}• Total network (L1-L3): <strong className="text-foreground">{totalNetworkReferrals}</strong>
                </p>
                {totalNetworkReferrals > 0 ? (
                  <div className="space-y-5">
                    {[
                      { label: "Level 1", badge: "5%", items: level1Referrals },
                      { label: "Level 2", badge: "2%", items: level2Referrals },
                      { label: "Level 3", badge: "1%", items: level3Referrals },
                    ].map((group) => (
                      <div key={group.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                          <span className="text-xs text-primary font-semibold">{group.items.length} members • {group.badge} commission</span>
                        </div>
                        {group.items.length > 0 ? (
                          group.items.map((r) => (
                            <div key={`${group.label}-${r.id}`} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{(r.full_name || "U")[0]}</div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{r.full_name || "Unnamed user"}</p>
                                  <p className="text-[10px] text-muted-foreground">Joined {r.created_at ? new Date(r.created_at).toLocaleDateString() : "N/A"}</p>
                                </div>
                              </div>
                              <span className="text-xs text-primary font-medium">{group.label}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground py-2">No users in {group.label}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No referrals yet. Share your code to start earning!</p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "wallet" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mt-8">
              <div className="glass-luxe gold-border rounded-2xl p-6 gold-glow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground mb-2">Referral Wallet</h3>
                    <p className="text-4xl font-semibold text-gradient">₹{walletBalance.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground mt-2">Guest earnings are referral-only: ₹{totalEarnings.toLocaleString("en-IN")}</p>
                  </div>
                  {walletBalance > 0 && (
                    <button onClick={() => setShowWithdrawForm(!showWithdrawForm)} className="btn-gold px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1">
                      <ArrowDownCircle className="w-4 h-4" /> Withdraw
                    </button>
                  )}
                </div>
              </div>

              {showWithdrawForm && (
                <div className="glass-luxe gold-border rounded-2xl p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-4">Withdraw Referral Commission</h3>
                  <div className="space-y-3">
                    <input type="number" placeholder="Amount (₹)" value={withdrawForm.amount} onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm" />
                    <input type="text" placeholder="UPI ID (e.g. name@upi)" value={withdrawForm.upi_id} onChange={e => setWithdrawForm({ ...withdrawForm, upi_id: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm" />
                    <input type="text" placeholder="Bank Details (optional)" value={withdrawForm.bank_details} onChange={e => setWithdrawForm({ ...withdrawForm, bank_details: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm" />
                    <button onClick={() => submitWithdrawal.mutate()} disabled={submitWithdrawal.isPending} className="btn-gold px-6 py-2 rounded-xl text-sm font-medium w-full">
                      {submitWithdrawal.isPending ? "Submitting..." : "Submit Withdrawal Request"}
                    </button>
                  </div>
                </div>
              )}

              <div className="glass-luxe gold-border rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">Referral Commission History</h3>
                {walletTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {walletTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === "referral_earning" ? "bg-success/20" : "bg-primary/20"}`}>
                            <ArrowDownLeft className={`w-4 h-4 ${t.type === "referral_earning" ? "text-success" : "text-primary"}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{t.description || t.type.replace(/_/g, " ")}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(t.created_at!).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-success">+₹{Number(t.amount).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No referral wallet transactions yet.</p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mt-8">
              <div className="glass-luxe gold-border rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center overflow-hidden text-primary-foreground text-2xl font-bold">
                    {profileForm.avatar_url ? (
                      <img src={getDisplayImageUrl(profileForm.avatar_url, DEFAULT_AVATAR_IMAGE)} alt={profileForm.full_name || "User"} className="w-full h-full object-cover" />
                    ) : (
                      (profile?.full_name || "U")[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">Edit Profile</h2>
                    <p className="text-sm text-muted-foreground">Fill remaining info to complete your KYC.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <input type="text" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} placeholder="Full name" className="w-full px-4 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm" />
                  <input type="text" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Phone number" className="w-full px-4 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm" />
                  <label className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm flex items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                      }}
                    />
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Uploading profile file...
                      </>
                    ) : profileForm.avatar_url ? (
                      <>
                        <Check className="w-4 h-4 text-success" />
                        {avatarFileName || "Profile file uploaded"}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload profile JPG, PNG, or PDF
                      </>
                    )}
                  </label>
                  <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending || uploadingAvatar} className="btn-gold px-6 py-2 rounded-xl text-sm font-medium">
                    {updateProfile.isPending ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {reviewBooking && (
        <Suspense fallback={null}>
          <ReviewModal open={!!reviewBooking} onClose={() => setReviewBooking(null)} bookingId={reviewBooking.id} hostId={reviewBooking.hostId} />
        </Suspense>
      )}
    </div>
  );
};

export default Dashboard;


