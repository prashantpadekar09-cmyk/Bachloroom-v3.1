import { lazy, Suspense, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, Wifi, Wind, UtensilsCrossed, Shield, ArrowLeft, Share2, Heart, Check, Loader2, Flag, MessageSquare } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import HostContactCard from "@/components/HostContactCard";
import { DEFAULT_ROOM_IMAGE, getDisplayImageUrl } from "@/lib/media";

const PLATFORM_FEE_RATE = 0.18;
const RUPEE_SYMBOL = "\u20B9";
const BACK_ARROW = "\u2190";
const BULLET_SEPARATOR = "\u2022";
const DOT_SEPARATOR = "\u00B7";
const MULTIPLY_SYMBOL = "\u00D7";
const STAR_BADGE = "\u2B50";
const UPIPaymentModal = lazy(() => import("@/components/UPIPaymentModal"));
const ReviewModal = lazy(() => import("@/components/ReviewModal"));
const ReportHostModal = lazy(() => import("@/components/ReportHostModal"));

const amenityIcons: Record<string, typeof Wifi> = {
  WiFi: Wifi, AC: Wind, Breakfast: UtensilsCrossed, Kitchen: UtensilsCrossed, Meals: UtensilsCrossed,
};

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [booking, setBooking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const { data: dbRoom, isLoading } = useQuery({
    queryKey: ["room", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: hostProfile } = useQuery({
    queryKey: ["host-profile", dbRoom?.host_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone, host_badge, host_score").eq("user_id", dbRoom!.host_id).single();
      return data;
    },
    enabled: !!dbRoom?.host_id,
  });

  const { data: reviews } = useQuery({
    queryKey: ["room-reviews", dbRoom?.host_id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*").eq("host_id", dbRoom!.host_id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!dbRoom?.host_id,
  });

  const { data: userCompletedBooking } = useQuery({
    queryKey: ["user-completed-booking", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("id").eq("user_id", user!.id).eq("room_id", id!).eq("status", "completed").limit(1).maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: userConfirmedBooking } = useQuery({
    queryKey: ["user-confirmed-booking", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("id").eq("user_id", user!.id).eq("room_id", id!).in("status", ["confirmed", "completed"]).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dbRoom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Room not found</p>
          <Link to="/rooms" className="text-primary mt-2 inline-block">{BACK_ARROW} Back to rooms</Link>
        </div>
      </div>
    );
  }

  const room = {
    id: dbRoom.id,
    title: dbRoom.title,
    location: `${dbRoom.location}, ${dbRoom.city}`,
    price: Number(dbRoom.price),
    rating: Number(dbRoom.rating) || 4.5,
    reviews: dbRoom.reviews_count || 0,
    image: getDisplayImageUrl(dbRoom.image_url, DEFAULT_ROOM_IMAGE),
    amenities: dbRoom.amenities || [],
    hostName: hostProfile?.full_name || "Host",
    hostId: dbRoom.host_id,
    hostBadge: hostProfile?.host_badge,
  };

  const nights = checkIn && checkOut ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) : 1;
  const roomTotal = room.price * nights;
  const platformFee = Math.round(roomTotal * PLATFORM_FEE_RATE);
  const grandTotal = roomTotal + platformFee;

  const avgRating = reviews && reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1) : room.rating;

  const today = new Date().toISOString().split("T")[0];

  const handleBooking = async () => {
    if (!user) { toast.error("Please log in to book"); navigate("/login"); return; }
    if (!checkIn || !checkOut) { toast.error("Please select check-in and check-out dates"); return; }
    if (new Date(checkOut) <= new Date(checkIn)) { toast.error("Check-out must be after check-in"); return; }
    if (new Date(checkIn) < new Date(today)) { toast.error("Check-in date cannot be in the past"); return; }

    setBooking(true);
    const { data, error } = await supabase.from("bookings").insert({
      user_id: user.id, room_id: room.id, check_in: checkIn, check_out: checkOut,
      guests, total_amount: grandTotal, service_fee: platformFee, platform_fee: platformFee, room_price: roomTotal, status: "pending",
    } as any).select("id").single();
    setBooking(false);

    if (error) {
      toast.error(error.message || "Booking failed");
    } else if (data) {
      setCurrentBookingId(data.id);
      setShowPayment(true);
      toast.success("Booking created! Complete payment to confirm.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-44 md:pb-12">
      <Navbar />
      <div className="pt-24 md:pt-28 container mx-auto px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/rooms" className="flex items-center gap-1 hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /> Back</Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl aspect-[16/9] gold-border gold-glow">
              <img src={room.image} alt={room.title} className="w-full h-full object-cover" loading="eager" decoding="async" fetchpriority="high" />
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }} className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition"><Share2 className="w-4 h-4 text-foreground" /></button>
                <button onClick={() => toast.success("Saved to favorites!")} className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition"><Heart className="w-4 h-4 text-foreground" /></button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="font-semibold text-foreground">{avgRating}</span>
                <span className="text-muted-foreground text-sm">({reviews?.length || room.reviews} reviews)</span>
                {room.hostBadge === "Super Host" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold ml-2">{STAR_BADGE} Super Host</span>
                )}
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{room.title}</h1>
              <div className="flex items-center gap-1 text-muted-foreground mt-2">
                <MapPin className="w-4 h-4" /><span className="text-sm">{room.location}</span>
              </div>
            </motion.div>

            <div className="flex items-center gap-4 p-4 rounded-xl glass-luxe gold-border">
              <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold text-lg">{room.hostName[0]}</div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Hosted by {room.hostName}</p>
                <p className="text-xs text-muted-foreground">Verified Host</p>
              </div>
              <div className="flex gap-2">
                {userCompletedBooking && room.hostId && (
                  <>
                    <button onClick={() => setShowReview(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors">
                      <MessageSquare className="w-3 h-3" /> Review
                    </button>
                    <button onClick={() => setShowReport(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors">
                      <Flag className="w-3 h-3" /> Report
                    </button>
                  </>
                )}
              </div>
            </div>

            {userConfirmedBooking && (
              <HostContactCard hostName={room.hostName} location={room.location} />
            )}

            <div>
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Amenities</h3>
              <div className="grid grid-cols-2 gap-3">
                {room.amenities.map((a) => {
                  const Icon = amenityIcons[a] || Shield;
                  return (
                    <div key={a} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">{a}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-foreground mb-3">About this place</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {dbRoom.description || `Experience the charm of ${room.location} in this beautifully curated space. Perfect for travelers seeking luxury and comfort.`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 space-y-2">
              <h3 className="font-display text-lg font-bold text-foreground">Booking Policies</h3>
              {["Free cancellation up to 48 hours before check-in", "Check-in: 2:00 PM â€¢ Check-out: 11:00 AM", "No smoking â€¢ No parties"].map((p) => (
                <div key={p} className="flex items-center gap-2"><Check className="w-4 h-4 text-success shrink-0" /><span className="text-sm text-muted-foreground">{p}</span></div>
              ))}
            </div>

            {reviews && reviews.length > 0 && (
              <div>
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  <Star className="w-5 h-5 fill-primary text-primary inline mr-1" />
                  {avgRating} {DOT_SEPARATOR} {reviews.length} Reviews
                </h3>
                <div className="space-y-4">
                  {reviews.slice(0, 6).map((r: any) => (
                    <div key={r.id} className="p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                          ))}
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
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="sticky top-28 glass-luxe gold-border rounded-2xl p-6 space-y-5 gold-glow">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold text-gradient">{RUPEE_SYMBOL}{room.price.toLocaleString("en-IN")}</span>
                <span className="text-muted-foreground text-sm">/ night</span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Check in</label>
                    <input type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Check out</label>
                    <input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Guests</label>
                  <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>{g} Guest{g > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{RUPEE_SYMBOL}{room.price.toLocaleString("en-IN")} {MULTIPLY_SYMBOL} {nights} night{nights > 1 ? "s" : ""}</span><span className="text-foreground font-medium">{RUPEE_SYMBOL}{roomTotal.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Platform service fee (18%)</span><span className="text-foreground font-medium">{RUPEE_SYMBOL}{platformFee.toLocaleString("en-IN")}</span></div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold"><span className="text-foreground">Total</span><span className="text-gradient">{RUPEE_SYMBOL}{grandTotal.toLocaleString("en-IN")}</span></div>
              </div>

              <button onClick={handleBooking} disabled={booking} className="w-full btn-gold gold-shimmer font-semibold py-3.5 rounded-xl text-sm disabled:opacity-50">
                {booking ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span> : "Reserve Now"}
              </button>

              <p className="text-center text-xs text-muted-foreground">Pay via UPI after reservation</p>
            </motion.div>
          </div>
        </div>
      </div>

      {showPayment && (
        <Suspense fallback={null}>
          <UPIPaymentModal open={showPayment} onClose={() => setShowPayment(false)} bookingId={currentBookingId} amount={grandTotal} onSuccess={() => navigate("/dashboard")} />
        </Suspense>
      )}

      {showReview && room.hostId && (
        <Suspense fallback={null}>
          <ReviewModal open={showReview} onClose={() => setShowReview(false)} bookingId={userCompletedBooking!.id} hostId={room.hostId} />
        </Suspense>
      )}

      {showReport && room.hostId && (
        <Suspense fallback={null}>
          <ReportHostModal open={showReport} onClose={() => setShowReport(false)} bookingId={userCompletedBooking?.id || userConfirmedBooking?.id || ""} hostId={room.hostId} />
        </Suspense>
      )}

      {/* Mobile Sticky Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden glass-navbar border-t border-border p-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-gradient">{RUPEE_SYMBOL}{room.price.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">per night</p>
        </div>
        <button onClick={handleBooking} disabled={booking} className="btn-gold gold-shimmer px-8 py-3 rounded-xl text-sm font-bold disabled:opacity-50 min-w-[140px]">
          {booking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Reserve"}
        </button>
      </div>

      <div className="mt-20"><Footer /></div>
    </div>
  );
};

export default RoomDetail;
