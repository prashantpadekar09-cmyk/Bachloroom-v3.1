import { Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const pageContent: Record<string, { title: string; intro: string; sections: { heading: string; body: string }[] }> = {
  "/help": {
    title: "Help Center",
    intro: "Find quick answers for bookings, hosting, referrals, payments, and account setup.",
    sections: [
      { heading: "Booking Help", body: "Use Browse Rooms to explore listings, open a room, and complete your booking from the room detail page." },
      { heading: "Hosting Help", body: "Use Become a Host to publish your room details, pricing, and photos for admin approval." },
      { heading: "Account Help", body: "Guests and hosts can update profile details from their dashboards to complete KYC and keep account information current." },
    ],
  },
  "/safety": {
    title: "Safety",
    intro: "BachloRoom promotes verified activity, profile review, and reporting tools to help guests and hosts feel more secure.",
    sections: [
      { heading: "Verified Profiles", body: "Admin can review KYC status and profile completeness before approving sensitive account actions." },
      { heading: "Booking Visibility", body: "Guests and hosts can view booking history, transaction status, and account activity directly from their dashboards." },
      { heading: "Issue Reporting", body: "Guests can report host issues, and admins can review reports and take moderation action when needed." },
    ],
  },
  "/terms": {
    title: "Terms of Service",
    intro: "These terms explain the basic platform rules for browsing, booking, hosting, referrals, and wallet use.",
    sections: [
      { heading: "Platform Use", body: "Users must provide accurate information, follow booking rules, and avoid misuse of rooms, referrals, or payment workflows." },
      { heading: "Host Responsibility", body: "Hosts are responsible for truthful listings, fair pricing, and keeping room information accurate." },
      { heading: "Wallet And Withdrawals", body: "Referral earnings and host earnings are subject to admin review, approval flows, and platform compliance checks." },
    ],
  },
  "/privacy": {
    title: "Privacy Policy",
    intro: "We collect the minimum account and transaction data required to support bookings, referrals, hosting, and compliance workflows.",
    sections: [
      { heading: "Profile Data", body: "Your name, phone, avatar, and account details may be used to manage bookings, KYC review, and support requests." },
      { heading: "Transaction Data", body: "Booking, withdrawal, and referral records are stored to support wallet history, admin review, and financial reconciliation." },
      { heading: "Access Control", body: "Users can access their own account data, while admins can access platform-wide data needed for moderation and operations." },
    ],
  },
  "/mlm-disclosure": {
    title: "Direct Selling Rules",
    intro: "BachloRoom referral earnings are tied to real completed booking activity and are presented for compliance transparency.",
    sections: [
      { heading: "Referral Basis", body: "Referral earnings are only generated from real booking outcomes, not from user signups alone." },
      { heading: "Commission Structure", body: "The app currently distributes referral commission through tracked transaction records visible in user dashboards." },
      { heading: "Compliance Intent", body: "The referral program is positioned around platform usage and booking activity rather than inventory loading or entry fees." },
    ],
  },
  "/grievance": {
    title: "Grievance",
    intro: "If you need support with bookings, hosting, payments, or account review, please contact the BachloRoom support team.",
    sections: [
      { heading: "Support Email", body: "You can raise account or booking issues through the support contact listed in the footer and admin-managed platform tools." },
      { heading: "Escalations", body: "Severe issues such as harassment, fraud, or safety concerns should be reported through the in-app reporting and admin review flow." },
      { heading: "Review Process", body: "Admins review reported issues, KYC concerns, payment proofs, and withdrawal requests inside the admin dashboard." },
    ],
  },
};

const InfoPage = () => {
  const location = useLocation();
  const content = pageContent[location.pathname] || {
    title: "Information",
    intro: "This page contains platform information.",
    sections: [],
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 pt-28 pb-16">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">BachloRoom</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-foreground">{content.title}</h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground">{content.intro}</p>
          <div className="mt-10 space-y-5">
            {content.sections.map((section) => (
              <section key={section.heading} className="glass-luxe gold-border rounded-2xl p-6">
                <h2 className="font-display text-2xl font-bold text-foreground">{section.heading}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
              </section>
            ))}
          </div>
          <div className="mt-10">
            <Link to="/" className="btn-gold inline-flex rounded-2xl px-6 py-3 text-sm font-semibold">
              Back To Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InfoPage;
