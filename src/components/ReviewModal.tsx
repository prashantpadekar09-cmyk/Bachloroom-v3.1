import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const quickTags = ["Friendly", "Helpful", "Clean Room", "Great Location", "Rude Behavior", "Late Response", "Not as Described"];

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  hostId: string;
  onSuccess?: () => void;
}

const ReviewModal = ({ open, onClose, bookingId, hostId, onSuccess }: ReviewModalProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      host_id: hostId,
      booking_id: bookingId,
      rating,
      comment: comment || null,
      tags: selectedTags,
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
      toast.success("Review submitted!");
      setTimeout(() => { onSuccess?.(); onClose(); }, 1500);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-luxe gold-border rounded-2xl p-6 w-full max-w-md relative gold-glow">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>

          {done ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Thank You!</h2>
              <p className="text-sm text-muted-foreground">Your review helps improve the platform.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="font-display text-xl font-bold text-foreground">Rate Your Stay</h2>
                <p className="text-sm text-muted-foreground mt-1">How was your host experience?</p>
              </div>

              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onMouseEnter={() => setHoveredStar(s)} onMouseLeave={() => setHoveredStar(0)} onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-125">
                    <Star className={`w-8 h-8 transition-colors ${(hoveredStar || rating) >= s ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {quickTags.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedTags.includes(tag) ? "gradient-gold text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                    {tag}
                  </button>
                ))}
              </div>

              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)..." rows={3} className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />

              <button onClick={handleSubmit} disabled={submitting || rating === 0} className="w-full btn-gold py-3 rounded-xl font-semibold text-sm disabled:opacity-50">
                {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span> : "Submit Review"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReviewModal;
