import { Link } from "react-router-dom";
import { Instagram, Twitter, Mail } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const Footer = () => (
  <footer className="relative overflow-hidden border-t border-primary/15 bg-secondary/45">
    <div className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
    <div className="pointer-events-none absolute -right-28 bottom-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <BrandLogo iconClassName="h-9 w-9 rounded-xl" wordmarkClassName="text-left" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            India's elevated stay marketplace for guests who value design, comfort, and trusted hosting.
          </p>
        </div>
        {[
          { title: "Explore", links: [["Browse Rooms", "/rooms"], ["Become a Host", "/host"], ["Referral Program", "/referral"]] },
          { title: "Support", links: [["Help Center", "/help"], ["Safety", "/safety"], ["Terms of Service", "/terms"]] },
          { title: "Legal", links: [["Privacy Policy", "/privacy"], ["Direct Selling Rules", "/mlm-disclosure"], ["Grievance", "/grievance"]] },
        ].map((col) => (
          <div key={col.title} className="space-y-4">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-primary">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map(([label, href]) => (
                <li key={href}><Link to={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-12 pt-8 border-t border-primary/15 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">Copyright 2026 BachloRoom. All rights reserved.</p>
        <div className="flex items-center gap-4">
          {[Instagram, Twitter, Mail].map((Icon, i) => (
            <a key={i} href="#" className="rounded-full border border-primary/20 p-2 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"><Icon className="w-4 h-4" /></a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
