# Newsletter System

No newsletter platform. No third-party branding. Own the list, send from Gmail or Resend.

---

## How it works

| Layer | Tool | What it does |
|---|---|---|
| Capture | Formspree | Collects email addresses from the signup forms |
| Storage | Formspree dashboard + `subscribers.json` | Raw list lives in Formspree; local file is your export |
| Sending | Resend (via `send.js`) or Gmail BCC | You control when and how email goes out |

---

## Setup (one-time)

### 1. Create a Formspree form for newsletter

1. Go to [formspree.io](https://formspree.io) and log in.
2. Create a new form — name it "Newsletter".
3. Copy the form ID (the part after `formspree.io/f/`).
4. Replace `YOUR_NEWSLETTER_FORM_ID` in two places:
   - `newsletter/index.html` — the `<form action="...">` attribute
   - `index.html` — same attribute in the homepage newsletter block

> Keep newsletter separate from the contact form (`xqewvkjk`) so submissions stay organized.

### 2. Set up Resend (for bulk sending)

```bash
cd newsletter
cp .env.example .env        # fill in your Resend API key and From address
npm install
```

Get a Resend API key at [resend.com](https://resend.com). Verify your domain there too (required to send from `@henrybpan.com`).

---

## Exporting subscribers from Formspree

1. Log in at [formspree.io](https://formspree.io).
2. Open your Newsletter form → **Submissions** tab.
3. Click **Export CSV**.
4. Copy the email column into `subscribers.json`:

```json
[
  "alice@example.com",
  "bob@example.com"
]
```

Or use the CLI helper to add emails one at a time:

```bash
node add.js alice@example.com bob@example.com
```

---

## Sending a newsletter

### Option A — Resend (recommended for lists over ~30)

Write your newsletter as an HTML file, then run:

```bash
node send.js "Subject Line" ./drafts/my-essay.html
```

Sends one email per subscriber. Reads from `subscribers.json`.

**Resend free tier:** 3,000 emails/month, 100/day. More than enough until ~500 subscribers.

### Option B — Gmail BCC (simplest, for small lists)

1. Export emails from Formspree (see above).
2. Compose a new email in Gmail.
3. Paste all addresses into the **BCC** field (not To — keeps addresses private).
4. Send.

**Gmail limits:**
- Up to 500 recipients per day for regular Gmail accounts.
- Up to 2,000/day for Google Workspace accounts.
- For lists under 200, BCC is perfectly fine.

---

## When to upgrade

| List size | Recommendation |
|---|---|
| < 200 | Gmail BCC works fine |
| 200–500 | Resend via `send.js` |
| 500+ | Consider [Resend Broadcasts](https://resend.com/broadcasts) (managed sending, unsubscribe links, analytics) or [Buttondown](https://buttondown.com) (minimal, writer-focused, $9/mo) |

Buttondown is the cleanest upgrade path — it's invisible to subscribers and you own the list.

---

## Unsubscribe workflow

Every email you send should include an unsubscribe line at the bottom:

```html
<p style="font-size:12px;color:#999;">
  You're receiving this because you subscribed at henrybpan.com.
  <a href="mailto:henry@henrybpan.com?subject=Unsubscribe&body=Please remove me from your newsletter.">Unsubscribe</a>
</p>
```

When someone replies or emails to unsubscribe:
1. Open `subscribers.json` and remove their email.
2. Done.

At this scale, manual unsubscribes take under 30 seconds. Automate only when it becomes a real burden.

---

## File reference

```
newsletter/
├── index.html          ← signup page at /newsletter
├── subscribers.json    ← local copy of the email list
├── add.js              ← CLI: node add.js email@example.com
├── send.js             ← CLI: node send.js "Subject" ./draft.html
├── .env.example        ← copy to .env, fill in Resend key
├── package.json        ← dependencies (resend, dotenv)
└── README.md           ← this file
```

The signup form also appears on the homepage (`/index.html`). Both forms post to the same Formspree endpoint.
