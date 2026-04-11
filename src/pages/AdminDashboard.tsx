import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Users, Home, Calendar, CreditCard, GitBranch, Shield, Settings, 
  Loader2, Check, X, Eye, Ban, Unlock, Star, Trash2, ChevronRight, LogOut,
  TrendingUp, Wallet, BarChart3, AlertTriangle, MessageSquare, Flag, ArrowDownCircle, Menu
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AnimatedCounter from "@/components/AnimatedCounter";
import { DEFAULT_AVATAR_IMAGE, DEFAULT_ROOM_IMAGE, getDisplayImageUrl } from "@/lib/media";

type AdminTab = "overview" | "users" | "rooms" | "bookings" | "payments" | "referrals" | "reviews" | "reports" | "kyc" | "withdrawals" | "settings";

const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "rooms", label: "Rooms", icon: Home },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowDownCircle },
  { id: "referrals", label: "Referrals", icon: GitBranch },
  { id: "reviews", label: "Reviews", icon: MessageSquare },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "kyc", label: "KYC", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
];

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedKycProfile, setSelectedKycProfile] = useState<any | null>(null);

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("*"); return data || []; },
    enabled: isAdmin === true,
  });

  const { data: allRooms } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => { const { data } = await supabase.from("rooms").select("*"); return data || []; },
    enabled: isAdmin === true,
  });

  const { data: allBookings } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => { const { data } = await supabase.from("bookings").select("*, rooms(title, host_id)"); return data || []; },
    enabled: isAdmin === true,
  });

  const { data: allPayments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => { const { data } = await supabase.from("payment_proofs").select("*"); return data || []; },
    enabled: isAdmin === true,
  });

  const { data: allTransactions } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => { const { data } = await supabase.from("transactions").select("*"); return data || []; },
    enabled: isAdmin === true,
  });

  const { data: allReviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => { const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false }); return data || []; },
    enabled: isAdmin === true,
  });

  const { data: allReports } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => { const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false }); return data || []; },
    enabled: isAdmin === true,
  });

  const { data: allWithdrawals } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => { const { data } = await supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }); return data || []; },
    enabled: isAdmin === true,
  });

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_proofs" }, () => queryClient.invalidateQueries({ queryKey: ["admin-payments"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => queryClient.invalidateQueries({ queryKey: ["admin-reports"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, queryClient]);

  // Helper to get profile name by user_id
  const getNameByUserId = (userId: string) => allProfiles?.find(p => p.user_id === userId)?.full_name || "Unknown";

  const blockUser = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_blocked: blocked } as any).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { blocked }) => { toast.success(blocked ? "User blocked" : "User unblocked"); queryClient.invalidateQueries({ queryKey: ["admin-profiles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Delete rooms, then bookings, then profile
      await supabase.from("rooms").delete().eq("host_id", userId);
      await supabase.from("bookings").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("User permanently deleted"); queryClient.invalidateQueries({ queryKey: ["admin-profiles"] }); queryClient.invalidateQueries({ queryKey: ["admin-rooms"] }); queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRoom = useMutation({
    mutationFn: async ({ roomId, updates }: { roomId: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("rooms").update(updates).eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Room updated"); queryClient.invalidateQueries({ queryKey: ["admin-rooms"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Room deleted"); queryClient.invalidateQueries({ queryKey: ["admin-rooms"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateBooking = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: "pending" | "confirmed" | "completed" | "cancelled" }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
      if (error) throw error;
      if (status === "completed") {
        const { error: referralError } = await (supabase.rpc as any)("process_referral_commission", { booking_id: bookingId });
        if (referralError) throw referralError;
        const { error: hostError } = await (supabase.rpc as any)("process_host_earning", { booking_id: bookingId });
        if (hostError) throw hostError;
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(`Booking ${status}`);
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePayment = useMutation({
    mutationFn: async ({ paymentId, bookingId, action }: { paymentId: string; bookingId: string; action: "approved" | "rejected" }) => {
      const { error } = await supabase.from("payment_proofs").update({ status: action, reviewed_by: user!.id } as any).eq("id", paymentId);
      if (error) throw error;
      if (action === "approved") {
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .select("id, check_out")
          .eq("id", bookingId)
          .single();
        if (bookingError) throw bookingError;

        const checkoutDate = new Date(booking.check_out);
        checkoutDate.setHours(23, 59, 59, 999);
        const shouldCompleteNow = checkoutDate.getTime() <= Date.now();
        const nextStatus: "confirmed" | "completed" = shouldCompleteNow ? "completed" : "confirmed";

        const { error: statusError } = await supabase.from("bookings").update({ status: nextStatus }).eq("id", bookingId);
        if (statusError) throw statusError;

        if (nextStatus === "completed") {
          const { error: referralError } = await (supabase.rpc as any)("process_referral_commission", { booking_id: bookingId });
          if (referralError) throw referralError;
          const { error: hostError } = await (supabase.rpc as any)("process_host_earning", { booking_id: bookingId });
          if (hostError) throw hostError;
        }
      } else {
        const { error: cancelError } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
        if (cancelError) throw cancelError;
      }
    },
    onSuccess: (_, { action }) => {
      toast.success(`Payment ${action}`);
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateReport = useMutation({
    mutationFn: async ({ reportId, status, note }: { reportId: string; status: string; note?: string }) => {
      const { error } = await supabase.from("reports").update({ status, admin_note: note || null } as any).eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Report updated"); queryClient.invalidateQueries({ queryKey: ["admin-reports"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateKyc = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ kyc_status: status }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => { toast.success(`KYC ${status}`); queryClient.invalidateQueries({ queryKey: ["admin-profiles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleWithdrawal = useMutation({
    mutationFn: async ({ id, action, userId, amount }: { id: string; action: "approved" | "rejected"; userId: string; amount: number }) => {
      const { error } = await supabase.from("withdrawal_requests").update({ status: action } as any).eq("id", id);
      if (error) throw error;
      if (action === "approved") {
        await supabase.from("profiles").update({ wallet_balance: (allProfiles?.find(p => p.user_id === userId)?.wallet_balance || 0) - amount } as any).eq("user_id", userId);
        await supabase.from("transactions").insert({
          user_id: userId,
          amount,
          type: "withdrawal",
          description: "Wallet withdrawal approved",
        } as any);
      }
    },
    onSuccess: (_, { action }) => {
      toast.success(`Withdrawal ${action}`);
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (roleLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center glass-luxe rounded-2xl p-10">
          <AlertTriangle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have admin privileges.</p>
          <button onClick={() => navigate("/")} className="btn-gold px-6 py-3 rounded-xl">Go Home</button>
        </div>
      </div>
    );
  }

  // Revenue only from completed bookings
  const completedBookings = allBookings?.filter(b => b.status === "completed") || [];
  const totalRevenue = completedBookings.reduce((s, b) => s + Number(b.total_amount), 0);
  const totalPlatformFees = completedBookings.reduce((s, b) => s + Number((b as any).platform_fee || b.service_fee || 0), 0);
  const totalCommissions = allTransactions?.filter(t => t.type === "referral_earning").reduce((s, t) => s + Number(t.amount), 0) || 0;
  const pendingPayments = allPayments?.filter(p => p.status === "pending").length || 0;
  const pendingReports = allReports?.filter((r: any) => r.status === "pending").length || 0;
  const pendingWithdrawals = allWithdrawals?.filter((w: any) => w.status === "pending").length || 0;
  // Show every profile in the admin dashboard, including rejected KYC users.
  const activeProfiles = allProfiles || [];
  const rejectedProfiles = allProfiles?.filter(p => p.kyc_status === "rejected") || [];
  const pendingKyc = allProfiles?.filter(p => p.kyc_status === "pending") || [];

  const openKycProfile = (profile: any) => {
    setSelectedKycProfile(profile);
  };

  const missingKycFields = selectedKycProfile
    ? [
        !selectedKycProfile.full_name ? "Full name" : null,
        !selectedKycProfile.phone ? "Phone number" : null,
        !selectedKycProfile.avatar_url ? "Profile photo" : null,
      ].filter(Boolean)
    : [];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Users, label: "All Users", value: activeProfiles.length, color: "gradient-gold" },
                { icon: Calendar, label: "Completed Bookings", value: completedBookings.length, color: "gradient-primary" },
                { icon: TrendingUp, label: "Revenue (Completed)", value: totalRevenue, prefix: "₹", color: "gradient-warm" },
                { icon: CreditCard, label: "Pending Payments", value: pendingPayments, color: "gradient-primary" },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-luxe rounded-2xl gold-border p-5 gold-glow">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                    <stat.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-xl font-semibold text-foreground mt-1"><AnimatedCounter end={stat.value} prefix={stat.prefix || ""} /></p>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="glass-luxe rounded-2xl gold-border p-6">
                <h3 className="font-display text-sm font-bold text-muted-foreground mb-2">Platform Fees Earned</h3>
                <p className="text-2xl font-semibold text-gradient">₹<AnimatedCounter end={totalPlatformFees} /></p>
              </div>
              <div className="glass-luxe rounded-2xl gold-border p-6">
                <h3 className="font-display text-sm font-bold text-muted-foreground mb-2">Referral Commissions</h3>
                <p className="text-2xl font-semibold text-gradient">₹<AnimatedCounter end={totalCommissions} /></p>
              </div>
              <div className="glass-luxe rounded-2xl gold-border p-6">
                <h3 className="font-display text-sm font-bold text-muted-foreground mb-2">Pending Withdrawals</h3>
                <p className="text-2xl font-semibold text-foreground"><AnimatedCounter end={pendingWithdrawals} /></p>
              </div>
            </div>
          </div>
        );

      case "users":
        return (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">All Users ({activeProfiles.length})</h2>
            <div className="space-y-3">
              {activeProfiles.map((p) => (
                <div key={p.id} className="glass-luxe rounded-xl gold-border p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{p.full_name || "No name"}</p>
                    <p className="text-xs text-muted-foreground">Code: {p.referral_code} • Wallet: ₹{Number(p.wallet_balance).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">
                      KYC: <span className={`font-medium ${p.kyc_status === "verified" ? "text-success" : "text-warning"}`}>{p.kyc_status}</span>
                      {p.is_blocked && <span className="text-destructive font-bold ml-2">BLOCKED</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {p.is_blocked ? (
                      <button onClick={() => blockUser.mutate({ userId: p.user_id, blocked: false })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium hover:bg-success/30 transition-colors" disabled={blockUser.isPending}>
                        <Unlock className="w-3 h-3" /> Unblock
                      </button>
                    ) : (
                      <button onClick={() => blockUser.mutate({ userId: p.user_id, blocked: true })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors" disabled={blockUser.isPending}>
                        <Ban className="w-3 h-3" /> Block
                      </button>
                    )}
                    <button onClick={() => { if (confirm("Permanently delete this user and all their data?")) deleteUser.mutate(p.user_id); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors" disabled={deleteUser.isPending}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "rooms":
        return (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Rooms ({allRooms?.length})</h2>
            <div className="space-y-3">
              {allRooms?.map((r) => (
                <div key={r.id} className="glass-luxe rounded-xl gold-border p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={getDisplayImageUrl(r.image_url, DEFAULT_ROOM_IMAGE)} className="w-14 h-14 rounded-lg object-cover" alt="" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.city} • ₹{Number(r.price).toLocaleString("en-IN")}/night • Host: {getNameByUserId(r.host_id)}</p>
                      <div className="flex gap-2 mt-1">
                        {r.is_approved && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">Approved</span>}
                        {r.is_premium && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Premium</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!r.is_approved && (
                      <button onClick={() => updateRoom.mutate({ roomId: r.id, updates: { is_approved: true } })} className="px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium hover:bg-success/30 transition-colors" disabled={updateRoom.isPending}><Check className="w-3 h-3" /></button>
                    )}
                    <button onClick={() => updateRoom.mutate({ roomId: r.id, updates: { is_premium: !r.is_premium } })} className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors" disabled={updateRoom.isPending}><Star className="w-3 h-3" /></button>
                    <button onClick={() => deleteRoom.mutate(r.id)} className="px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors" disabled={deleteRoom.isPending}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              {(!allRooms || allRooms.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">No rooms listed yet.</p>}
            </div>
          </div>
        );

      case "bookings":
        return (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Bookings ({allBookings?.length})</h2>
            <div className="space-y-3">
              {allBookings?.map((b) => {
                const guestName = getNameByUserId(b.user_id);
                const hostId = (b as any).rooms?.host_id;
                const hostName = hostId ? getNameByUserId(hostId) : "N/A";
                return (
                  <div key={b.id} className="glass-luxe rounded-xl gold-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{(b as any).rooms?.title || "Room"}</p>
                        <p className="text-xs text-muted-foreground">Guest: <strong>{guestName}</strong> • Host: <strong>{hostName}</strong></p>
                        <p className="text-xs text-muted-foreground">{new Date(b.check_in).toLocaleDateString()} - {new Date(b.check_out).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        b.status === "completed" ? "bg-success/20 text-success" :
                        b.status === "confirmed" ? "bg-primary/20 text-primary" :
                        b.status === "cancelled" ? "bg-destructive/20 text-destructive" :
                        "bg-warning/20 text-warning"
                      }`}>{b.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground space-x-3">
                        <span>Room: ₹{Number((b as any).room_price || 0).toLocaleString("en-IN")}</span>
                        <span>Fee: ₹{Number((b as any).platform_fee || b.service_fee || 0).toLocaleString("en-IN")}</span>
                        <span className="font-semibold text-foreground">Total: ₹{Number(b.total_amount).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex gap-2">
                        {b.status === "pending" && <button onClick={() => updateBooking.mutate({ bookingId: b.id, status: "confirmed" })} className="px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium" disabled={updateBooking.isPending}>Confirm</button>}
                        {b.status === "confirmed" && <button onClick={() => updateBooking.mutate({ bookingId: b.id, status: "completed" })} className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium" disabled={updateBooking.isPending}>Complete</button>}
                        {b.status !== "cancelled" && b.status !== "completed" && <button onClick={() => updateBooking.mutate({ bookingId: b.id, status: "cancelled" })} className="px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium" disabled={updateBooking.isPending}>Cancel</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!allBookings || allBookings.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">No bookings yet.</p>}
            </div>
          </div>
        );

      case "payments":
        return (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Manual Payments ({allPayments?.length})</h2>
            <div className="space-y-3">
              {allPayments?.map((p) => {
                const guestName = getNameByUserId(p.user_id);
                return (
                  <div key={p.id} className="glass-luxe rounded-xl gold-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <a href={p.screenshot_url} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity">
                          <img src={p.screenshot_url} className="w-full h-full object-cover" alt="Screenshot" />
                        </a>
                        <div>
                          <p className="font-semibold text-foreground text-sm">₹{Number(p.amount).toLocaleString("en-IN")}</p>
                          <p className="text-xs text-muted-foreground">Guest: <strong>{guestName}</strong></p>
                          <p className="text-xs text-muted-foreground">Ref: {p.upi_reference || "N/A"} • {new Date(p.created_at!).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.status === "approved" ? "bg-success/20 text-success" : p.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>{p.status}</span>
                        {p.status === "pending" && (
                          <>
                            <button onClick={() => handlePayment.mutate({ paymentId: p.id, bookingId: p.booking_id, action: "approved" })} className="px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium hover:bg-success/30 transition-colors" disabled={handlePayment.isPending}><Check className="w-3 h-3" /></button>
                            <button onClick={() => handlePayment.mutate({ paymentId: p.id, bookingId: p.booking_id, action: "rejected" })} className="px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors" disabled={handlePayment.isPending}><X className="w-3 h-3" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!allPayments || allPayments.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">No payment proofs submitted.</p>}
            </div>
          </div>
        );

      case "withdrawals":
        return (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Withdrawal Requests ({allWithdrawals?.length || 0})</h2>
            <div className="space-y-3">
              {allWithdrawals?.map((w: any) => {
                const userName = getNameByUserId(w.user_id);
                return (
                  <div key={w.id} className="glass-luxe rounded-xl gold-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{userName}</p>
                        <p className="text-xs text-muted-foreground">Amount: <strong className="text-foreground">₹{Number(w.amount).toLocaleString("en-IN")}</strong></p>
                        <p className="text-xs text-muted-foreground">UPI: {w.upi_id || "N/A"} {w.bank_details ? `• Bank: ${w.bank_details}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${w.status === "approved" ? "bg-success/20 text-success" : w.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>{w.status}</span>
                        {w.status === "pending" && (
                          <>
                            <button onClick={() => handleWithdrawal.mutate({ id: w.id, action: "approved", userId: w.user_id, amount: Number(w.amount) })} className="px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium hover:bg-success/30 transition-colors" disabled={handleWithdrawal.isPending}><Check className="w-3 h-3" /></button>
                            <button onClick={() => handleWithdrawal.mutate({ id: w.id, action: "rejected", userId: w.user_id, amount: 0 })} className="px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors" disabled={handleWithdrawal.isPending}><X className="w-3 h-3" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!allWithdrawals || allWithdrawals.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">No withdrawal requests.</p>}
            </div>
          </div>
        );

      case "referrals":
        return (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Referral Network</h2>
            <div className="glass-luxe rounded-2xl gold-border p-6">
              <p className="text-2xl font-semibold text-gradient mb-4">₹<AnimatedCounter end={totalCommissions} /> Total Commissions</p>
              <p className="text-xs text-muted-foreground mb-4">Referral model: Level 1 = 5%, Level 2 = 2%, Level 3 = 1% of total booking amount</p>
              <div className="space-y-3">
                {allProfiles?.filter(p => p.referred_by).map((p) => {
                  const referrer = allProfiles?.find(r => r.id === p.referred_by);
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <GitBranch className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm text-foreground font-medium">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">Referred by: {referrer?.full_name || "Unknown"}</p>
                      </div>
                    </div>
                  );
                })}
                {!allProfiles?.some(p => p.referred_by) && <p className="text-muted-foreground text-sm text-center py-4">No referrals yet.</p>}
              </div>
            </div>
          </div>
        );

      case "reviews":
        return (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Reviews ({allReviews?.length})</h2>
            <div className="space-y-3">
              {allReviews?.map((r: any) => {
                const host = allProfiles?.find(p => p.user_id === r.host_id);
                const reviewer = allProfiles?.find(p => p.user_id === r.user_id);
                return (
                  <div key={r.id} className="glass-luxe rounded-xl gold-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">by {reviewer?.full_name || "Guest"} → {host?.full_name || "Host"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                    {r.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {(!allReviews || allReviews.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">No reviews yet.</p>}
            </div>
          </div>
        );

      case "reports":
        return (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Reports ({allReports?.length})</h2>
            <div className="space-y-3">
              {allReports?.map((r: any) => {
                const host = allProfiles?.find(p => p.user_id === r.host_id);
                const reporter = allProfiles?.find(p => p.user_id === r.user_id);
                return (
                  <div key={r.id} className="glass-luxe rounded-xl gold-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-destructive/20 text-destructive mr-2">{r.issue_type}</span>
                        <span className="text-xs text-muted-foreground">By: {reporter?.full_name || "User"} → Against: {host?.full_name || "Host"}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.status === "resolved" ? "bg-success/20 text-success" : r.status === "dismissed" ? "bg-muted text-muted-foreground" : "bg-warning/20 text-warning"}`}>{r.status}</span>
                    </div>
                    {r.description && <p className="text-sm text-foreground mb-2">{r.description}</p>}
                    {r.proof_url && <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View proof →</a>}
                    {r.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => updateReport.mutate({ reportId: r.id, status: "resolved", note: "Reviewed and action taken" })} className="px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium hover:bg-success/30 transition-colors" disabled={updateReport.isPending}>Resolve</button>
                        <button onClick={() => { updateReport.mutate({ reportId: r.id, status: "resolved" }); blockUser.mutate({ userId: r.host_id, blocked: true }); }} className="px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors">Ban Host</button>
                        <button onClick={() => updateReport.mutate({ reportId: r.id, status: "dismissed", note: "Reviewed and dismissed" })} className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-secondary transition-colors" disabled={updateReport.isPending}>Dismiss</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {(!allReports || allReports.length === 0) && <p className="text-muted-foreground text-sm text-center py-8">No reports yet.</p>}
            </div>
          </div>
        );

      case "kyc":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground mb-4">Pending KYC ({pendingKyc.length})</h2>
              <div className="space-y-3">
                {pendingKyc.map((p) => (
                  <div key={p.id} className="glass-luxe rounded-xl gold-border p-4 flex items-center justify-between">
                    <div>
                      <button onClick={() => openKycProfile(p)} className="font-semibold text-foreground text-sm hover:text-primary transition-colors text-left">
                        {p.full_name || "No name"}
                      </button>
                      <p className="text-xs text-muted-foreground mt-1">{p.phone || "Phone missing"}</p>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-warning/20 text-warning">pending</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateKyc.mutate({ userId: p.user_id, status: "verified" })} className="px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium" disabled={updateKyc.isPending}>Approve</button>
                      <button onClick={() => updateKyc.mutate({ userId: p.user_id, status: "rejected" })} className="px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium" disabled={updateKyc.isPending}>Reject</button>
                    </div>
                  </div>
                ))}
                {pendingKyc.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No pending KYC requests.</p>}
              </div>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground mb-4">Rejected KYC ({rejectedProfiles.length})</h2>
              <div className="space-y-3">
                {rejectedProfiles.map((p) => (
                  <div key={p.id} className="glass-card rounded-xl gold-border p-4 flex items-center justify-between">
                    <div>
                      <button onClick={() => openKycProfile(p)} className="font-semibold text-foreground text-sm hover:text-primary transition-colors text-left">
                        {p.full_name || "No name"}
                      </button>
                      <p className="text-xs text-muted-foreground mt-1">{p.phone || "Phone missing"}</p>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/20 text-destructive">rejected</span>
                    </div>
                    <button onClick={() => updateKyc.mutate({ userId: p.user_id, status: "verified" })} className="px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium" disabled={updateKyc.isPending}>Re-approve</button>
                  </div>
                ))}
                {rejectedProfiles.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No rejected profiles.</p>}
              </div>
            </div>
            {selectedKycProfile && (
              <div className="glass-card rounded-2xl gold-border p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground">{selectedKycProfile.full_name || "No name"}</h3>
                    <p className="text-sm text-muted-foreground">User ID: {selectedKycProfile.user_id}</p>
                    <p className="text-xs text-muted-foreground mt-1">Created: {selectedKycProfile.created_at ? new Date(selectedKycProfile.created_at).toLocaleDateString() : "N/A"}</p>
                  </div>
                  <button onClick={() => setSelectedKycProfile(null)} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:text-foreground">
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Full Name:</span> <span className="text-foreground font-medium">{selectedKycProfile.full_name || "Missing"}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground font-medium">{selectedKycProfile.phone || "Missing"}</span></div>
                  <div><span className="text-muted-foreground">Referral Code:</span> <span className="text-foreground font-medium">{selectedKycProfile.referral_code || "Missing"}</span></div>
                  <div><span className="text-muted-foreground">KYC Status:</span> <span className="text-foreground font-medium capitalize">{selectedKycProfile.kyc_status || "pending"}</span></div>
                  <div><span className="text-muted-foreground">Wallet Balance:</span> <span className="text-foreground font-medium">₹{Number(selectedKycProfile.wallet_balance || 0).toLocaleString("en-IN")}</span></div>
                  <div><span className="text-muted-foreground">Profile Photo:</span> <span className="text-foreground font-medium">{selectedKycProfile.avatar_url ? "Added" : "Missing"}</span></div>
                </div>

                {selectedKycProfile.avatar_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Profile Photo</p>
                    <img src={getDisplayImageUrl(selectedKycProfile.avatar_url, DEFAULT_AVATAR_IMAGE)} alt={selectedKycProfile.full_name || "Profile"} className="w-24 h-24 rounded-xl object-cover border border-border" />
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Missing Information</p>
                  {missingKycFields.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {missingKycFields.map((field) => (
                        <span key={String(field)} className="text-xs px-2 py-1 rounded-full bg-warning/20 text-warning font-medium">{field}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-success">No basic profile fields are missing.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl bg-secondary/60 border border-border p-4">
                    <p className="text-sm font-medium text-foreground">Dashboard Alert Preview</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      If KYC is pending or rejected, the host or guest dashboard will automatically show the missing information listed above.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateKyc.mutate({ userId: selectedKycProfile.user_id, status: "verified" })}
                      className="px-4 py-2 rounded-lg bg-success/20 text-success text-sm font-medium"
                      disabled={updateKyc.isPending}
                    >
                      Verify KYC
                    </button>
                    <button
                      onClick={() => updateKyc.mutate({ userId: selectedKycProfile.user_id, status: "rejected" })}
                      className="px-4 py-2 rounded-lg bg-destructive/20 text-destructive text-sm font-medium"
                      disabled={updateKyc.isPending}
                    >
                      Reject KYC
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold text-foreground">Admin Settings</h2>
            <div className="glass-card rounded-2xl gold-border p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-1">UPI Payment ID</h3>
                <p className="text-sm text-muted-foreground font-mono">prashantpadekar09-2@okicici</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Platform Service Fee</h3>
                <p className="text-sm text-muted-foreground">18% of room price</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Referral Distribution</h3>
                <p className="text-sm text-muted-foreground">Level 1: 5% • Level 2: 2% • Level 3: 1% of total booking amount</p>
                <p className="text-sm text-muted-foreground">Unclaimed levels → Admin wallet</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Commission Trigger</h3>
                <p className="text-sm text-muted-foreground">Only on booking status = COMPLETED</p>
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} fixed lg:sticky top-16 lg:top-20 left-0 z-[70] transition-transform duration-300 glass-sidebar w-64 border-r border-border h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] flex flex-col shrink-0`}>
        <div className="p-6 flex items-center gap-3 border-b border-border justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shrink-0 shadow-gold">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Admin</span>
          </div>
          <button className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                activeTab === tab.id 
                  ? "gradient-gold text-primary-foreground shadow-gold" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <tab.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${activeTab === tab.id ? "text-primary-foreground" : "text-primary"}`} />
              <span>{tab.label}</span>
              {tab.id === "reports" && pendingReports > 0 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-bold">{pendingReports}</span>
              )}
              {tab.id === "payments" && pendingPayments > 0 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-warning text-warning-foreground font-bold">{pendingPayments}</span>
              )}
              {tab.id === "withdrawals" && pendingWithdrawals > 0 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-warning text-warning-foreground font-bold">{pendingWithdrawals}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border mt-auto">
          <button onClick={async () => { await signOut(); navigate("/"); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors group">
            <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-1" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col pt-16 lg:pt-20">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-16 z-30 flex items-center justify-between p-4 glass-navbar border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-foreground text-sm uppercase tracking-wider">{tabs.find(t => t.id === activeTab)?.label}</h1>
          </div>
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-foreground" />
          </button>
        </header>

        <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 hidden md:block">
            <h1 className="font-display text-3xl font-bold text-foreground leading-tight">{tabs.find(t => t.id === activeTab)?.label}</h1>
            <p className="text-muted-foreground text-sm mt-1">BachloRoom Premium Admin Panel</p>
          </motion.div>
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab} 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }} 
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
