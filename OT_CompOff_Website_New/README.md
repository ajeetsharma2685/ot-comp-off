# OT & Comp-Off Website
A fresh Next.js + Supabase starter for Staff OT/Comp-Off.

Features in this first build:
- Employee ID staff login
- No staff OTP/password
- Mobile-friendly dashboard
- OT date/start/end/reason
- Automatic OT-hour calculation
- Comp-Off date
- Per-OT Use Comp-Off action
- Used status prevents the UI from showing the action again

Setup:
1. Enable Supabase Anonymous Sign-Ins.
2. Run supabase_setup.sql.
3. Copy .env.example to .env.local.
4. Put the Supabase project URL and publishable key in .env.local.
5. npm install
6. npm run dev

Security note: Employee-ID-only access is convenient but is not strong authentication. Anyone who knows an enabled Employee ID could attempt to use it. Admin operations should use stronger authentication, and production HR/payroll use should add trusted device pairing or another stronger factor.
