import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Home,
  Calendar,
  Wallet,
  Star,
  User,
  Loader2,
  Trash2,
  Plus,
  TrendingUp,
  MessageSquare,
  Edit,
  ArrowDownCircle,
  ArrowDownLeft,
  Upload,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import AnimatedCounter from "@/components/AnimatedCounter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { uploadPublicFile } from "@/lib/storage";
import { DEFAULT_AVATAR_IMAGE, DEFAULT_ROOM_IMAGE, getDisplayImageUrl } from "@/lib/media";

type HostTab = "dashboard" | "listings" | "bookings" | "earnings" | "wallet" | "reviews" | "profile";

const tabs: { id: HostTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "listings", label: "My Listings", icon: Home },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "earnings", label: "Earnings", icon: Wallet },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "reviews", label: "Reviews", icon: MessageSquare },
  { id: "profile", label: "Profile", icon: User },
];

const RUPEE_SYMBOL = "\u20B9";
const DATE_SEPARATOR = "->";
const ITEM_SEPARATOR = "\u2022";

const HostDashboardClean = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<HostTab>("dashboard");
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", upi_id: "", bank_details: "" });
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, navigate, user]);

  const { data: myRooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["host-rooms", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("host_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: hostBookings } = useQuery({
    queryKey: ["host-bookings", user?.id],
    queryFn: async () => {
      const roomIds = myRooms?.map((room) => room.id) || [];
      if (roomIds.length === 0) return [];
      const { data, error } = await supabase.from("bookings").select("*, rooms(title, location, city)").in("room_id", roomIds).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!myRooms && myRooms.length > 0,
  });

  const { data: hostReviews } = useQuery({
    queryKey: ["host-reviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").eq("host_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ["host-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    void refreshProfile();
  }, [user, refreshProfile, transactions?.length]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`host-wallet-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["host-transactions"] });
          void refreshProfile();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => {
          void refreshProfile();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, refreshProfile, user]);

  const { data: withdrawals } = useQuery({
    queryKey: ["host-withdrawals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("withdrawal_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteRoom = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Room deleted");
      queryClient.invalidateQueries({ queryKey: ["host-rooms"] });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateRoom = useMutation({
    mutationFn: async ({ roomId, updates }: { roomId: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("rooms").update(updates).eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Room updated");
      setEditingRoom(null);
      queryClient.invalidateQueries({ queryKey: ["host-rooms"] });
    },
    onError: (error: any) => toast.error(error.message),
  });
  const submitWithdrawal = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(withdrawForm.amount);
      if (!amount || amount <= 0 || amount > Number(profile?.wallet_balance || 0)) {
        throw new Error("Invalid amount");
      }
      if (!withdrawForm.upi_id && !withdrawForm.bank_details) {
        throw new Error("Enter UPI ID or bank details");
      }

      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user!.id,
        amount,
        upi_id: withdrawForm.upi_id || null,
        bank_details: withdrawForm.bank_details || null,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal request submitted!");
      setShowWithdrawForm(false);
      setWithdrawForm({ amount: "", upi_id: "", bank_details: "" });
      queryClient.invalidateQueries({ queryKey: ["host-withdrawals"] });
    },
    onError: (error: any) => toast.error(error.message),
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
      window.location.reload();
    },
    onError: (error: any) => toast.error(error.message),
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

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return null;
  }

  const totalListings = myRooms?.length || 0;
  const activeBookings = hostBookings?.filter((booking) => booking.status === "confirmed").length || 0;
  const completedBookings = hostBookings?.filter((booking) => booking.status === "completed").length || 0;
  const projectedBookingCommission = hostBookings?.filter((booking) => booking.status === "completed").reduce((sum, booking) => {
    const platformFee = Number((booking as any).platform_fee || 0);
    return sum + platformFee * 0.25;
  }, 0) || 0;
  const avgRating = hostReviews && hostReviews.length > 0 ? (hostReviews.reduce((sum, review) => sum + review.rating, 0) / hostReviews.length).toFixed(1) : "N/A";
  const walletBalance = Number(profile?.wallet_balance || 0);
  const hostCommissionTransactions = transactions?.filter((transaction) => transaction.type === "host_earning") || [];
  const referralTransactions = transactions?.filter((transaction) => transaction.type === "referral_earning") || [];
  const walletTransactions = transactions?.filter((transaction) => transaction.type === "host_earning" || transaction.type === "referral_earning" || transaction.type === "withdrawal") || [];
  const totalHostCommissions = hostCommissionTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalReferralCommissions = referralTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalWalletEarnings = totalHostCommissions + totalReferralCommissions;
  const missingKycFields = [
    !profile?.full_name ? "full name" : null,
    !profile?.phone ? "phone number" : null,
    !profile?.avatar_url ? "profile photo" : null,
  ].filter(Boolean);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Home, label: "Total Listings", value: totalListings, color: "gradient-gold" },
                { icon: Calendar, label: "Active Bookings", value: activeBookings, color: "gradient-primary" },
                { icon: TrendingUp, label: "Earnings", value: projectedBookingCommission, prefix: RUPEE_SYMBOL, color: "gradient-warm" },
                { icon: Star, label: "Avg Rating", value: avgRating, color: "gradient-gold", isText: true },
              ].map((stat, index) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="glass-luxe rounded-2xl gold-border p-5 gold-glow">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                    <stat.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  {stat.isText ? <p className="text-xl font-semibold text-foreground mt-1">{stat.value}</p> : <p className="text-xl font-semibold text-foreground mt-1"><AnimatedCounter end={Number(stat.value)} prefix={stat.prefix || ""} /></p>}
                </motion.div>
              ))}
            </div>

            <div className="glass-luxe gold-border rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Recent Bookings</h3>
              {hostBookings && hostBookings.length > 0 ? (
                <div className="space-y-2">
                  {hostBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">{(booking as any).rooms?.title || "Room"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(booking.check_in).toLocaleDateString()} {DATE_SEPARATOR} {new Date(booking.check_out).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${booking.status === "completed" ? "bg-success/20 text-success" : booking.status === "confirmed" ? "bg-primary/20 text-primary" : booking.status === "cancelled" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>{booking.status}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No bookings yet.</p>}
            </div>
          </div>
        );

      case "listings":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">My Listings ({totalListings})</h2>
              <Link to="/host" className="btn-gold px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Add Room</Link>
            </div>
            {roomsLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : myRooms && myRooms.length > 0 ? (
              <div className="space-y-3">
                {myRooms.map((room) => (
                  <div key={room.id} className="glass-luxe rounded-xl gold-border p-4">
                    {editingRoom?.id === room.id ? (
                      <div className="space-y-3">
                        <Input value={editingRoom.title} onChange={(event) => setEditingRoom({ ...editingRoom, title: event.target.value })} placeholder="Title" />
                        <Input value={editingRoom.price} onChange={(event) => setEditingRoom({ ...editingRoom, price: event.target.value })} placeholder="Price" type="number" />
                        <Textarea value={editingRoom.description || ""} onChange={(event) => setEditingRoom({ ...editingRoom, description: event.target.value })} placeholder="Description" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateRoom.mutate({ roomId: room.id, updates: { title: editingRoom.title, price: parseFloat(editingRoom.price), description: editingRoom.description } })} disabled={updateRoom.isPending}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={getDisplayImageUrl(room.image_url, DEFAULT_ROOM_IMAGE)} className="w-14 h-14 rounded-lg object-cover" alt="" />
                          <div>
                            <p className="font-semibold text-foreground text-sm">{room.title}</p>
                            <p className="text-xs text-muted-foreground">{room.city} {ITEM_SEPARATOR} {RUPEE_SYMBOL}{Number(room.price).toLocaleString("en-IN")}/night</p>
                            <div className="flex gap-2 mt-1">
                              {room.is_approved && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">Approved</span>}
                              {!room.is_approved && <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">Pending Approval</span>}
                              {room.is_premium && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Premium</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingRoom({ ...room, price: String(room.price) })} className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"><Edit className="w-3 h-3" /></button>
                          <button onClick={() => { if (confirm("Delete this room?")) deleteRoom.mutate(room.id); }} className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors" disabled={deleteRoom.isPending}><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <div className="text-center py-8"><p className="text-muted-foreground text-sm">No listings yet.</p><Link to="/host" className="inline-block mt-3 btn-gold px-6 py-2 rounded-xl text-sm font-medium">List Your First Room</Link></div>}
          </div>
        );
      case "bookings":
        return (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Bookings for My Rooms</h2>
            {hostBookings && hostBookings.length > 0 ? (
              <div className="space-y-3">
                {hostBookings.map((booking) => (
                  <div key={booking.id} className="glass-luxe rounded-xl gold-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{(booking as any).rooms?.title || "Room"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(booking.check_in).toLocaleDateString()} {DATE_SEPARATOR} {new Date(booking.check_out).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">Guests: {booking.guests} {ITEM_SEPARATOR} Total: {RUPEE_SYMBOL}{Number(booking.total_amount).toLocaleString("en-IN")}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${booking.status === "completed" ? "bg-success/20 text-success" : booking.status === "confirmed" ? "bg-primary/20 text-primary" : booking.status === "cancelled" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>{booking.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground text-sm text-center py-8">No bookings for your rooms yet.</p>}
          </div>
        );

      case "earnings":
        return (
          <div className="space-y-6">
            <div className="glass-luxe gold-border rounded-2xl p-6 gold-glow">
              <h3 className="font-display text-lg font-bold text-foreground mb-2">Total Earnings</h3>
              <p className="text-4xl font-semibold text-gradient">{RUPEE_SYMBOL}{projectedBookingCommission.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground mt-2">25% of platform fee from {completedBookings} completed bookings</p>
            </div>
            <div className="glass-luxe gold-border rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Completed Bookings</h3>
              {hostBookings?.filter((booking) => booking.status === "completed").map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(booking as any).rooms?.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(booking.check_in).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-bold text-success">+{RUPEE_SYMBOL}{(Number((booking as any).platform_fee || 0) * 0.25).toLocaleString("en-IN")}</span>
                </div>
              )) || <p className="text-sm text-muted-foreground text-center py-4">No completed bookings yet.</p>}
            </div>
          </div>
        );

      case "wallet":
        return (
          <div className="space-y-6">
            <div className="glass-luxe gold-border rounded-2xl p-6 gold-glow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">Host Wallet</h3>
                  <p className="text-4xl font-semibold text-gradient">{RUPEE_SYMBOL}{walletBalance.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground mt-2">Booking commissions: {RUPEE_SYMBOL}{totalHostCommissions.toLocaleString("en-IN")} {ITEM_SEPARATOR} Referrals: {RUPEE_SYMBOL}{totalReferralCommissions.toLocaleString("en-IN")}</p>
                </div>
                {walletBalance > 0 && <button onClick={() => setShowWithdrawForm(!showWithdrawForm)} className="btn-gold px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1"><ArrowDownCircle className="w-4 h-4" /> Withdraw Request</button>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-luxe gold-border rounded-2xl p-5"><p className="text-xs text-muted-foreground font-medium">Available Balance</p><p className="text-2xl font-semibold text-foreground mt-2">{RUPEE_SYMBOL}{walletBalance.toLocaleString("en-IN")}</p></div>
              <div className="glass-luxe gold-border rounded-2xl p-5"><p className="text-xs text-muted-foreground font-medium">Booking Commissions</p><p className="text-2xl font-semibold text-foreground mt-2">{RUPEE_SYMBOL}{totalHostCommissions.toLocaleString("en-IN")}</p></div>
              <div className="glass-luxe gold-border rounded-2xl p-5"><p className="text-xs text-muted-foreground font-medium">Total Wallet Earnings</p><p className="text-2xl font-semibold text-foreground mt-2">{RUPEE_SYMBOL}{totalWalletEarnings.toLocaleString("en-IN")}</p></div>
            </div>

            {showWithdrawForm && (
              <div className="glass-luxe gold-border rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">Withdraw Wallet Balance</h3>
                <div className="space-y-3">
                  <Input type="number" placeholder={`Amount (${RUPEE_SYMBOL})`} value={withdrawForm.amount} onChange={(event) => setWithdrawForm({ ...withdrawForm, amount: event.target.value })} />
                  <Input type="text" placeholder="UPI ID (e.g. name@upi)" value={withdrawForm.upi_id} onChange={(event) => setWithdrawForm({ ...withdrawForm, upi_id: event.target.value })} />
                  <Input type="text" placeholder="Bank Details (optional)" value={withdrawForm.bank_details} onChange={(event) => setWithdrawForm({ ...withdrawForm, bank_details: event.target.value })} />
                  <Button onClick={() => submitWithdrawal.mutate()} disabled={submitWithdrawal.isPending} className="w-full">{submitWithdrawal.isPending ? "Submitting..." : "Submit Withdrawal Request"}</Button>
                </div>
              </div>
            )}

            <div className="glass-luxe gold-border rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Wallet Activity</h3>
              {walletTransactions.length > 0 ? (
                <div className="space-y-2">
                  {walletTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transaction.type === "withdrawal" ? "bg-primary/20" : "bg-success/20"}`}><ArrowDownLeft className={`w-4 h-4 ${transaction.type === "withdrawal" ? "text-primary" : "text-success"}`} /></div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{transaction.description || transaction.type.replace(/_/g, " ")}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{transaction.type === "host_earning" ? "Booking commission" : transaction.type.replace(/_/g, " ")}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(transaction.created_at!).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${transaction.type === "withdrawal" ? "text-primary" : "text-success"}`}>{transaction.type === "withdrawal" ? "-" : "+"}{RUPEE_SYMBOL}{Number(transaction.amount).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No wallet transactions yet.</p>}
            </div>

            <div className="glass-luxe gold-border rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Withdrawal Requests</h3>
              {withdrawals && withdrawals.length > 0 ? (
                <div className="space-y-2">
                  {withdrawals.map((withdrawal: any) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                      <div><p className="text-sm font-medium text-foreground">{RUPEE_SYMBOL}{Number(withdrawal.amount).toLocaleString("en-IN")}</p><p className="text-[10px] text-muted-foreground">{new Date(withdrawal.created_at).toLocaleDateString()}</p></div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${withdrawal.status === "approved" ? "bg-success/20 text-success" : withdrawal.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>{withdrawal.status}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No withdrawal requests yet.</p>}
            </div>
          </div>
        );
      case "reviews":
        return (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Reviews ({hostReviews?.length || 0})</h2>
            {hostReviews && hostReviews.length > 0 ? (
              <div className="space-y-3">
                {hostReviews.map((review) => (
                  <div key={review.id} className="glass-luxe rounded-xl gold-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((score) => <Star key={score} className={`w-3 h-3 ${score <= review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />)}</div>
                      <span className="text-xs text-muted-foreground">{new Date(review.created_at!).toLocaleDateString()}</span>
                    </div>
                    {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
                    {review.tags && review.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{review.tags.map((tag: string) => <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{tag}</span>)}</div>}
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground text-sm text-center py-8">No reviews yet.</p>}
          </div>
        );

      case "profile":
        return (
          <div className="space-y-6">
            <div className="glass-luxe gold-border rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center overflow-hidden text-primary-foreground text-2xl font-bold">
                  {profileForm.avatar_url ? (
                    <img src={getDisplayImageUrl(profileForm.avatar_url, DEFAULT_AVATAR_IMAGE)} alt={profileForm.full_name || "Host"} className="w-full h-full object-cover" />
                  ) : (
                    (profile?.full_name || "H")[0].toUpperCase()
                  )}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">{profile?.full_name || "Host"}</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex gap-2 mt-1">
                    {profile?.host_badge && profile.host_badge !== "none" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{profile.host_badge}</span>}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">Score: {Number(profile?.host_score || 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Referral Code:</span> <span className="font-mono font-bold text-foreground">{profile?.referral_code}</span></div>
                <div><span className="text-muted-foreground">Wallet:</span> <span className="font-bold text-foreground">{RUPEE_SYMBOL}{Number(profile?.wallet_balance || 0).toLocaleString("en-IN")}</span></div>
                <div><span className="text-muted-foreground">Total Listings:</span> <span className="font-bold text-foreground">{totalListings}</span></div>
                <div><span className="text-muted-foreground">Completed Bookings:</span> <span className="font-bold text-foreground">{completedBookings}</span></div>
              </div>
              <div className="space-y-3 mt-6">
                <Input value={profileForm.full_name} onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })} placeholder="Full name" />
                <Input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} placeholder="Phone number" />
                <label className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm flex items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
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
                <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending || uploadingAvatar}>
                  {updateProfile.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      <Navbar />

      {/* Mobile Sidebar Overlay */}
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
              {(profile?.full_name || "H")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-foreground truncate">{profile?.full_name || "Host"}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Host Panel</p>
            </div>
          </div>
          <button className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors" onClick={() => setSidebarOpen(false)}>
            <ArrowDownLeft className="w-5 h-5 text-muted-foreground" />
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
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col pt-16 lg:pt-20">
        {/* Mobile Sub-Header */}
        <header className="md:hidden sticky top-16 z-[50] flex items-center justify-between p-4 glass-navbar border-b border-border">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-foreground text-sm uppercase tracking-wider">{tabs.find(t => t.id === activeTab)?.label}</h1>
          </div>
          <button className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors" onClick={() => setSidebarOpen(true)}>
            <LayoutDashboard className="w-5 h-5 text-foreground" />
          </button>
        </header>

        <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-5xl w-full mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 hidden md:block">
            <h1 className="font-display text-3xl font-bold text-foreground">{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your listings and bookings</p>
          </motion.div>

          {profile?.kyc_status !== "verified" && missingKycFields.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 glass-luxe gold-border rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning">KYC Update From Admin</p>
              <p className="text-sm text-foreground mt-2">
                Please add your {missingKycFields.join(", ")} to complete KYC verification.
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>{renderContent()}</motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default HostDashboardClean;
