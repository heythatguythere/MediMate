# Phishing Detection System — Complete Overhaul

## Goal
Implement **all** missing detection layers from the spec and redesign the UI to look professional/handcrafted rather than AI-generated.

## Current State
The backend (`fish.py`) already implements 9 detection engines:
1. ✅ Keyword/phrase matching with urgency patterns
2. ✅ URL analysis (length, subdomains, IP-based, TLD, shorteners, encoding, @-symbol, lookalike)
3. ✅ Sender verification (freemail, brand impersonation, suspicious TLD, auto-generated)
4. ✅ Reply-To mismatch
5. ✅ WHOIS domain age check
6. ✅ Levenshtein typosquatting detection
7. ✅ Shannon entropy (random domain detection)
8. ✅ Google Safe Browsing API
9. ✅ Header forensics (SPF/DKIM/DMARC, spam headers, hop count)

## Missing Detection Modules (Backend)

### New engines to add to `fish.py`:

| # | Engine | Description | Weight |
|---|--------|-------------|--------|
| 10 | **Homoglyph Detection** | Unicode character substitution (Cyrillic е vs Latin e, 0 vs O) | +5 |
| 11 | **Punycode/IDN Detection** | Internationalized domain name spoofing (xn-- prefixed domains) | +4 |
| 12 | **Subdomain Abuse** | e.g. `paypal.com.evil.net` — brand in subdomain, different registrable domain | +4 |
| 13 | **Domain Mismatch (Display vs Href)** | HTML <a> text says "bank.com" but href goes elsewhere | +5 |
| 14 | **Return-Path Mismatch** | Bounce address differs from From header | +3 |
| 15 | **Attachment Analysis** | Dangerous extensions (.exe, .vbs, .js, .docm), password-protected archives, MIME mismatch | +3–6 |
| 16 | **HTML Obfuscation** | Hidden text, zero-font-size, excessive CSS display:none | +4 |
| 17 | **Form Action URL Analysis** | HTML forms submitting to external/suspicious domains | +5 |
| 18 | **Image-Only Email** | Body is entirely an image (evasion technique) | +3 |
| 19 | **PhishTank/OpenPhish Lookup** | Real-time URL phishing database check | +10 |
| 20 | **IP Reputation Check** | Check sender IP against Spamhaus ZEN via DNS lookup | +3–5 |

### Modifications to existing code:
- Add HTML body extraction (currently only `text/plain` is parsed; need `text/html` for DOM analysis)
- Wire all new engines into `analyze_email()` with per-engine breakdown
- Add new endpoint `POST /analyze-raw` that accepts pasted email text from the manual analyzer

---

## UI Redesign

> [!IMPORTANT]
> The user explicitly says the current UI "looks AI." The redesign should feel **handcrafted, professional, and cybersecurity-specific** — like a SOC analyst's command center, not a generic SaaS template.

### Design Direction
- **Color palette**: Deep navy (`#060b18`) with cyan/teal accents (`#22d3ee`, `#06b6d4`) instead of the overused blue/purple gradient
- **Typography**: Keep Inter for body but add **Space Grotesk** for headings (geometric, techy feel)
- **Layout**: Two-column dashboard with a left sidebar navigation instead of single-column scroll
- **Remove**: Floating orbs, generic gradient text, API reference section (move to /docs)
- **Add**: Manual email paste analyzer, threat distribution chart (pure CSS), per-engine detailed view, scan history

### New UI Sections
1. **Sidebar** — Navigation: Dashboard, Analyze Email, Scan Gmail, Detection Engines
2. **Dashboard View** — Stats cards + recent scan results + threat distribution bar
3. **Analyze View** — Paste raw email text → analyze → detailed verdict card
4. **Gmail Scanner View** — Same as current but with better email cards
5. **Engine Details View** — Shows all 20 detection engines with descriptions and status

---

## Proposed Changes

### Backend

#### [MODIFY] [fish.py](file:///Users/david/fish/fish.py)
- Add `extract_html_body()` function for HTML content extraction
- Add 11 new detection engine functions (homoglyph, punycode, subdomain abuse, domain mismatch, return-path, attachment analysis, HTML obfuscation, form action, image-only, PhishTank, IP reputation)
- Wire all into `analyze_email()` with engine breakdown
- Add `beautifulsoup4` import for HTML parsing
- Add `dnspython` import for IP reputation DNS checks

### Frontend

#### [MODIFY] [index.html](file:///Users/david/fish/static/index.html)
- Complete rewrite with sidebar layout, multi-view SPA structure, manual analyzer, engine details

#### [MODIFY] [style.css](file:///Users/david/fish/static/style.css)
- Complete rewrite with new cybersecurity command-center design system

#### [MODIFY] [script.js](file:///Users/david/fish/static/script.js)
- Add SPA routing, manual email analysis, engine details rendering, threat chart

### Dependencies

#### [MODIFY] [requirements.txt](file:///Users/david/fish/requirements.txt)
- Add `beautifulsoup4` (HTML parsing)
- Add `dnspython` (IP reputation DNS checks)

---

## Open Questions

> [!IMPORTANT]  
> **PhishTank API Key**: PhishTank requires a free API key for lookups. Should I use the free tier (which works without a key but is rate-limited), or do you have an API key?

> [!IMPORTANT]
> **Gmail HTML body**: Currently the Gmail scanner only fetches `text/plain` parts. Should I also fetch `text/html` parts for the new HTML-based detection engines? This will make the analysis more thorough but slightly slower.

---

## Verification Plan

### Automated Tests
- Start the server with `python fish.py`
- Test `POST /analyze` with a crafted phishing email containing homoglyphs, suspicious attachments, form actions
- Test `GET /api/health`
- Visually verify the UI in browser

### Manual Verification  
- Navigate to `http://127.0.0.1:8000` and verify the new UI layout
- Test the manual email analyzer with a sample phishing email
- Test Gmail scan (if credentials are configured)
- Check all 20 detection engines show in the engine details view
