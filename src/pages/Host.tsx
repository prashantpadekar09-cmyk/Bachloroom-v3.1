import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Home, MapPin, IndianRupee, Star, Loader2, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadPublicFile } from "@/lib/storage";
import { DEFAULT_ROOM_IMAGE } from "@/lib/media";

const Host = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFileName, setImageFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    city: "",
    price: "",
    amenities: "",
    image_url: "",
    owner_email: "",
    owner_mobile: "",
  });

  const handleImageUpload = async (file: File) => {
    if (!user) {
      toast.error("Please log in to upload files");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, or PDF files are allowed");
      return;
    }

    setUploadingImage(true);
    setImageFileName(file.name);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `rooms/${user.id}/${Date.now()}.${ext}`;
    const { publicUrl, error } = await uploadPublicFile({ path, file });
    if (error || !publicUrl) {
      toast.error(error || "Image upload failed");
      setUploadingImage(false);
      return;
    }

    setFormData((prev) => ({ ...prev, image_url: publicUrl }));
    setUploadingImage(false);
    toast.success("File uploaded successfully");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to list a room");
      navigate("/login");
      return;
    }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price greater than 0");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("rooms").insert({
      host_id: user.id,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      city: formData.city,
      price: price,
      amenities: formData.amenities.split(",").map((a) => a.trim()).filter(Boolean),
      image_url: formData.image_url || DEFAULT_ROOM_IMAGE,
      owner_email: formData.owner_email,
      owner_mobile: formData.owner_mobile,
      is_approved: false, // New listings always require approval
      is_available: true,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Failed to list room");
    } else {
      toast.success("Room submitted for review! It will be visible after admin approval.");
      navigate("/host-dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-32 md:pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <Home className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Become a Host</h1>
            <p className="text-muted-foreground">List your space and start earning with BachloRoom</p>
          </motion.div>

          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onSubmit={handleSubmit} className="space-y-6 glass-luxe gold-border p-6 md:p-8 rounded-2xl">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Room Title</label>
              <Input placeholder="Cozy 2BHK in Koramangala" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea placeholder="Describe your space..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1"><MapPin className="w-4 h-4" /> Location</label>
                <Input placeholder="Koramangala, Bangalore" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">City</label>
                <Input placeholder="Bangalore" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1"><IndianRupee className="w-4 h-4" /> Price per Night (₹)</label>
              <Input type="number" placeholder="1500" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1"><Star className="w-4 h-4" /> Amenities</label>
              <Input placeholder="WiFi, AC, Kitchen, Parking (comma separated)" value={formData.amenities} onChange={(e) => setFormData({ ...formData, amenities: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Owner Email *</label>
                <Input type="email" placeholder="owner@example.com" value={formData.owner_email} onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Owner Mobile *</label>
                <Input type="tel" placeholder="+91 9876543210" value={formData.owner_mobile} onChange={(e) => setFormData({ ...formData, owner_mobile: e.target.value })} required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Room Image / Brochure (JPG, PNG, PDF)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingImage}
                className="w-full py-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Uploading...
                  </>
                ) : formData.image_url ? (
                  <>
                    <Check className="w-4 h-4 text-success" />
                    {imageFileName || "File uploaded"}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload JPG, PNG, or PDF
                  </>
                )}
              </button>
            </div>

            <Button type="submit" disabled={loading || uploadingImage} className="w-full btn-gold gold-shimmer text-primary-foreground rounded-xl h-12 text-base font-semibold">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Listing...</> : "List Your Room"}
            </Button>
          </motion.form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Host;
