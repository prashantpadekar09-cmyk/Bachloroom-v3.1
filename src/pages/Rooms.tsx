import { useDeferredValue, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, Loader2 } from "lucide-react";
import LuxuryRoomCard from "@/components/LuxuryRoomCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_ROOM_IMAGE, getDisplayImageUrl } from "@/lib/media";

const RUPEE_SYMBOL = "\u20B9";
const PRICE_RANGE_MID = `${RUPEE_SYMBOL}2000\u2013${RUPEE_SYMBOL}4000`;
const priceRanges = ["All", `Under ${RUPEE_SYMBOL}2000`, PRICE_RANGE_MID, `Above ${RUPEE_SYMBOL}4000`];
const PAGE_SIZE = 12;

const RoomCardSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="aspect-[4/3] w-full rounded-[1.75rem]" />
    <div className="space-y-2">
      <Skeleton className="h-5 w-3/4 rounded-lg" />
      <Skeleton className="h-4 w-2/3 rounded-lg" />
      <Skeleton className="h-4 w-1/2 rounded-lg" />
    </div>
  </div>
);

const RoomsPage = () => {
  const [searchParams] = useSearchParams();
  const initialCity = searchParams.get("city") || "";
  const [search, setSearch] = useState(initialCity);
  const deferredSearch = useDeferredValue(search.trim());
  const [priceFilter, setPriceFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ["rooms-infinite", deferredSearch, priceFilter],
    queryFn: async ({ pageParam = 0 }) => {
      const buildBaseQuery = (useFilters: boolean) => {
        let query = supabase
          .from("rooms")
          .select("id, title, location, city, price, rating, reviews_count, image_url, amenities, is_premium, created_at");

        if (useFilters) {
          query = query.eq("is_available", true).eq("is_approved", true).order("is_premium", { ascending: false });
        }

        query = query.order("created_at", { ascending: false }).range(pageParam, pageParam + PAGE_SIZE - 1);

        if (deferredSearch) {
          query = query.or(`title.ilike.%${deferredSearch}%,location.ilike.%${deferredSearch}%,city.ilike.%${deferredSearch}%`);
        }

        if (priceFilter !== "All") {
          if (priceFilter === `Under ${RUPEE_SYMBOL}2000`) query = query.lt("price", 2000);
          else if (priceFilter === PRICE_RANGE_MID) query = query.gte("price", 2000).lte("price", 4000);
          else if (priceFilter === `Above ${RUPEE_SYMBOL}4000`) query = query.gt("price", 4000);
        }

        return query;
      };

      const { data, error } = await buildBaseQuery(true);
      if (error) {
        if (error.message.includes("schema cache")) {
          toast.error("Database schema is updating. Please refresh in a moment.");
        }
        const normalized = error.message.toLowerCase();
        if (
          normalized.includes("column") &&
          (normalized.includes("is_approved") || normalized.includes("is_available") || normalized.includes("is_premium"))
        ) {
          const fallback = await buildBaseQuery(false);
          const { data: fallbackData, error: fallbackError } = await fallback;
          if (fallbackError) throw fallbackError;
          return fallbackData;
        }
        throw error;
      }
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const { data: cities } = useQuery({
    queryKey: ["room-cities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("city").eq("is_approved", true).eq("is_available", true);
      if (error) {
        if (error.message.includes("schema cache")) {
          toast.error("Database schema is being updated. Please refresh in a moment.");
        }
        throw error;
      }
      const unique = [...new Set(data?.map((r) => r.city) || [])];
      return unique.sort();
    },
    enabled: showFilters,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  });

  const allRooms = data?.pages.flat().map((r) => ({
    id: r.id,
    title: r.title,
    location: `${r.location}, ${r.city}`,
    price: Number(r.price),
    rating: Number(r.rating) || 4.5,
    reviews: r.reviews_count || 0,
    image: getDisplayImageUrl(r.image_url, DEFAULT_ROOM_IMAGE),
    amenities: r.amenities || [],
    hostName: "Host",
  })) || [];

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-12">
      <Navbar />
      <div className="pt-24 md:pt-28 container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Explore Stays</h1>
          <p className="text-muted-foreground mt-2">Discover unique rooms across India</p>
        </motion.div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search by city or room name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border border-primary/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 transition-colors ${showFilters ? "gradient-primary text-primary-foreground border-transparent" : "border-border text-foreground hover:bg-secondary"}`}>
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-8 p-6 rounded-[1.75rem] glass-luxe gold-border shadow-elevated space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Price Range</p>
              <div className="flex flex-wrap gap-2">
                {priceRanges.map((range) => (
                  <button key={range} onClick={() => setPriceFilter(range)} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${priceFilter === range ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>{range}</button>
                ))}
              </div>
            </div>
            {cities && cities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">City</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSearch("")} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${!search ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>All</button>
                  {cities.map((city) => (
                    <button key={city} onClick={() => setSearch(city)} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${search === city ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>{city}</button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <RoomCardSkeleton key={`room-skeleton-${index}`} />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <p className="text-lg font-semibold text-foreground">Could not load listings</p>
            <p className="text-sm text-muted-foreground mt-2">{error instanceof Error ? error.message : "Please refresh and try again."}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 btn-gold px-6 py-2 rounded-xl text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {isFetching && !isFetchingNextPage && (
              <div className="mb-4 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Updating listings...
                </span>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-6">{allRooms.length} stays found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allRooms.map((room) => (<LuxuryRoomCard key={room.id} room={room} />))}
            </div>
            
            {allRooms.length === 0 && !isLoading && (
              <div className="text-center py-20">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold text-foreground">No stays found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or check back later</p>
              </div>
            )}

            {hasNextPage && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="btn-gold px-12 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                  {isFetchingNextPage ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading more stays...
                    </span>
                  ) : (
                    "Load more stays"
                  )}
                </button>
              </div>
            )}
            {isFetchingNextPage && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <RoomCardSkeleton key={`room-next-skeleton-${index}`} />
                ))}
              </div>
            )}

            {!hasNextPage && allRooms.length > 0 && (
              <p className="text-center text-muted-foreground text-sm mt-12 py-8 border-t border-primary/5">
                You've seen all our available premium stays.
              </p>
            )}
          </>
        )}
      </div>
      <div className="mt-20"><Footer /></div>
    </div>
  );
};

export default RoomsPage;

