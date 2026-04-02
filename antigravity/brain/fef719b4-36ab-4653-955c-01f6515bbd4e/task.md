# Phishing Detection System — Task Tracker

## Backend
- [x] Update requirements.txt (add beautifulsoup4, dnspython)
- [x] Add HTML body extraction
- [x] Add homoglyph detection engine (#10)
- [x] Add punycode/IDN detection engine (#11)
- [x] Add subdomain abuse detection (#12)
- [x] Add domain mismatch — display vs href (#13)
- [x] Add Return-Path mismatch (#14)
- [x] Add attachment analysis (#15)
- [x] Add HTML obfuscation detection (#16)
- [x] Add form action URL analysis (#17)
- [x] Add image-only email detection (#18)
- [x] Add PhishTank/OpenPhish lookup (#19)
- [x] Add IP reputation check — Spamhaus DNS (#20)
- [x] Wire all 20 engines into analyze_email()
- [x] Update Gmail scanner to fetch HTML parts + attachments
- [x] Add /api/engines endpoint

## Frontend
- [x] Rewrite index.html (sidebar SPA with 4 views)
- [x] Rewrite style.css (command-center design)
- [x] Rewrite script.js (SPA routing, manual analyzer, charts, engines view)

## Verification
- [x] Install dependencies (beautifulsoup4, dnspython)
- [x] Start server — running on http://127.0.0.1:8000
- [x] Test /api/health — returns 200 with 20 engines
- [x] Test /api/engines — returns all 20 engine definitions
- [x] Test /analyze with phishing sample — score 64, verdict PHISHING
- [ ] Visual verification in browser (browser tool unavailable)
