# PhishGuard — Implementation Walkthrough

## Summary

Complete overhaul of the phishing email detection system: expanded from 9 to **20 detection engines** in the backend, and fully redesigned the UI from a generic AI-looking template to a professional cybersecurity command-center interface.

---

## Backend Changes

### [fish.py](file:///Users/david/fish/fish.py) — 20 Detection Engines

render_diffs(file:///Users/david/fish/fish.py)

#### Engine Inventory

| # | Engine | Category | What it detects |
|---|--------|----------|-----------------|
| 1 | Keyword Analysis | Content | Phishing phrases, urgency patterns, ALL CAPS, exclamation marks |
| 2 | URL Inspection | Content | IP-based URLs, suspicious TLDs, shorteners, encoding tricks, lookalike domains |
| 3 | Sender Verification | Header | Freemail impersonation, brand spoofing, suspicious TLDs, auto-generated addresses |
| 4 | Reply-To Mismatch | Header | Reply-To differs from From address |
| 5 | WHOIS Domain Age | Domain | Newly registered domains, privacy-protected registrations |
| 6 | Levenshtein Typosquatting | Domain | Edit distance to known brands (paypa1.com → PayPal) |
| 7 | Shannon Entropy | Domain | Random/auto-generated domain names |
| 8 | Google Safe Browsing | Reputation | Known malware/phishing sites via Google API |
| 9 | SPF/DKIM/DMARC | Header | Email authentication failures, spam status, relay hops |
| 10 | **Homoglyph Detection** | Domain | Unicode character substitution (Cyrillic е vs Latin e) |
| 11 | **Punycode/IDN** | Domain | Internationalized domain name spoofing |
| 12 | **Subdomain Abuse** | Domain | Brand names as subdomains of malicious domains |
| 13 | **Display vs Href Mismatch** | Content | Link text shows one domain, href points elsewhere |
| 14 | **Return-Path Mismatch** | Header | Bounce address differs from sender |
| 15 | **Attachment Scanner** | Content | Dangerous extensions, double-extension tricks, MIME mismatches |
| 16 | **HTML Obfuscation** | Content | Zero-font, hidden text, invisible elements, tiny text |
| 17 | **Form Action Analysis** | Content | Forms submitting to external/suspicious domains |
| 18 | **Image-Only Detection** | Content | Bodies that are entirely images (scanner evasion) |
| 19 | **PhishTank/OpenPhish** | Reputation | Community-maintained phishing URL databases |
| 20 | **IP Reputation** | Reputation | Spamhaus, SpamCop, Barracuda DNS blocklists |

#### New API endpoints
- `GET /api/engines` — Returns all 20 engine definitions with metadata

#### Key improvements
- HTML body extraction (was plain-text only)
- Gmail scanner now fetches both `text/plain` and `text/html` parts
- Gmail scanner extracts attachment metadata
- Per-engine score breakdown in analysis results

---

## Frontend Changes

### Design Direction
- **Before**: Generic glassmorphism SaaS template with floating orbs, blue/purple gradient text
- **After**: Professional cybersecurity command-center with sidebar navigation, deep navy palette, cyan/teal accents

### [index.html](file:///Users/david/fish/static/index.html) — SPA with 4 Views

render_diffs(file:///Users/david/fish/static/index.html)

1. **Dashboard** — Stats cards, threat distribution bar chart, recent scan results
2. **Analyze Email** — Manual raw email paste → detailed verdict card with engine breakdown
3. **Gmail Scanner** — OAuth-based inbox scanning with expandable result cards
4. **Detection Engines** — All 20 engines with descriptions, filterable by category

### [style.css](file:///Users/david/fish/static/style.css) — Command Center Design

render_diffs(file:///Users/david/fish/static/style.css)

- Space Grotesk headings (geometric, techy)
- Deep navy palette (#050a14) with cyan accents (#22d3ee)
- Subtle CRT scanline overlay
- SVG icons instead of emoji
- Proper sidebar layout with active indicators
- Responsive down to mobile

### [script.js](file:///Users/david/fish/static/script.js) — SPA Controller

render_diffs(file:///Users/david/fish/static/script.js)

- Hash-based SPA routing
- Manual email analyzer with built-in phishing sample
- Session-persistent stats
- CSS-only threat distribution bar chart
- Engine details loaded from `/api/engines`
- Category filtering on engines view

---

## Dependencies Added

render_diffs(file:///Users/david/fish/requirements.txt)

---

## Verification

| Test | Result |
|------|--------|
| `GET /api/health` | ✅ `{"status": "online", "engines": 20}` |
| `GET /api/engines` | ✅ Returns 20 engine definitions |
| `POST /analyze` (phishing sample) | ✅ Score: 64, Verdict: PHISHING |
| Server startup | ✅ Running on http://127.0.0.1:8000 |

### Phishing sample test triggered:
- Keywords: 33 points (17 hits)
- URLs: 9 points (suspicious TLD, no HTTPS, lookalike)  
- Header forensics: 16 points (SPF fail, DKIM fail, DMARC fail, spam marked)
- Reply-To mismatch: 3 points
- Return-Path mismatch: 3 points
- **Total: 64 → PHISHING verdict**
