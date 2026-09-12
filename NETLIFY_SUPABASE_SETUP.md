# Hiddentify — Legacy Netlify guide

> This guide is retained only as migration history. The active low-cost deployment plan is in `FREE_BETA_DEPLOYMENT.md`; do not start a new Netlify deployment.

This version is prepared for Netlify hosting and Supabase accounts/database. Players sign in directly on Hiddentify with email and password, Google, or a guest name. ChatGPT sign-in is not used.

## 1. Create the Supabase project

1. Open https://supabase.com and create a free account.
2. Select **New project**.
3. Name it `hiddentify` and create a strong database password.
4. Save the password somewhere private. Never put it in GitHub.
5. Wait until the project is ready.

## 2. Create the game database

1. In Supabase, open **SQL Editor**.
2. Select **New query**.
3. Open `supabase/schema.sql` from this project.
4. Copy the complete file into the SQL Editor.
5. Select **Run** once.

The script creates the account, room, player, evidence-action, voting, and private-interrogation tables. Row Level Security blocks browsers from reading these tables directly; only the Hiddentify server uses the private database connection.

## 3. Turn on player authentication

1. In Supabase, open **Authentication → Providers**.
2. Keep **Email** enabled.
3. Keep email confirmation enabled for real accounts.
4. Optional: enable **Google** and add the Google client ID and secret requested by Supabase.
5. Open **Authentication → URL Configuration**.
6. Set the Site URL to `https://hiddentify.space` after the custom domain is connected.
7. During the first Netlify test, add the generated `https://YOUR-SITE.netlify.app/**` address to Redirect URLs.

For public email confirmations, connect a custom SMTP provider. Resend works with Supabase and has a free plan. A suitable sender is `Hiddentify <no-reply@hiddentify.space>` after the domain is verified in Resend.

## 4. Copy the three required settings

From **Supabase → Project Settings → API**, copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

From **Supabase → Connect**, choose the **Transaction pooler** connection string and copy it as:

- Transaction pooler URL → `DATABASE_URL`

`DATABASE_URL` contains the database password and must remain private. The two `NEXT_PUBLIC_` values are intentionally available to the browser.

## 5. Put the project on GitHub

1. Create a free GitHub account and a private repository named `hiddentify`.
2. Upload or push this complete project to that repository.
3. Do not upload a real `.env` file. Only `.env.example` belongs in GitHub.

## 6. Deploy on Netlify

1. Open https://app.netlify.com and create a free account.
2. Select **Add new project → Import an existing project**.
3. Connect GitHub and choose the `hiddentify` repository.
4. Netlify reads `netlify.toml` and uses `npm run build:netlify` automatically.
5. Before deploying, add these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `DATABASE_URL`
6. Select **Deploy**.
7. Open the generated `netlify.app` address and create a three-player test room on separate browser sessions or phones.

## 7. Move `hiddentify.space`

1. In Netlify, open **Domain management → Add a domain you already own**.
2. Enter `hiddentify.space`.
3. Netlify will display the exact DNS records it needs.
4. Open the Namecheap DNS page for the domain.
5. Remove only the old web-host records that conflict with Netlify. Preserve email-related MX and TXT records.
6. Add the Netlify records exactly as displayed.
7. Wait for Netlify to issue the SSL certificate.
8. Return to Supabase and make `https://hiddentify.space` the Authentication Site URL.

## Important migration note

Existing rooms and ChatGPT-linked accounts remain in the old database and do not automatically move. Start the Netlify/Supabase version as a fresh database unless a separate one-time data export is performed. Keep the current public version online until the new Netlify address passes the multiplayer test.
