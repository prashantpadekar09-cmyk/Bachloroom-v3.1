# BachloRoom | Luxury Room discovery & Elevated Stays

BachloRoom is a high-end, luxury-focused room discovery and booking platform built with **React**, **Vite**, **Tailwind CSS**, and **Supabase**. It provides a premium, "Deep Midnight & Gold" styled interface for discovering boutique stays, suites, and elevated hospitality experiences across India.

## 🌟 Key Features

- **Luxury Discovery**: Curated lists of premium rooms with high-fidelity imagery and glassmorphism design.
- **Real-time Bookings**: Seemless integration with Supabase for instant booking status and history.
- **Host Dashboard**: Professional panel for hosts to manage listings, view earnings, and handle KYC.
- **Admin Control**: Complete administrative suite for managing users, verifying payments, and payouts.
- **Premium Animations**: Cinematic background particles, gold-shimmer CTA buttons, and smooth page transitions.
- **Referral System**: Multi-level referral commission engine built-in.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **bun** (preferred)

### 2. Installation
```powershell
# Clone the repository
git clone https://github.com/yourusername/bachloroom.git
cd bachloroom

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 4. Local Development
```powershell
npm run dev
```
The app will be available at `http://localhost:8080/`.

---

## ☁️ Deployment to Render

This project is pre-configured for automated deployment via **Render Blueprints** (`render.yaml`).

### Steps to Deploy:
1.  **Connect Repo**: Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Blueprint**.
2.  **Select Repository**: Connect your GitHub/GitLab repository.
3.  **Configure Service**:
    -   Render will automatically detect the `render.yaml` file.
    -   It will create a **Static Site** service.
4.  **Add Environment Variables**:
    -   In the Render Dashboard for your service, navigate to **Environment**.
    -   Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
5.  **Build & Deploy**: Click **Deploy Update**.

> [!IMPORTANT]
> The included `render.yaml` handles the **SPA Routing Rewrite** automatically, ensuring that refreshing the page on `/dashboard` or `/rooms` does not cause 404 errors.

---

## 🏗️ Tech Stack
- **Frontend**: React (TS), Vite, Framer Motion, Lucide Icons, Shadcn UI
- **Backend/DB**: Supabase
- **State/Data**: React Query
- **Styling**: Tailwind CSS (Custom Luxury Theme)
