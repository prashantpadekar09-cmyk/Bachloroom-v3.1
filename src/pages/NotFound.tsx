import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Sparkles } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-luxe gold-border rounded-[2rem] p-10 md:p-16 text-center max-w-lg"
      >
        <div className="mx-auto w-20 h-20 rounded-2xl gradient-gold flex items-center justify-center mb-6 shadow-gold">
          <Sparkles className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="font-display text-6xl font-bold text-gradient mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          This page doesn't exist in our luxury collection.
        </p>
        <Link
          to="/"
          className="btn-gold gold-shimmer inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-semibold"
        >
          <Home className="w-4 h-4" />
          Return to Home
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
