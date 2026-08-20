# AgriSentinel — SIH Hackathon 2026
## Digital Farm Management Portal for Biosecurity in Pig & Poultry Farms

**Problem Statement ID:** SIH260487  
**Team Platform:** AgriSentinel — Digital Farm Biosecurity Platform  
**Document Version:** August 2026

---

### Live Demo Links

| Resource | URL |
|----------|-----|
| **Website (Demo)** | https://backend-farm-mdws.vercel.app |
| **Backend API** | https://agrisentinel-api.onrender.com |
| **API Documentation** | https://agrisentinel-api.onrender.com/docs |
| **GitHub Repository** | https://github.com/ullassallu28-eng/BACKEND-FARM- |

---

## 1. Executive Summary

AgriSentinel is a full-stack **Digital Farm Biosecurity Portal** designed for **pig and poultry farms**. It provides a closed-loop system covering farm registration, biosecurity assessment, risk monitoring, incident reporting, veterinary verification, corrective actions, and government oversight through GIS mapping.

The platform supports three user roles — **Farmer**, **Veterinarian**, and **Government Officer** — each with a dedicated portal connected to a central PostgreSQL database via a FastAPI backend.

---

## 2. Problem Statement Alignment (SIH260487)

| SIH Requirement | AgriSentinel Solution |
|-----------------|----------------------|
| Digital farm management for pig & poultry farms | Multi-farm portal with poultry, pig, and mixed farm types |
| Biosecurity monitoring & compliance | Biosecurity score, digital passport, daily checklist |
| Incident reporting & outbreak control | Incident form with photo evidence; vet verification workflow |
| Risk assessment & analytics | Rule-based risk engine with factors and score history |
| Role-based multi-stakeholder access | Farmer, Veterinarian, and Government Officer portals |
| Corrective actions & evidence tracking | Action list with evidence upload and verification |
| Regional / district oversight | Officer dashboard and GIS farm map |
| Closed-loop biosecurity response | Incident → Verify → Corrective Action → Score Update |

---

## 3. Role-Based Features

### 3.1 Farmer Portal

- Farm dashboard with biosecurity score (0–100) and risk level (Safe / Caution / Critical)
- Multi-farm selection across registered poultry and pig farms
- Routine biosecurity verification checklist (sanitation, disinfection, visitor logs)
- Report farm health incidents with:
  - Incident category (mortality, respiratory, contamination, perimeter breach, etc.)
  - Animal species, batch, and number affected
  - Farm zone location, date/time, and symptom description
  - Photo and document evidence upload
- Recent farm incident log on dashboard
- Digital Biosecurity Passport with component scores and inspection history
- Risk analytics dashboard showing active risk factors
- Corrective actions list with compliance evidence submission
- Aarohi AI Biosecurity Advisor — contextual tips from live risk data
- Real-time notifications for incidents and verifications

### 3.2 Veterinarian Portal

- District Veterinary Verification Queue
- Review incoming incident reports with full farm and health details
- Inspect uploaded diagnostic evidence (photos/documents)
- Validate (verify) incidents — auto-generates corrective actions
- Request additional information from farmers
- Reject non-critical or false-positive reports
- Add veterinary inspection notes and comments
- Track workflow status: Reported → Under Review → Verified / Rejected

### 3.3 Government Officer Portal

- District field command overview
- Regional farm statistics and inspection priority list
- GIS farm map with location-based risk indicators
- Identify high-risk farms requiring field inspection
- Cross-farm biosecurity oversight for the district

---

## 4. Core Platform Modules

| # | Module | Description | Status |
|---|--------|-------------|--------|
| 1 | Farm Registration & Profile | Farm ID, owner, type, location, animal population | ✅ Live |
| 2 | Biosecurity Passport | Digital passport with scores, QR code, compliance status | ✅ Live |
| 3 | Biosecurity Assessment | Component scores: hygiene, visitor control, quarantine, waste | ✅ Live |
| 4 | Risk Calculation Engine | Rule-based scoring from incidents, mortality, sanitation | ✅ Live |
| 5 | Incident Reporting | Form submission with multipart photo/document upload | ✅ Live |
| 6 | Veterinary Verification | Validate, reject, or request info on reported incidents | ✅ Live |
| 7 | Corrective Actions | Auto-generated after verification; evidence tracking | ✅ Live |
| 8 | Checklist Management | Daily biosecurity verification tasks per farm | ✅ Live |
| 9 | GIS Mapping | Geographic farm nodes with risk context | ✅ Live |
| 10 | Notifications | Role-based alerts for incidents, verifications, risk updates | ✅ Live |
| 11 | Authentication & Roles | JWT-based login for Farmer, Vet, Officer | ✅ Live |
| 12 | Aarohi AI Advisor | Rule-based biosecurity guidance from risk data | ✅ Live |
| 13 | Health Records API | Farm health record management endpoints | ✅ Backend Ready |
| 14 | Spatial Risk API | Nearby farm risk and spatial analysis | ✅ Backend Ready |

---

## 5. Closed-Loop Biosecurity Workflow

```
Farm Registration
       ↓
Biosecurity Assessment & Score Calculation
       ↓
Continuous Monitoring (Checklist + Risk Factors)
       ↓
Health Incident Reported (with Photo Evidence)
       ↓
Veterinary Verification Queue
       ↓
Validate / Reject / Request More Information
       ↓
Corrective Actions Auto-Generated
       ↓
Farmer Submits Compliance Evidence
       ↓
Biosecurity Score Updated
       ↓
Government Officer — GIS & District Overview
```

---

## 6. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Backend API | FastAPI (Python), 40+ REST endpoints |
| Database | PostgreSQL (Alembic migrations) |
| Authentication | JWT (JSON Web Tokens) |
| Website Hosting | Vercel |
| API & Database Hosting | Render Cloud |
| Version Control | GitHub (Monorepo: BACKEND-FARM-) |

---

## 7. Team Responsibilities

| Team Member | Responsibility |
|-------------|----------------|
| Backend / API Developer | FastAPI backend, deployment, API integration, workflows |
| Database Developer | PostgreSQL schema, migrations, seed data, real farm imports |
| AI / ML Developer | Image-based disease detection, medicine recommendations (planned) |
| Frontend Developer | React UI/UX integrated with live API |
| IoT Developer | Sensor telemetry integration (planned) |

---

## 8. Future Enhancements (Roadmap)

| Feature | Status |
|---------|--------|
| AI image diagnosis from uploaded farm photos | 🔜 Planned (AI Team) |
| Automated medicine & treatment recommendations | 🔜 Planned (AI Team) |
| Live IoT sensor feeds (temperature, mortality sensors) | 🔜 Planned (IoT Team) |
| Real Jharkhand farm database import | 🔜 In Progress (DB Team) |
| SMS / WhatsApp alerts to farmers | 🔜 Future Enhancement |

---

## 9. Demo Script (2–3 Minutes for Judges)

1. **Farmer Role** — Show dashboard, biosecurity score, and daily checklist
2. **Report Incident** — Fill form, upload photo evidence, submit report
3. **Veterinarian Role** — Open verification queue, review evidence, validate incident
4. **Corrective Actions** — Show auto-generated actions for the farmer
5. **Government Officer** — Display GIS farm map and district overview
6. **Aarohi Advisor** — Click AI assistant for contextual biosecurity tips
7. **Biosecurity Passport** — Open digital passport with scores and history

---

## 10. Key Differentiators

- **Full-stack live deployment** — not a prototype; fully cloud-hosted demo
- **True multi-role workflow** — Farmer, Vet, and Officer portals share one database
- **Evidence-based incident reporting** — photo upload attached to veterinary review
- **Closed-loop design** — every incident flows through verification to corrective action
- **Scalable architecture** — modular API ready for AI, IoT, and real farm data integration
- **Aligned with SIH260487** — directly addresses pig & poultry biosecurity management

---

*AgriSentinel — Protecting Farms, Securing Food Supply*  
*SIH Hackathon 2026 | Problem Statement SIH260487*
