import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Home, Search, User, Users, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";

const navLinks = [
  { label: "Rooms", href: "/rooms" },
  { label: "Referral", href: "/referral" },
  { label: "Host", href: "/host-dashboard" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuth();
  const isActiveRoute = (href: string) => location.pathname === href || location.pathname.startsWith(`${href}/`);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-navbar shadow-card" : "bg-transparent"
        }`}
      >
        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent transition-opacity ${scrolled ? "opacity-100" : "opacity-0"}`} />
        <div className="container mx-auto px-4 flex items-center justify-between h-16 md:h-20">
          <Link to="/" aria-label="BachloRoom home">
            <BrandLogo />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 px-4">
            {navLinks.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                to={link.href}
                className={`text-sm font-medium transition-colors relative group ${isActiveRoute(link.href) ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 gradient-gold-blue rounded-full transition-all duration-300 ${isActiveRoute(link.href) ? "w-full" : "w-0 group-hover:w-full"}`} />
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-2">
                    <Shield className="w-4 h-4" /> Admin
                  </Link>
                )}
                <Link to="/dashboard" className="rounded-full border border-primary/25 bg-primary/10 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-4 py-2">
                  {profile?.full_name || "Dashboard"}
                </Link>
                <button onClick={handleSignOut} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 flex items-center gap-1">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2">Log in</Link>
                <Link to="/signup" className="text-sm font-semibold btn-gold gold-shimmer px-5 py-2.5 rounded-full">Book Premium</Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 z-40 glass-navbar shadow-elevated p-4 lg:hidden border-b border-primary/15">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActiveRoute(link.href) ? "metal-chip text-foreground" : "text-foreground hover:bg-secondary"}`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-border my-2" />
            {user ? (
              <>
                {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-primary">Admin Panel</Link>}
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-foreground">Dashboard</Link>
                <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="px-4 py-3 rounded-xl text-sm font-medium text-foreground text-left">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-foreground">Log in</Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-xl text-sm font-semibold btn-gold text-center">Book Premium</Link>
              </>
            )}
          </nav>
        </div>
      )}

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-navbar border-t border-border">
        <div className="flex items-center justify-around py-2">
          {[
            { icon: Home, label: "Home", href: "/" },
            { icon: Search, label: "Explore", href: "/rooms" },
            { icon: Users, label: "Referral", href: "/referral" },
            { icon: User, label: "Profile", href: user ? "/dashboard" : "/login" },
          ].map((item) => (
            <Link key={item.href} to={item.href} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${location.pathname === item.href ? "text-primary metal-chip" : "text-muted-foreground"}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;
