# Setup Guide: LIGTAS TIGDAS Dashboard

This guide walks you through putting the whole dashboard online, from your
data source to a live website link you can share. No coding experience
needed — every step just involves clicking buttons in a website.

**The four pieces, in plain language:**

| Piece | What it does | Analogy |
|---|---|---|
| **Google Sheet** | Where the daily vaccination numbers are typed in | The filing cabinet |
| **Apps Script** | *(Optional)* A workaround if your organization blocks the normal way of sharing the sheet | A side door, for when the front door is locked |
| **GitHub** | Stores the dashboard's files (the code you already have) | A cloud storage folder, built for website files |
| **Cloudflare Pages** | Takes the files from GitHub and turns them into a live website | The delivery truck that puts it on the internet |

You only need to set each one up **once**. After that, updating the Google
Sheet is all you'll ever need to do — the website updates itself.

---

## Table of contents

1. [Part 1 — Google Sheet](#part-1--google-sheet)
2. [Part 2 — Apps Script (optional workaround)](#part-2--apps-script-optional-workaround)
3. [Part 3 — GitHub](#part-3--github)
4. [Part 4 — Cloudflare Pages](#part-4--cloudflare-pages)
5. [Everyday use — updating data](#everyday-use--updating-data)
6. [Troubleshooting](#troubleshooting)

---

## Part 1 — Google Sheet

The dashboard reads its numbers from a Google Sheet that is shared
publicly-but-read-only (nobody can edit it except people you invite, but
the *dashboard* can read the numbers).

### 1.1 — Which sheet to use

- **If you already have a working "Ligtas Tigdas" tracking sheet**, you can
  keep using it — skip to [1.3](#13--publish-the-sheet-so-the-website-can-read-it).
- **If you're starting from scratch**, make a copy of an existing correctly
  laid-out sheet (ask a colleague who already has one, or duplicate last
  year's) rather than building the columns yourself — the column layout is
  very specific (see [reference table](#column-reference-troubleshooting-only)
  below) and mistakes here are the #1 cause of a dashboard showing no data.
  In Google Sheets: **File → Make a copy**.

### 1.2 — What the sheet needs to look like

Each row is one place (a region, a province, or a city/municipality).
Column **A** holds the name (e.g. "Albay", "City of Naga", "Region V (Bicol
Region)") — the dashboard matches this text automatically, so names must be
spelled the normal way (it's forgiving about "City of X" vs "X City" and
capitalization, but the place must be a real Bicol province, city, or
municipality).

The rest of the columns hold: the target population, then daily vaccination
counts for each of the 15 campaign days, then weekly and overall totals.
The exact column layout is in the [reference table](#column-reference-troubleshooting-only)
at the bottom of this guide — you shouldn't need it unless something looks
wrong later.

### 1.3 — Publish the sheet so the website can read it

1. Open your Google Sheet.
2. Go to **File → Share → Publish to web**.
3. In the dialog: under the first dropdown, choose the specific sheet/tab
   with your data (or leave it as "Entire Document"). Under the second
   dropdown, choose **Comma-separated values (.csv)**.
4. Click the green **Publish** button, then confirm.
5. Separately, click the blue **Share** button (top-right of the sheet) and
   make sure **General access** is set to **"Anyone with the link"** →
   **Viewer**. (Publishing alone sometimes isn't enough — the dashboard
   needs both.)

> **If your organization has disabled "Publish to web"** — some government
> and school Google accounts block this for security reasons. If the option
> is greyed out or missing, skip ahead to **[Part 2 — Apps Script](#part-2--apps-script-optional-workaround)**,
> which is a workaround for exactly this situation.

### 1.4 — Get your Sheet ID and tab ID

Look at your sheet's address bar. It looks like this:

```
https://docs.google.com/spreadsheets/d/1av1ERInFHC1DsFxrtfBvcszpA4yhTxBSv4HVnfgmWoM/edit#gid=0
                                        └──────────────── Sheet ID ────────────────┘        └gid┘
```

- The long jumble of letters/numbers between `/d/` and `/edit` is your
  **Sheet ID**.
- The number after `gid=` at the end is your **tab ID** (`0` means the
  first tab).

Keep these two values handy — you'll paste them into the code in
[Part 3](#part-3--github).

---

## Part 2 — Apps Script (optional workaround)

**Skip this entire section if Part 1.3 worked for you.** This is only
needed if your Google account won't let you "Publish to web."

Apps Script lets you create a tiny, free program that lives inside your
Google Sheet and hands out the data a different way — one that most
organizations don't block.

### 2.1 — Create the script

1. Open your Google Sheet.
2. Go to **Extensions → Apps Script**. A new tab opens with a code editor.
3. Open **`code.gs`** from this same folder (it's plain text — open it in
   Notepad, TextEdit, or any text editor) and copy its contents.
4. Back in the Apps Script editor, delete anything already in the box
   (there may be an empty `function myFunction() {}`) and paste in what
   you copied.
5. Click the **Save project** icon (floppy disk) at the top. Give the
   project any name, e.g. "Ligtas Tigdas Data Bridge".

### 2.2 — Publish it as a Web App

1. Click the blue **Deploy** button (top-right) → **New deployment**.
2. Click the gear/cog icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Execute as:** Me *(your account)*
   - **Who has access:** Anyone
4. Click **Deploy**.
5. Google will ask you to **authorize** the script — click **Authorize
   access**, choose your account, and if you see a "Google hasn't verified
   this app" warning, click **Advanced → Go to [project name] (unsafe)**.
   This warning appears because it's your own private script, not because
   anything is actually wrong.
6. After deploying, copy the **Web app URL** shown (it looks like
   `https://script.google.com/macros/s/AKfycb.../exec`). This is what
   you'll paste into the dashboard's code in [Part 3](#part-3--github).

> **Whenever you edit this script's code later**, you must repeat step
> 2.2 as **Manage deployments → edit (pencil) → New version → Deploy**,
> or your changes won't take effect.

---

## Part 3 — GitHub

GitHub stores your dashboard's files and is what Cloudflare Pages will
publish from. You're not writing any code here — just uploading files
through a website, the same way you'd upload files to Google Drive.

### 3.1 — Create an account

Go to **[github.com](https://github.com)** and sign up (free) if you don't
already have an account.

### 3.2 — Create a new repository

1. Click the **+** icon (top-right) → **New repository**.
2. **Repository name:** something like `ligtas-tigdas-dashboard`.
3. Choose **Public** or **Private** (either works with Cloudflare Pages;
   Private just means only people you invite can see the *code* — the
   published website is visible either way once it's live).
4. Leave everything else as default, click **Create repository**.

### 3.3 — Upload the dashboard files

1. On your new repository's page, click **uploading an existing file**
   (or **Add file → Upload files**).
2. Unzip the `Bicol.zip` folder you have on your computer. Open the
   unzipped `Bicol` folder so you can see the files inside it directly
   (`index.html`, `app.js`, `style.css`, `Logo.png`, the `data` folder,
   this `guide.md`, and `code.gs`).
3. **Drag all of those files and the `data` folder** straight into the
   GitHub upload box — make sure `index.html` ends up at the top level of
   the repository, not inside an extra "Bicol" folder.
4. Scroll down, add a short message like "Initial upload," and click
   **Commit changes**.

### 3.4 — Update the Sheet ID (and Apps Script URL, if you used it)

1. In your repository, click on **`app.js`**.
2. Click the pencil (✏️) icon in the top-right to edit it directly in the
   browser.
3. Near the top, find this block:

```javascript
const CONFIG = {
  sheetId: new URLSearchParams(location.search).get('sheet') || "1av1ERInFHC1DsFxrtfBvcszpA4yhTxBSv4HVnfgmWoM",
  gid: new URLSearchParams(location.search).get('gid') || 0,
  appsScriptUrl: ""
};
```

4. Replace the long ID inside the quotes after `sheetId:` with **your own
   Sheet ID** from [1.4](#14--get-your-sheet-id-and-tab-id).
5. Replace the `0` after `gid:` with **your own tab ID**, if it's different.
6. **Only if you had to use Apps Script in Part 2:** paste your Web App URL
   between the quotes after `appsScriptUrl:`, e.g.
   `appsScriptUrl: "https://script.google.com/macros/s/AKfycb.../exec"`.
   Otherwise leave it as `""`.
7. Scroll down and click **Commit changes**.

---

## Part 4 — Cloudflare Pages

This is the step that turns your GitHub files into an actual website with
a live link.

### 4.1 — Create an account

Go to **[dash.cloudflare.com](https://dash.cloudflare.com)** and sign up
(free) if you don't already have an account.

### 4.2 — Connect your repository

1. In the Cloudflare dashboard, go to **Workers & Pages** in the left
   sidebar.
2. Click **Create** → **Pages** tab → **Connect to Git**.
3. Authorize Cloudflare to access your GitHub account, then select the
   repository you created in Part 3.

### 4.3 — Configure the build

You'll see a "Set up builds and deployments" screen. This is a plain
HTML site, so there's nothing to "build" — fill it in like this:

| Field | Value |
|---|---|
| **Framework preset** | None |
| **Build command** | *(leave empty)* |
| **Build output directory** | `/` |

Click **Save and Deploy**.

### 4.4 — You're live

After a minute or two, Cloudflare gives you a link like
`https://ligtas-tigdas-dashboard.pages.dev` — this is your live dashboard.
Open it and confirm it loads correctly.

> **Custom domain (optional):** if you own a domain name, you can point it
> at this site under **Custom domains** in the same Pages project — no
> extra cost from Cloudflare's side.

---

## Everyday use — updating data

Once everything above is set up, **you never need to touch GitHub or
Cloudflare again for normal use.** Just:

1. Open your Google Sheet.
2. Update the daily vaccination numbers.
3. That's it — refresh the live dashboard link and the new numbers appear
   within a few seconds (there's no "publish" step to repeat, unless you
   add a brand-new tab/sheet later).

If you ever edit the *dashboard's code itself* (colors, text, layout),
repeat Part 3.3–3.4 (upload the changed file, commit) — Cloudflare Pages
automatically re-publishes the site within about a minute of any GitHub
change.

---

## Troubleshooting

**The dashboard shows "Offline · sample data" instead of my real numbers.**
This means it couldn't read your sheet. Check, in order:
1. Is **General access** on the sheet really set to "Anyone with the link
   → Viewer"? (Part 1.3)
2. Did you also complete **File → Share → Publish to web**? Both steps are
   needed.
3. Is the **Sheet ID** in `app.js` typed correctly, with no extra spaces?
4. If using Apps Script: did you **Deploy** (not just Save) after the most
   recent code change, and is "Who has access" set to **Anyone**?

**Some place names show 0% even though I entered numbers.**
The name in column A probably doesn't match an official Bicol
province/city/municipality name closely enough. Check spelling against
the official PSGC list, and avoid extra text in the cell beyond the name
itself.

**I changed the Google Sheet but the website still shows old numbers.**
Wait about 5 minutes — Google's "Publish to web" CSV can take a few
minutes to refresh after an edit. If using the direct (non-Apps-Script)
method, this delay is normal and on Google's side, not something the
dashboard controls.

**The site didn't update after I changed a file on GitHub.**
Check the **Workers & Pages → your project → Deployments** tab in
Cloudflare — it should show a new deployment triggered automatically.
If it's stuck or failed, click into it to see the error, or try
**Retry deployment**.

### Column reference (troubleshooting only)

You shouldn't need this unless you're diagnosing a sheet built from
scratch. Columns not read by the dashboard usually hold daily/weekly
**percentage** formulas for human reading — the dashboard recalculates
percentages itself from the raw counts.

| Column(s) | Contents |
|---|---|
| A | Name (region / province / city / municipality) |
| B | Target population (6–59 months) |
| C, E, G, I, K | Daily count, Week 1 (Aug 10–14) |
| M, O, P | Week 1 total / deferred / refusal |
| Q, S, U, W, Y | Daily count, Week 2 (Aug 17–21) |
| AA, AC, AD | Week 2 total / deferred / refusal |
| AE, AG, AI, AK, AM | Daily count, Week 3 (Aug 24–28) |
| AO, AQ, AR | Week 3 total / deferred / refusal |
| AS, AU, AV | Overall total / deferred / refusal |
| AW | Remaining unvaccinated |

(Columns in between, like D, F, N, R, etc., are typically daily/weekly
percentage columns — safe to keep for your own reading, the dashboard
just skips over them.)
