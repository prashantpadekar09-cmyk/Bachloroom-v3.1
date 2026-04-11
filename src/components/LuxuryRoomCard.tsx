import { Heart, MapPin, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const RUPEE_SYMBOL = "\u20B9";

export interface Room {
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  amenities: string[];
  hostName: string;
}

const LuxuryRoomCard = ({ room }: { room: Room }) => {
  const [liked, setLiked] = useState(false);

  return (
    <div className="group">
      <Link to={`/rooms/${room.id}`} className="block">
        <div className="glass-luxe relative aspect-[4/3] overflow-hidden rounded-[1.75rem] transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(196,158,88,0.25)]">
          <img
            src={room.image}
            alt={room.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

          <button
            onClick={(event) => {
              event.preventDefault();
              setLiked((current) => !current);
            }}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-background/70 backdrop-blur-sm transition-transform hover:scale-110"
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-primary text-primary" : "text-foreground"}`} />
          </button>

          <div className="absolute left-4 top-4 rounded-full border border-primary/30 bg-background/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
            Premium
          </div>

          <div className="absolute bottom-4 left-4 right-4 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Suite vibe</p>
                <p className="mt-1 max-w-[12rem] text-sm font-medium text-foreground">Curated for guests who want more than just a bed.</p>
              </div>
              <span className="btn-gold gold-shimmer inline-flex shrink-0 rounded-full px-4 py-2 text-xs font-semibold">View Room</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="truncate pr-2 text-base font-semibold text-foreground">{room.title}</h3>
            <div className="flex shrink-0 items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="text-sm font-medium text-foreground">{room.rating}</span>
              <span className="text-xs text-muted-foreground">({room.reviews})</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-sm">{room.location}</span>
          </div>
          <p className="text-sm">
            <span className="font-bold text-gradient">{RUPEE_SYMBOL}{room.price.toLocaleString("en-IN")}</span>
            <span className="text-muted-foreground"> / night</span>
          </p>
          {room.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {room.amenities.slice(0, 2).map((amenity) => (
                <span key={amenity} className="metal-chip rounded-full px-2.5 py-1 text-[10px] font-medium text-foreground/90">
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default LuxuryRoomCard;
