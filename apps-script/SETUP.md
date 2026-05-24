# Apps Script Setup — One-time

This script powers both the speaking-inquiry form **and** the new `/admin.html`
dashboard. The existing deploy URL stays the same; we're just publishing a new
version of the same script.

## 1) Create the Google Sheet
1. Go to https://sheets.google.com → **Blank**.
2. Name it: `Forever Forward — Client Tracker` (or anything you want).
3. Copy the **SHEET_ID** from the URL — it's the long string between `/d/`
   and `/edit`. Example:
   `https://docs.google.com/spreadsheets/d/`**`1ABC...xyz`**`/edit`
4. You don't need to make any tabs yourself — the script creates
   `Clients`, `Sessions`, and `Inquiries` automatically on first use.

## 2) Paste the new code
1. Open the existing Apps Script project (script.google.com → "My Projects" →
   the one you already deployed).
2. Select all the code in `Code.gs` and delete it.
3. Paste the contents of this folder's `Code.gs` over it. Save (`⌘S`).

## 3) Set the Script Properties
1. In the Apps Script editor, click the ⚙️ **Project Settings** (left sidebar).
2. Scroll to **Script properties** → **Add script property**.
3. Add two properties:
   - `ADMIN_PASSWORD` → pick a password (this is what you type at `/admin.html`)
   - `SHEET_ID` → paste the long ID you copied from the sheet URL

## 4) Re-deploy (same URL!)
1. Click **Deploy** → **Manage deployments**.
2. Click the pencil ✏️ on the existing deployment.
3. **Version**: select **New version**.
4. Click **Deploy**.
5. You may be prompted to re-authorize (because the script now touches
   Spreadsheets). Accept the permissions.

The `/exec` URL does **not** change — the existing site keeps working and the
admin page now works too.

## 5) Use it
- Public site: form on `/speaking.html` still works exactly as before. Submissions
  now also show up in the `Inquiries` tab of your sheet (and in the admin page).
- Admin: visit `https://foreverforwardcoaching.com/admin.html` and sign in with
  the `ADMIN_PASSWORD` you set above.

## What goes where
- **Clients tab** — one row per client you add through the admin page
- **Sessions tab** — one row each time you tap "Log Session"
- **Inquiries tab** — one row per speaking-engagement form submission
