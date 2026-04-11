import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, TrendingUp, Shield, Copy, Check, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ReferralPage = () => {
  const [copied, setCopied] = useState(false);
  const { user, profile } = useAuth();
  const referralCode = profile?.referral_code || "LOGIN-TO-SEE";

  const handleCopy = () => {
    if (!user) {
      toast.error("Please log in to get your referral code");
      return;
    }
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-12">
      <Navbar />
      <div className="pt-24 md:pt-28">
        <section className="container mx-auto px-4 text-center py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block gradient-gold text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">Referral Program</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Earn While You <span className="text-gradient">Share</span>
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed">
              Share your referral code and earn commissions on every completed booking in your network.
            </p>
          </motion.div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { level: 1, percent: 5, desc: "Direct referral", color: "gradient-primary" },
              { level: 2, percent: 2, desc: "Referral's referral", color: "gradient-warm" },
              { level: 3, percent: 1, desc: "Third-level referral", color: "gradient-gold" },
            ].map((item, i) => (
              <motion.div key={item.level} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-luxe gold-border rounded-2xl shadow-elevated p-8 text-center transition-all duration-300">
                <div className={`w-16 h-16 rounded-2xl ${item.color} flex items-center justify-center mx-auto mb-4`}>
                  <span className="text-2xl font-bold text-primary-foreground">{item.percent}%</span>
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">Level {item.level}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-luxe gold-border rounded-2xl shadow-elevated p-8 md:p-12 text-center max-w-xl mx-auto">
            <h3 className="font-display text-xl font-bold text-foreground mb-2">Your Referral Code</h3>
            <p className="text-sm text-muted-foreground mb-6">{user ? "Share this code with friends to start earning" : "Log in to get your unique referral code"}</p>
            <div className="flex items-center justify-center gap-3">
              <div className="bg-secondary px-6 py-3 rounded-xl font-mono text-lg font-bold text-foreground tracking-wider">{referralCode}</div>
              <button onClick={handleCopy} className="gradient-primary text-primary-foreground p-3 rounded-xl hover:opacity-90 transition-opacity">
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {!user && (
              <Link to="/signup" className="inline-block mt-4 text-primary font-medium hover:underline text-sm">
                Sign up to get your code →
              </Link>
            )}
          </motion.div>
        </section>

        <section className="bg-secondary/50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-10">How Earnings Flow</h2>
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                {[
                  { step: "You (A)", action: "Share referral code", earn: "" },
                  { step: "Friend (B)", action: "Signs up with your code", earn: "You earn 5% on B's bookings" },
                  { step: "B's Friend (C)", action: "Signs up with B's code", earn: "You earn 2% on C's bookings" },
                  { step: "C's Friend (D)", action: "Signs up with C's code", earn: "You earn 1% on D's bookings" },
                ].map((item, i) => (
                  <motion.div key={item.step} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="relative pl-16 pb-8 last:pb-0">
                    <div className="absolute left-3 w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{i + 1}</div>
                    <div className="glass-luxe gold-border rounded-xl p-4">
                      <p className="font-semibold text-foreground text-sm">{item.step}</p>
                      <p className="text-xs text-muted-foreground">{item.action}</p>
                      {item.earn && <p className="text-xs font-semibold text-primary mt-1">{item.earn}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="glass-luxe gold-border rounded-2xl shadow-elevated p-8 max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Legal Compliance</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-success shrink-0 mt-0.5" />Compliant with Indian Consumer Protection (Direct Selling) Rules, 2021</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-success shrink-0 mt-0.5" />All earnings tied to real, completed booking transactions only</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-success shrink-0 mt-0.5" />No signup bonuses, no joining fees, no pyramid structure</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-success shrink-0 mt-0.5" />Anti-fraud: self-referral detection, fake booking prevention</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-success shrink-0 mt-0.5" />Transparent commission display & GST-compliant invoices</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default ReferralPage;
