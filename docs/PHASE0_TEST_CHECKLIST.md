# Phase 0 - Internal Testing Checklist
## EntregaFácil Mobile v1.0.0

**Test Period**: _______________ to _______________  
**Test Lead**: _______________  
**Build Version**: 1.0.0-build.1  
**Build Profile**: Development  

---

## 📱 Device Matrix

| Device | OS Version | Tester | Status | Notes |
|--------|------------|--------|--------|-------|
| **iOS** | | | | |
| iPhone 15 Pro | iOS 17.x | | ☐ Pass / ☐ Fail | |
| iPhone 14 | iOS 17.x | | ☐ Pass / ☐ Fail | |
| iPhone 13 | iOS 16.x | | ☐ Pass / ☐ Fail | |
| iPhone SE (3rd) | iOS 16.x | | ☐ Pass / ☐ Fail | |
| **Android** | | | | |
| Pixel 7 Pro | Android 14 (API 34) | | ☐ Pass / ☐ Fail | |
| Samsung Galaxy S23 | Android 13 (API 33) | | ☐ Pass / ☐ Fail | |
| Motorola Edge 40 | Android 13 (API 33) | | ☐ Pass / ☐ Fail | |
| Samsung Galaxy A54 | Android 13 (API 33) | | ☐ Pass / ☐ Fail | |
| Moto G Power (2022) | Android 12 (API 31) | | ☐ Pass / ☐ Fail | |

**Minimum Supported**: iOS 15.1 / Android 10 (API 29)

---

## 🔥 Smoke Tests (Must Pass)

### S-01: App Launch & Authentication
| Step | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| 1. Install development build | App installs without error | | ☐ / ☐ |
| 2. Cold start (< 3s) | Splash → Login screen | | ☐ / ☐ |
| 3. Login with valid credentials | Navigate to Routes tab | | ☐ / ☐ |
| 4. Login with invalid credentials | Error message shown | | ☐ / ☐ |
| 5. Register new account | Email verification / direct login | | ☐ / ☐ |
| 6. Logout → Login again | Session restored | | ☐ / ☐ |
| 7. Magic link login (if configured) | Email → app opens logged in | | ☐ / ☐ |

### S-02: Address Management
| Step | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| 1. Navigate to Addresses tab | List loads (empty or populated) | | ☐ / ☐ |
| 2. Add address manually | Form validates, saves | | ☐ / ☐ |
| 3. Search address (Nominatim) | Results appear, selectable | | ☐ / ☐ |
| 4. Import CSV (sample file) | 5+ addresses imported | | ☐ / ☐ |
| 5. Share address via WhatsApp | Opens WhatsApp with address | | ☐ / ☐ |
| 6. Edit address | Changes persisted | | ☐ / ☐ |
| 7. Delete address | Removed from list | | ☐ / ☐ |
| 8. Offline: add address → online sync | Queued, syncs when online | | ☐ / ☐ |

### S-03: Route Creation & Optimization
| Step | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| 1. Create new route | Name, date, vehicle selectable | | ☐ / ☐ |
| 2. Add 3+ waypoints from addresses | Waypoints listed in order | | ☐ / ☐ |
| 3. Drag-and-drop reorder | Order updates visually | | ☐ / ☐ |
| 4. Save as draft | Route in "Rascunho" status | | ☐ / ☐ |
| 5. Optimize route (OSRM) | Waypoints reordered, metrics shown | | ☐ / ☐ |
| 6. Optimize with 10+ waypoints | Falls back to GraphHopper VRP | | ☐ / ☐ |
| 7. View route on map | MapLibre loads, route line visible | | ☐ / ☐ |
| 8. Start route | Status → "Em Andamento" | | ☐ / ☐ |

### S-04: Checklist & Delivery Proof
| Step | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| 1. Open route checklist | Waypoints listed with status badges | | ☐ / ☐ |
| 2. Tap waypoint → Proof screen | Camera opens, GPS captured | | ☐ / ☐ |
| 3. Capture photo | Preview shows, validation runs | | ☐ / ☐ |
| 4. GPS validation (move outdoors) | "Foto válida ✓" appears | | ☐ / ☐ |
| 5. Add signature | Canvas draws, saves | | ☐ / ☐ |
| 6. Confirm delivery (Entregue) | Status → ✅, success modal | | ☐ / ☐ |
| 7. Register problem (Cliente Ausente) | Status → ⚠️, observation saved | | ☐ / ☐ |
| 8. WhatsApp notification sent | Status badge: "Enviado ✓" | | ☐ / ☐ |
| 9. WhatsApp status updates | "Entregue ✓✓" → "Lido ✓✓✓" | | ☐ / ☐ |

### S-05: Offline & Sync
| Step | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| 1. Enable airplane mode | Offline indicator appears | | ☐ / ☐ |
| 2. Create address offline | "Salvo offline" toast | | ☐ / ☐ |
| 3. Create route offline | Saved locally | | ☐ / ☐ |
| 4. Capture proof offline | Queued for sync | | ☐ / ☐ |
| 5. Disable airplane mode | Auto-sync triggers (15min or manual) | | ☐ / ☐ |
| 6. Verify server sync | Data appears on other device/web | | ☐ / ☐ |
| 7. Conflict resolution (edit same offline/online) | Merge dialog or LWW | | ☐ / ☐ |

### S-06: Maps & Navigation
| Step | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| 1. Open map tab | MapLibre loads, user location centered | | ☐ / ☐ |
| 2. Download offline map (small region) | Progress bar, completes | | ☐ / ☐ |
| 3. Navigate with offline map | Turn-by-turn works offline | | ☐ / ☐ |
| 4. Driving mode (simulate) | Large buttons, voice guidance | | ☐ / ☐ |
| 4. Remove offline map | Space freed, map removed | | ☐ / ☐ |

### S-07: WhatsApp Integration
| Step | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| 1. Open WhatsApp settings | Connection status shown | | ☐ / ☐ |
| 2. Pair QR code | QR displays, scan with phone | | ☐ / ☐ |
| 3. Connection status → "Conectado" | Green badge, templates load | | ☐ / ☐ |
| 4. Edit template | Changes saved to Evolution API | | ☐ / ☐ |
| 5. Send test message | Received on test number | | ☐ / ☐ |
| 6. Delivery notification auto-send | Triggered on "Entregue" | | ☐ / ☐ |

### S-08: Profile & Settings
| Step | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| 1. Edit profile (name, phone, email) | Saves, updates backend | | ☐ / ☐ |
| 2. Add vehicle + CRLV upload | Vehicle card shows, CRLV badge | | ☐ / ☐ |
| 3. Toggle theme (Claro/Escuro/Sistema) | Immediate UI change | | ☐ / ☐ |
| 4. Toggle voice navigation + volume | Persists, used in navigation | | ☐ / ☐ |
| 5. Toggle "Sync apenas Wi-Fi" | Sync pauses on mobile data | | ☐ / ☐ |
| 6. Toggle push notifications | Receives test notification | | ☐ / ☐ |
| 7. Clear cache | Storage reduces, data intact | | ☐ / ☐ |
| 8. Reset preferences | All toggles back to defaults | | ☐ / ☐ |

### S-09: History & Reports
| Step | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| 1. Open History tab | Stats cards, route list loads | | ☐ / ☐ |
| 2. Filter by status/date/search | Results update instantly | | ☐ / ☐ |
| 3. Export route PDF | File generated, shareable | | ☐ / ☐ |
| 4. Export route CSV | Opens in Sheets/Excel | | ☐ / ☐ |
| 5. Stats accuracy | Matches completed routes | | ☐ / ☐ |

---

## ⚡ Performance Benchmarks

| Metric | Target | Measured | Pass/Fail |
|--------|--------|----------|-----------|
| Cold start time | < 3.0s | | ☐ / ☐ |
| Warm start time | < 1.5s | | ☐ / ☐ |
| Route list load (50 routes) | < 1.0s | | ☐ / ☐ |
| Map initial load | < 2.0s | | ☐ / ☐ |
| Camera startup | < 1.5s | | ☐ / ☐ |
| Photo capture → preview | < 1.0s | | ☐ / ☐ |
| GPS validation | < 3.0s | | ☐ / ☐ |
| Route optimization (10 wp) | < 5.0s | | ☐ / ☐ |
| Sync batch (10 ops) | < 3.0s | | ☐ / ☐ |
| Memory baseline (idle) | < 150 MB | | ☐ / ☐ |
| Memory peak (navigation) | < 300 MB | | ☐ / ☐ |
| 60fps scrolling (lists) | No jank | | ☐ / ☐ |

---

## 🔋 Battery Test (Continuous Navigation)
| Scenario | Duration | Battery Drop | Pass/Fail |
|----------|----------|--------------|-----------|
| Navigation + GPS + Screen on | 2 hours | < 25% | ☐ / ☐ |
| Navigation + GPS + Screen off (driving mode) | 4 hours | < 20% | ☐ / ☐ |

---

## 🌐 Network Conditions
| Condition | Test | Expected | Pass/Fail |
|-----------|------|----------|-----------|
| Wi-Fi (strong) | All flows | Full functionality | ☐ / ☐ |
| 4G/LTE (good) | All flows | Full functionality | ☐ / ☐ |
| 3G (poor) | Core flows | Works, slower | ☐ / ☐ |
| Offline → Online | Sync | Seamless recovery | ☐ / ☐ |
| Flaky (packet loss 10%) | Sync + API | Retries, eventually succeeds | ☐ / ☐ |

---

## ♿ Accessibility
| Feature | Test | Pass/Fail |
|---------|------|-----------|
| VoiceOver (iOS) | All screens navigable, labels correct | ☐ / ☐ |
| TalkBack (Android) | All screens navigable, labels correct | ☐ / ☐ |
| Dynamic Type (200%) | Text scales, no truncation | ☐ / ☐ |
| Reduce Motion | Animations disabled | ☐ / ☐ |
| High Contrast | Colors meet 4.5:1 ratio | ☐ / ☐ |
| Touch Targets | All ≥ 48dp (56dp preferred) | ☐ / ☐ |

---

## 🐛 Known Issues / Blockers

| ID | Description | Severity | Blocker? | Workaround |
|----|-------------|----------|----------|------------|
| | | | | |
| | | | | |

---

## ✅ Phase 0 Sign-Off

| Role | Name | Signature | Date | Go/No-Go |
|------|------|-----------|------|----------|
| Test Lead | | | | ☐ Go / ☐ No-Go |
| Mobile Tech Lead | | | | ☐ Go / ☐ No-Go |
| Backend Tech Lead | | | | ☐ Go / ☐ No-Go |
| QA Lead | | | | ☐ Go / ☐ No-Go |
| Product Owner | | | | ☐ Go / ☐ No-Go |

---

## 📊 Summary

| Category | Total Tests | Passed | Failed | Blocked | Pass Rate |
|----------|-------------|--------|--------|---------|-----------|
| Smoke Tests | | | | | |
| Performance | | | | | |
| Battery | | | | | |
| Network | | | | | |
| Accessibility | | | | | |
| **TOTAL** | | | | | |

**Overall Decision**: ☐ **GO** → Proceed to Phase 1 (Beta 5%)  
**Overall Decision**: ☐ **NO-GO** → Fix blockers, re-test

---

## 📝 Notes

______________________________________________________________________________
______________________________________________________________________________
______________________________________________________________________________
______________________________________________________________________________