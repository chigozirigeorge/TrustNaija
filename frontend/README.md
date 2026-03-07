# TrustNaija Frontend

Nigeria-first fraud intelligence platform — React + TypeScript + Tailwind.

## Setup

```bash
npm install
cp .env.example .env
npm run dev       # http://localhost:3000
npm run build     # Production build
```

## Pages

| Route | Page | Auth |
|---|---|---|
| `/` | Homepage with instant lookup | Public |
| `/result?q=...` | Risk score result | Public |
| `/report` | Report a scam form | Public |
| `/ussd` | USSD guide & FAQ | Public |
| `/evidence` | Evidence vault upload | Public |
| `/login` | OTP phone auth | - |
| `/admin` | Moderation dashboard | Admin only |

## Stack
- **React 18** + **TypeScript**
- **Vite** build tool
- **TailwindCSS** with custom navy/signal color system
- **React Router v6** for routing
- **React Hook Form** for form validation
- **Axios** with JWT interceptors
- **Recharts** for admin analytics
- **react-dropzone** for evidence vault

## Design System
- **Fonts**: Syne (display) + DM Sans (body) + JetBrains Mono
- **Primary**: `#0B1F3A` navy blue
- **Success/Safe**: `#0FA958` signal green
- **Warning**: `#F4A300` amber
- **Danger**: `#D92D20` red
- Dark mode by default (add `light` class to `<html>` for light mode)
