# Enable collaborative accounts

The app is still usable locally without a backend. These steps enable real accounts, cross-device sync and private friend connections. A Supabase project is required; no production Supabase project is created or migrated automatically by the frontend.

## 1. Create the project

In <https://supabase.com/dashboard> create a project in your account. Choose a suitable region and keep the database password in a password manager. Wait for provisioning. Open **Project Settings → API** (or **Connect / API keys**, depending on dashboard version) and obtain:

- Project URL, for example `https://YOUR_PROJECT.supabase.co`.
- The **publishable key** (`sb_publishable_...`) or legacy **anon** key.

These two values are public browser configuration. Never use a service-role key, `sb_secret_...`, database password or management token in a `VITE_` variable. The build rejects recognized private keys. Database authorization relies on the SQL policies, not hiding the public key.

## 2. Apply the migrations

For a new project, use the Supabase **SQL Editor** to execute each file in this order:

1. `supabase/migrations/202610190001_collaboration.sql`
2. `supabase/migrations/202610190002_catalog.sql`
3. `supabase/migrations/202610190003_friend_map.sql`

Each migration has a transaction or a single statement; inspect errors before continuing. They are versioned migrations, not scripts to rerun over an already migrated database. Do not disable RLS to work around an error.

Alternatively, with the official Supabase CLI installed and logged in securely:

```sh
supabase init  # only if you have not initialized CLI configuration locally
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The managed project supplies `auth.users`, `auth.uid()` and the `anon` / `authenticated` roles. The test-only files in `tests/security/` must **never** be applied to a production project. They create dummy identities and grant test assertion helpers.

The tables are profiles, place_records, travel_entries, connections, invitations, operation_receipts and a fixed place_catalog. Table writes are revoked from browser roles. Narrow authenticated RPCs enforce ownership, revision checks and invitation transactions. Accepted friends see place statuses, custom colors, display name and the default map color; they cannot read preferences, email or journal entries. Either party can disconnect.

## 3. Configure email authentication

Under **Authentication → Sign In / Providers → Email**, enable email sign-in and account creation.

This app uses **email OTP codes**, not an implicit magic-link callback. In **Authentication → Email Templates**, include `{{ .Token }}` in the **Magic Link** email and, if used by your configuration, the **Confirm Signup** email. For example:

```html
<h2>Our Little World</h2>
<p>Your sign-in code is: <strong>{{ .Token }}</strong></p>
<p>Enter it in the app where you requested it.</p>
```

Do not publish real codes in logs or screenshots. Use the configured 6–8-digit email code. Set a reasonable OTP expiry and rate limits; Supabase's default email service has testing/delivery limits. Configure your own SMTP through Supabase when needed. Delivery failures or rate limits are shown in the sign-in form; the app does not resend codes in a loop.

In **Authentication → URL Configuration** set:

- **Site URL:** your actual app URL, e.g. `https://ting24k.github.io/Travel-Map-App/`.
- **Redirect URLs:** the same production URL and your development URL (`http://localhost:5173/`). Add staging origins explicitly when needed.

The code-based flow does not depend on redirect callbacks. Keeping these URLs accurate also avoids surprises if you later enable magic links. Invitation tokens are separate from authentication and live in the URL fragment; signing in grants no friend access until the user explicitly accepts.

## 4. Configure and test the frontend

Copy `.env.example` to `.env.local` and set the two public values:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Restart Vite after changing build variables. Run `npm run dev`, then open **Account → Settings** and sign in. Accounts require connectivity; a previously cached account can browse and edit offline. Sign out to return to the original local profile. Pending authenticated changes remain keyed to their account and resume only when that same account signs in again.

### Preserve and import existing records

1. On the **original browser and origin** where you marked places, export its local JSON backup before upgrading or moving domains.
2. Sign into the new account, open **Account → Settings → Bring your local memories**.
3. Download **Back up original local data**. Choose **Preview local import**, or select a validated backup from another device.
4. Review every place and status. Existing cloud records are kept by default. Only check the replacement option if you intend to replace matching cloud records.
5. Confirm import. Imported place colors are preserved, including the original default appearance. Cloud preferences are kept. Journals receive deterministic account-scoped IDs. The original local database is not erased or reassigned.
6. Wait for **Synced with cloud** and resolve any conflicts. “Queued” or “saved on device” is not confirmation of cloud storage. Then sign into the same account on another device to verify the result.
7. If anything is wrong, sign out and restore the original JSON through local backup restore. You can review/import it again as a deliberate operation; the exact same source cannot be accidentally queued repeatedly for the same account. Cloud data is not automatically rolled back; undo through reviewed edits or a new explicit import.

## 5. Deploy

### Existing GitHub Pages deployment

In GitHub **Settings → Secrets and variables → Actions → Variables**, add the public repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The Pages workflow uses them for the final production build, not for deterministic test fixtures. No service-role secret is required. Merge the upgrade branch after reviewing it, then run the Pages workflow. Keep **Settings → Pages → Source = GitHub Actions**.

The workflow runs TypeScript lint/type checks, unit tests, SQL authorization tests on disposable PostgreSQL, local browser journeys, and isolated-session API contract journeys. Only `main` deploys. Builds on the feature branch do not replace the live app.

### Cloudflare Pages / Vercel

Import the repository. Use Node 24, build command `npm run build`, output `dist`, and set the two public build variables above. Leave `BASE_PATH` unset for a root-domain deployment. Add the resulting HTTPS origin to Supabase Auth URL configuration. On GitHub project Pages, use `BASE_PATH=/Travel-Map-App/`.

Changing origins changes browser storage. Export from the old origin before moving. The account's confirmed cloud records will load on a new origin after sign-in; unsynchronized offline changes still belong to the old browser/origin until uploaded.

## 6. Live acceptance

Use two real email accounts and two devices/browser profiles:

- A signs in on computer, records a place, waits for Synced; A signs in on iPhone and confirms it loads.
- B signs in independently and cannot see A's private map before connecting.
- A creates an invitation; B opens it, reviews the inviter and accepts. Verify both see place maps read-only, comparison colors and derived China states.
- Create a private journal on A; A's other device loads it and B cannot see it.
- Test offline edits, reload, reconnect and sync. Edit the same place on both devices; confirm the conflict UI keeps both choices until explicit resolution.
- Revoke an invitation, try expiry/reuse, and disconnect. Server access must disappear immediately after disconnect; a client already holding old bytes clears friend views at the next refresh/focus and never persists them offline.

Local unit tests, browser API doubles and standalone PostgreSQL permission tests do **not** establish live Supabase Auth, email delivery, deployed RLS or real iPhone Safari support. Record these live checks only after executing them on your project and devices.
