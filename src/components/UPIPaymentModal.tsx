import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, Check, Copy, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { uploadPublicFile } from "@/lib/storage";

const UPI_ID = "prashantpadekar09-2@okicici";

interface UPIPaymentModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  amount: number;
  onSuccess: () => void;
}

const UPIPaymentModal = ({ open, onClose, bookingId, amount, onSuccess }: UPIPaymentModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"pay" | "upload" | "done">("pay");
  const [uploading, setUploading] = useState(false);
  const [upiRef, setUpiRef] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upiLink = `upi://pay?pa=${UPI_ID}&pn=BachloRoom&am=${amount}&cu=INR&tn=Booking-${bookingId.slice(0, 8)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    toast.success("UPI ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, or PDF files are allowed");
      return;
    }
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${bookingId}.${ext}`;

    const { publicUrl, error: uploadError } = await uploadPublicFile({ path, file });
    if (uploadError || !publicUrl) {
      toast.error("Upload failed: " + (uploadError || "Unknown error"));
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("payment_proofs").insert({
      user_id: user.id,
      booking_id: bookingId,
      amount,
      screenshot_url: publicUrl,
      upi_reference: upiRef || null,
      status: "pending",
    } as any);

    setUploading(false);
    if (insertError) {
      toast.error("Failed to submit proof: " + insertError.message);
    } else {
      setStep("done");
      toast.success("Payment proof submitted! Awaiting admin verification.");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-luxe gold-border rounded-2xl p-6 w-full max-w-md relative gold-glow">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>

          {step === "pay" && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center mx-auto">
                <QrCode className="w-7 h-7 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Pay via UPI</h2>
              <p className="text-sm text-muted-foreground">Scan the QR code or use the UPI ID to pay</p>

              <div className="bg-secondary rounded-xl p-4">
                <img src={qrUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto rounded-lg" />
              </div>

              <p className="font-display text-2xl font-bold text-gradient">₹{amount.toLocaleString("en-IN")}</p>

              <div className="flex items-center gap-2 justify-center">
                <code className="text-sm bg-secondary px-3 py-1.5 rounded-lg text-foreground font-mono">{UPI_ID}</code>
                <button onClick={handleCopy} className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <a href={upiLink} className="block btn-gold px-6 py-3 rounded-xl text-center font-semibold">
                Open UPI App
              </a>

              <button onClick={() => setStep("upload")} className="w-full py-3 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-secondary transition-colors">
                I've completed the payment →
              </button>
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground text-center">Upload Payment Proof</h2>
              <p className="text-sm text-muted-foreground text-center">Upload a screenshot of your payment confirmation</p>

              <div>
                <label className="text-xs font-medium text-muted-foreground">UPI Reference / Transaction ID (optional)</label>
                <input type="text" value={upiRef} onChange={(e) => setUpiRef(e.target.value)} placeholder="e.g., 412345678901" className="w-full mt-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />

              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full py-10 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center gap-2">
                {uploading ? (
                  <><Loader2 className="w-8 h-8 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Uploading...</span></>
                ) : (
                  <><Upload className="w-8 h-8 text-muted-foreground" /><span className="text-sm text-muted-foreground">Click to upload JPG, PNG, or PDF</span></>
                )}
              </button>

              <button onClick={() => setStep("pay")} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
            </div>
          )}

          {step === "done" && (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Payment Submitted!</h2>
              <p className="text-sm text-muted-foreground">Your payment proof has been sent for admin verification. You'll be notified once approved.</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UPIPaymentModal;
