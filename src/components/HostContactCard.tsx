import { Phone, MessageCircle, MapPin, Mail } from "lucide-react";

interface HostContactCardProps {
  hostName: string;
  hostPhone?: string;
  hostEmail?: string;
  location?: string;
}

const HostContactCard = ({ hostName, hostPhone, hostEmail, location }: HostContactCardProps) => {
  const whatsappLink = hostPhone ? `https://wa.me/91${hostPhone.replace(/\D/g, "")}` : "#";
  const phoneLink = hostPhone ? `tel:${hostPhone}` : "#";
  const mapsLink = location ? `https://maps.google.com/?q=${encodeURIComponent(location)}` : "#";

  return (
    <div className="glass-luxe gold-border rounded-2xl p-5 space-y-4 gold-glow">
      <h3 className="font-display text-lg font-bold text-foreground">Host Contact</h3>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold text-lg">
          {hostName[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-foreground">{hostName}</p>
          <p className="text-xs text-muted-foreground">Your host for this stay</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {hostPhone && (
          <a href={phoneLink} className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground font-medium">
            <Phone className="w-4 h-4 text-primary" /> Call
          </a>
        )}
        {hostPhone && (
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl bg-success/10 hover:bg-success/20 transition-colors text-sm text-success font-medium">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        )}
        {hostEmail && (
          <a href={`mailto:${hostEmail}`} className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground font-medium">
            <Mail className="w-4 h-4 text-primary" /> Email
          </a>
        )}
        {location && (
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground font-medium">
            <MapPin className="w-4 h-4 text-primary" /> Directions
          </a>
        )}
      </div>
    </div>
  );
};

export default HostContactCard;
