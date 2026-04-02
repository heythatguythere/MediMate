# Phishing Detector Dashboard

Build a premium, modern dashboard frontend for the existing FastAPI phishing detector. The dashboard will be served directly from the FastAPI app.

## Proposed Changes

### Frontend Static Files

#### [NEW] [index.html](file:///Users/david/fish/static/index.html)
Single-page dashboard with:
- **Hero header** with animated gradient background, app title & live status indicator
- **Email analyzer** — textarea to paste raw email, analyze button, results panel
- **Results display** — color-coded verdict (SAFE/SUSPICIOUS/PHISHING) with score gauge, risk reasons list, and animated transitions
- **Sample emails sidebar** — pre-built test emails to quickly demo the tool
- **Stats section** — animated counters for emails scanned, threats detected

#### [NEW] [style.css](file:///Users/david/fish/static/style.css)
Premium dark theme design system:
- **Google Font**: Inter (400/500/600/700)
- **Color palette**: Deep navy/purple dark mode with vibrant accent gradients (emerald for safe, amber for suspicious, rose for phishing)
- **Glassmorphism cards** with backdrop-filter blur, subtle borders
- **Micro-animations**: hover effects, smooth transitions, pulsing status dot, result reveal animations
- **Responsive layout** using CSS Grid / Flexbox

#### [NEW] [script.js](file:///Users/david/fish/static/script.js)
- Fetch calls to `/analyze` endpoint
- Dynamic result rendering with animated transitions
- Sample email loading
- Status polling on `/`

---

### Backend Changes

#### [MODIFY] [fish.py](file:///Users/david/fish/fish.py)
- Mount `static/` directory using FastAPI's `StaticFiles`
- Add `GET /dashboard` route returning the HTML page
- Redirect `GET /` to serve the dashboard instead of JSON (keep the API health check available at `/api/health`)
- Add `jinja2` or just `FileResponse` for serving HTML

## Verification Plan

### Automated Tests
- `curl http://127.0.0.1:8000/` — should return the dashboard HTML
- `curl -X POST http://127.0.0.1:8000/analyze -H "Content-Type: application/json" -d '{"raw_email":"From: test@example.com\nSubject: Hello"}'` — API should still work

### Manual Verification
- Open **http://127.0.0.1:8000/** in browser
- Verify dashboard loads with dark theme, glassmorphism cards, Inter font
- Paste a sample email and click Analyze — results should appear with color-coded verdict
- Test responsive layout by resizing window
