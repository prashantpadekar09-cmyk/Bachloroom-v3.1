import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  Crown,
  MapPin,
  Search,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Key,
  Smile,
  ScrollText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LuxuryRoomCard from "@/components/LuxuryRoomCard";
import { Skeleton } from "@/components/ui/skeleton";
import heroBg from "@/assets/hero-bg.jpg";
import { DEFAULT_ROOM_IMAGE, getDisplayImageUrl } from "@/lib/media";

const deferredSectionStyle = {
  contentVisibility: "auto" as const,
  containIntrinsicSize: "1px 900px",
};

const LuxuryHome = () => {
  const [searchCity, setSearchCity] = useState("");
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [canFetchRooms, setCanFetchRooms] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % testimonials.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    let idleId: number | null = null;

    if ("requestIdleCallback" in window) {
      idleId = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
        () => {
          if (active) setCanFetchRooms(true);
        },
        { timeout: 800 }
      );
    } else {
      idleId = window.setTimeout(() => {
        if (active) setCanFetchRooms(true);
      }, 250);
    }

    return () => {
      active = false;
      if (idleId !== null) {
        if ("cancelIdleCallback" in window) {
          (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
        } else {
          window.clearTimeout(idleId);
        }
      }
    };
  }, []);

  const { data: featuredRooms, isLoading } = useQuery({
    queryKey: ["featured-rooms"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_available", true)
        .eq("is_approved", true)
        .order("is_premium", { ascending: false })
        .order("rating", { ascending: false })
        .limit(8);

      if (error) throw error;
      return data;
    },
    enabled: canFetchRooms,
    staleTime: 1000 * 60 * 5,
  });

  const rooms = useMemo(
    () =>
      featuredRooms?.map((room) => ({
        id: room.id,
        title: room.title,
        location: `${room.location}, ${room.city}`,
        price: Number(room.price),
        rating: Number(room.rating) || 4.5,
        reviews: room.reviews_count || 0,
        image: getDisplayImageUrl(room.image_url, DEFAULT_ROOM_IMAGE),
        amenities: room.amenities || [],
        hostName: "Host",
      })) || [],
    [featuredRooms]
  );

  return (
    <div className="luxury-shell min-h-screen bg-background pb-20">
      <Navbar />

      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Luxury interior"
            className="h-full w-full object-cover kenburns-luxury"
            loading="eager"
            decoding="async"
            fetchpriority="high"
          />
          <div className="absolute inset-0 hero-vignette" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/80" />
          <div className="gold-dust" />
        </div>

        <div className="relative z-10 container mx-auto flex min-h-[100svh] flex-col justify-center px-4 pt-24 pb-20">
          <div className="max-w-3xl space-y-6">
            <div className="luxury-pill animate-fade-up" style={{ animationDelay: "80ms" }}>
              <Crown className="h-4 w-4" />
              ApnaGhar Premium Stays
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground leading-[1.05] animate-fade-up" style={{ animationDelay: "140ms" }}>
              Experience Luxury Living
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl animate-fade-up" style={{ animationDelay: "210ms" }}>
              Book premium stays with comfort and trust. Curated rooms, verified hosts, and a cinematic booking journey.
            </p>

            <div className="glass-panel gold-border gold-glow-soft rounded-[1.75rem] p-4 md:p-5 animate-fade-up" style={{ animationDelay: "280ms" }}>
              <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_0.7fr]">
                <label className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-secondary/70 px-4 py-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <input
                    type="text"
                    value={searchCity}
                    onChange={(event) => setSearchCity(event.target.value)}
                    placeholder="Location"
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-secondary/70 px-4 py-3">
                  <ScrollText className="h-4 w-4 text-primary" />
                  <input type="date" className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-secondary/70 px-4 py-3">
                  <ScrollText className="h-4 w-4 text-primary" />
                  <input type="date" className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
                </label>
                <Link
                  to={`/rooms${searchCity ? `?city=${encodeURIComponent(searchCity)}` : ""}`}
                  className="btn-gold gold-shimmer flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold"
                >
                  <Search className="h-4 w-4" />
                  Search
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.35em] text-muted-foreground animate-fade-up" style={{ animationDelay: "350ms" }}>
              <span className="metal-chip rounded-full px-4 py-2">Curated villas</span>
              <span className="metal-chip rounded-full px-4 py-2">Gold service</span>
              <span className="metal-chip rounded-full px-4 py-2">Verified hosts</span>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-xs uppercase tracking-[0.35em] text-muted-foreground">
            Scroll
            <span className="scroll-indicator" />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16" style={deferredSectionStyle}>
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-primary">Featured Rooms</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3">Premium stays with cinematic presence</h2>
          </div>
          <Link to="/rooms" className="hidden md:flex items-center gap-2 text-sm text-primary font-semibold">
            Explore all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading || !canFetchRooms ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="space-y-4">
                <Skeleton className="aspect-[4/3] w-full rounded-[1.75rem]" />
                <Skeleton className="h-5 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {rooms.map((room) => (
              <LuxuryRoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 py-16" style={deferredSectionStyle}>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Shield, title: "Verified Quality", copy: "Every room passes a premium verification checklist." },
            { icon: Sparkles, title: "Luxury Aesthetic", copy: "Gold-touched design and calm, immersive layout." },
            { icon: TrendingUp, title: "Higher Trust", copy: "Host ratings and curated amenities increase confidence." },
          ].map((item) => (
            <div key={item.title} className="glass-luxe gold-border rounded-2xl p-6 reveal-on-scroll">
              <item.icon className="h-6 w-6 text-primary" />
              <h3 className="font-display text-2xl font-bold text-foreground mt-4">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-3">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16" style={deferredSectionStyle}>
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.35em] text-primary">How It Works</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3">A premium flow from search to stay</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Search, title: "Discover", copy: "Filter by location, dates, and curated room types." },
            { icon: Key, title: "Reserve", copy: "Secure bookings with verified hosts and transparent pricing." },
            { icon: Smile, title: "Arrive", copy: "Enjoy a cinematic stay with attentive hosting." },
          ].map((item) => (
            <div key={item.title} className="glass-luxe gold-border rounded-2xl p-6 reveal-on-scroll">
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
                <item.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mt-4">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-3">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden py-20" style={deferredSectionStyle}>
        <div className="absolute inset-0">
          <img src={heroBg} alt="Luxury villa" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative z-10 container mx-auto px-4">
          <div className="glass-panel gold-border rounded-3xl p-8 md:p-12 max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.35em] text-primary">Host With ApnaGhar</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-4">Start Hosting and Earn Premium Income</h2>
            <p className="text-sm text-muted-foreground mt-4">
              Showcase your luxury space, reach verified guests, and increase your earnings with premium positioning.
            </p>
            <Link to="/host" className="btn-gold gold-shimmer inline-flex items-center gap-2 mt-6 rounded-2xl px-6 py-3 text-sm font-semibold">
              Become a Host
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16" style={deferredSectionStyle}>
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.35em] text-primary">Testimonials</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3">Guests love the premium touch</h2>
        </div>
        <div className="relative overflow-hidden">
          <div key={activeTestimonial} className="glass-panel gold-border rounded-2xl p-6 md:p-8 reveal-on-scroll">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold">
                {testimonials[activeTestimonial].name[0]}
              </div>
              <div>
                <p className="font-semibold text-foreground">{testimonials[activeTestimonial].name}</p>
                <p className="text-xs text-muted-foreground">{testimonials[activeTestimonial].location}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">{testimonials[activeTestimonial].quote}</p>
            <div className="flex gap-1 mt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={`star-${i}`} className="w-4 h-4 text-primary fill-primary" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const testimonials = [
  {
    name: "Aditi Kapoor",
    location: "Mumbai",
    quote: "ApnaGhar made every detail feel premium. The ambience, the host, and the entire flow were effortless.",
  },
  {
    name: "Rahul Mehta",
    location: "Bengaluru",
    quote: "The listing photos and luxury presentation helped me pick the perfect villa instantly.",
  },
  {
    name: "Sana Iqbal",
    location: "Goa",
    quote: "The booking experience felt like a concierge service. Truly elevated.",
  },
];

export default LuxuryHome;
