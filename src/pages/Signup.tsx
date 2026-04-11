import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Home, Mail, Lock, User, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";

const Signup = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", referralCode: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error, requiresEmailConfirmation } = await signUp(form.email, form.password, form.name, form.referralCode || undefined);
    setLoading(false);
    if (error) {
      toast.error(error.message || "Signup failed");
    } else {
      if (requiresEmailConfirmation) {
        toast.success("Account created. Please confirm your email before logging in.");
        navigate("/login");
        return;
      }

      toast.success("Account created successfully!");
      navigate("/dashboard");
    }
  };

  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <BrandLogo variant="full" />
        </Link>

        <div className="glass-luxe gold-border rounded-2xl p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-6">Create Account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Your name" className="pl-10" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="you@example.com" className="pl-10" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" className="pl-10" value={form.password} onChange={(e) => update("password", e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Referral Code (Optional)</label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Enter referral code" className="pl-10" value={form.referralCode} onChange={(e) => update("referralCode", e.target.value)} />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full btn-gold gold-shimmer text-primary-foreground rounded-xl h-11 font-semibold">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating account...</> : "Sign Up"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-3">
            If email verification is enabled, you'll need to confirm your email before first login.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
