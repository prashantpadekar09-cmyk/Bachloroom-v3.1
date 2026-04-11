import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, Upload, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { uploadPublicFile } from "@/lib/storage";

const issueTypes = ["Rude behavior", "Overcharging", "Fake listing", "Harassment", "No response", "Safety concern", "Other"];

interface ReportHostModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  hostId: string;
}

const ReportHostModal = ({ open, onClose, bookingId, hostId }: ReportHostModalProps) => {
  const { user } = useAuth();
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUploadProof = async (file: File) => {
    if (!user) return;
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, or PDF files are allowed");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `reports/${user.id}/${Date.now()}.${ext}`;
    const { publicUrl, error } = await uploadPublicFile({ path, file });
    if (error || !publicUrl) { toast.error(error || "Upload failed"); setUploading(false); return; }
    setProofUrl(publicUrl);
    setUploading(false);
    toast.success("Proof uploaded");
  };

  const handleSubmit = async () => {
    if (!user || !issueType) { toast.error("Please select an issue type"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      user_id: user.id,
      host_id: hostId,
      booking_id: bookingId,
      issue_type: issueType,
      description: description || null,
      proof_url: proofUrl || null,
    } as any);
    setSubmitting(false);
    if (error) { toast.error(error.message); } else { setDone(true); toast.success("Report submitted"); setTimeout(onClose, 1500); }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-luxe gold-border rounded-2xl p-6 w-full max-w-md relative gold-glow">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>

          {done ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto"><Check className="w-8 h-8 text-success" /></div>
              <h2 className="font-display text-xl font-bold text-foreground">Report Submitted</h2>
              <p className="text-sm text-muted-foreground">Our team will review this within 24 hours.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">Report Host</h2>
                <p className="text-sm text-muted-foreground mt-1">Help us keep BachloRoom safe</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Issue Type</label>
                <select value={issueType} onChange={(e) => setIssueType(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Select issue...</option>
                  {issueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what happened..." rows={3} className="w-full mt-1 px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upload Proof (optional)</label>
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUploadProof(e.target.files[0]); }} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full mt-1 py-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : proofUrl ? <><Check className="w-5 h-5 text-success" /> Proof uploaded</> : <><Upload className="w-5 h-5" /> Upload JPG, PNG, or PDF</>}
                </button>
              </div>

              <button onClick={handleSubmit} disabled={submitting || !issueType} className="w-full bg-destructive text-destructive-foreground py-3 rounded-xl font-semibold text-sm disabled:opacity-50">
                {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span> : "Submit Report"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReportHostModal;
