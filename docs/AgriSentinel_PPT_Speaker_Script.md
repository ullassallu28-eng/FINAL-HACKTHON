# AgriSentinel — PPT Speaker Script
## SIH Hackathon 2026 | Problem Statement SIH260487

**Project:** Digital Farm Management Portal for Implementing Biosecurity Measures in Pig and Poultry Farms  
**Team Platform:** AgriSentinel — Digital Farm Biosecurity Platform  
**Suggested presentation time:** 8–10 minutes (+ 2 minutes Q&A)

---

### Live Demo (use during presentation)

| Resource | URL |
|----------|-----|
| **Website** | https://farm-2wx5.vercel.app/ |
| **Backend API** | https://agrisentinel-api.onrender.com |
| **API Docs** | https://agrisentinel-api.onrender.com/docs |
| **GitHub** | https://github.com/ullaspn70-dotcom/FARM |

**Demo logins**

| Role | Email | Password |
|------|-------|----------|
| Farmer | farmer@bioshield.local | farmer123 |
| Veterinarian | vet@bioshield.local | vet123 |
| Government Officer | officer@bioshield.local | officer123 |

---

## SLIDE 1 — Title

**On screen:** AgriSentinel | Digital Farm Biosecurity Platform | SIH260487

**SPEAK (30 seconds):**

> Good morning / afternoon, judges. We are [Team Name], and we present **AgriSentinel** — a Digital Farm Biosecurity Platform for pig and poultry farms.
>
> Our problem statement is **SIH260487**: building a digital farm management portal to implement biosecurity measures and protect India's livestock sector from disease outbreaks.

---

## SLIDE 2 — The Problem

**On screen:** Why biosecurity matters | Outbreak risk | Manual record-keeping gaps

**SPEAK (45 seconds):**

> Pig and poultry farms face constant biosecurity threats — sudden mortality, respiratory disease, feed contamination, and perimeter breaches.
>
> Today, many farms still rely on **paper records**, phone calls, and delayed veterinary response. When an outbreak starts, information travels slowly. Corrective actions are not tracked. Government officers lack a real-time district view.
>
> **The result:** faster spread, economic loss, and food supply risk.

---

## SLIDE 3 — Our Solution

**On screen:** AgriSentinel — one platform, three roles, closed-loop workflow

**SPEAK (40 seconds):**

> **AgriSentinel** is a full-stack web platform that connects **farmers**, **veterinarians**, and **government officers** on one system.
>
> Farmers monitor biosecurity and report incidents. Veterinarians verify reports with evidence. Officers oversee the district on a GIS map.
>
> Every action updates a **biosecurity score** — so compliance is measurable, not guesswork.

---

## SLIDE 4 — Problem Statement Alignment

**On screen:** SIH260487 requirements ↔ AgriSentinel features (table)

**SPEAK (45 seconds):**

> We mapped every SIH requirement to a live feature:
>
> - **Digital farm management** → multi-farm portal for poultry, pig, and mixed farms  
> - **Biosecurity monitoring** → daily checklist, digital passport, risk score  
> - **Incident reporting** → form with photo evidence and veterinary verification  
> - **Risk assessment** → rule-based engine with score history  
> - **Multi-stakeholder access** → Farmer, Vet, and Officer portals  
> - **Regional oversight** → officer dashboard and GIS map  
> - **Closed-loop response** → incident → verify → corrective action → score update

---

## SLIDE 5 — Architecture

**On screen:** React frontend → FastAPI backend → PostgreSQL | Vercel + Render

**SPEAK (50 seconds):**

> Our architecture is production-grade, not a mock-up.
>
> **Frontend:** React 19, TypeScript, Vite — hosted on **Vercel**  
> **Backend:** FastAPI with **40+ REST APIs** — hosted on **Render**  
> **Database:** PostgreSQL with Alembic migrations  
> **Security:** JWT authentication with role-based access  
>
> The system is **live and deployed** — you can open the demo URL right now.

---

## SLIDE 6 — Farmer Portal

**On screen:** Dashboard screenshot | Biosecurity score | Checklist

**SPEAK (45 seconds):**

> **[LIVE DEMO — switch to Farmer role]**
>
> This is the farmer dashboard. Each farm shows a **biosecurity score out of 100** and a risk level — Safe, Caution, or Critical.
>
> Farmers complete a **daily biosecurity checklist** — sanitation, disinfection, visitor logs.
>
> They can report health incidents, view corrective actions, and open their **Digital Biosecurity Passport** with QR code for field inspections.

---

## SLIDE 7 — Incident Reporting (Live Demo)

**On screen:** Incident form | Evidence upload

**SPEAK (60 seconds):**

> **[LIVE DEMO — Report Incident]**
>
> When a farmer sees unusual mortality or symptoms, they open **Report Incident**.
>
> They select incident type, animal species, number affected, farm zone, and description.
>
> Critically, they can **upload photo or document evidence** — this goes directly to the veterinarian's queue.
>
> The incident status is **Reported** until a vet verifies it — we never mark an outbreak as confirmed without veterinary review.

---

## SLIDE 8 — Veterinarian Portal

**On screen:** Vet verification queue | Validate / Reject / Request info

**SPEAK (60 seconds):**

> **[LIVE DEMO — switch to Veterinarian role]**
>
> The veterinarian sees a **District Verification Queue**. Pending incidents appear at the top.
>
> The vet reviews farm details, symptoms, and **uploaded evidence**.
>
> They can **Validate** the incident — which auto-generates corrective actions — **Reject** a false alarm, or **Request more information** from the farmer.
>
> This creates accountability: every outbreak claim is professionally reviewed before district action.

---

## SLIDE 9 — Corrective Actions & Evidence

**On screen:** Action list | Evidence upload | Vet action plan

**SPEAK (45 seconds):**

> After verification, **corrective actions** are assigned to the farmer — for example, disinfection, quarantine, or perimeter repair.
>
> The farmer uploads **compliance evidence** — photos with GPS and timestamp metadata.
>
> Veterinarians can send a structured **Action Plan**, and our system supports **AI-assisted evidence analysis** to flag unrelated uploads.

---

## SLIDE 10 — Government Officer & GIS

**On screen:** Officer dashboard | GIS map with farm nodes

**SPEAK (45 seconds):**

> **[LIVE DEMO — switch to Government Officer role]**
>
> The officer sees **district statistics** — total farms, high-risk count, open incidents, pending inspections.
>
> The **GIS Farm Map** shows every registered farm with risk colour coding, incident markers, and spatial risk context.
>
> This supports **data-driven field inspections** — officers prioritize high-risk farms first.

---

## SLIDE 11 — Offline-First & PWA (Differentiator)

**On screen:** Offline save → auto sync | IndexedDB | Service worker

**SPEAK (45 seconds):**

> A key differentiator: AgriSentinel works in **rural low-connectivity areas**.
>
> Farmers can complete checklists, report incidents, and queue evidence **offline**. Data is stored safely on the device.
>
> When internet returns, changes **sync automatically** — with duplicate protection and clear local vs server status.
>
> This is a real offline implementation — not just an "offline label."

---

## SLIDE 12 — Closed-Loop Workflow

**On screen:** Flow diagram (Registration → Score → Incident → Verify → Actions → Update)

**SPEAK (40 seconds):**

> AgriSentinel is a **closed loop**:
>
> 1. Farm registration and biosecurity assessment  
> 2. Continuous monitoring via checklist and risk engine  
> 3. Incident reported with evidence  
> 4. Veterinary verification  
> 5. Corrective actions generated  
> 6. Farmer submits compliance proof  
> 7. Biosecurity score updated  
> 8. Government oversight via GIS  
>
> No step is isolated — the full outbreak response chain is connected.

---

## SLIDE 13 — Technology & Scalability

**On screen:** Tech stack table | Future roadmap

**SPEAK (40 seconds):**

> **Built today:** React, FastAPI, PostgreSQL, JWT, Vercel, Render, GitHub CI/CD.
>
> **Ready to extend:** Health records API, spatial risk API, AI image diagnosis, IoT sensor feeds, SMS alerts, and real state-wide farm database import.
>
> Our modular API design lets AI and IoT teams plug in without rebuilding the platform.

---

## SLIDE 14 — Impact & Key Differentiators

**On screen:** Bullet list of differentiators

**SPEAK (40 seconds):**

> **Why AgriSentinel stands out:**
>
> - Fully **cloud-deployed** live demo — not slides-only  
> - **Three real roles** sharing one database  
> - **Evidence-based** incident workflow  
> - **Offline-capable** for rural farmers  
> - **Closed-loop** biosecurity design  
> - Directly aligned with **SIH260487**  
>
> **Impact:** Faster outbreak detection, accountable veterinary response, measurable compliance, and district-level visibility for government.

---

## SLIDE 15 — Thank You / Q&A

**On screen:** AgriSentinel — Protecting Farms, Securing Food Supply | Demo URL | GitHub

**SPEAK (20 seconds):**

> Thank you, judges. AgriSentinel — **Protecting Farms, Securing Food Supply**.
>
> Live demo: **farm-2wx5.vercel.app**  
> We welcome your questions.

---

## QUICK 3-MINUTE VERSION (if time is limited)

| Step | Time | Action |
|------|------|--------|
| 1 | 30s | Problem + solution (Slides 2–3) |
| 2 | 45s | Farmer dashboard + report incident |
| 3 | 45s | Vet verify incident |
| 4 | 30s | Officer GIS map |
| 5 | 30s | Architecture + thank you |

---

## JUDGE Q&A — PREPARED ANSWERS

**Q: Is this only for demo or production-ready?**  
> A: Core workflows are live on cloud with real database, authentication, file upload, and role-based APIs. AI diagnosis and IoT are on the roadmap.

**Q: How is risk score calculated?**  
> A: Rule-based engine using incidents, checklist compliance, mortality signals, and verification outcomes — recalculated when farm data changes.

**Q: What if internet is poor?**  
> A: Offline-first PWA — farmers save locally; sync runs automatically when connectivity returns.

**Q: How do you prevent fake incident reports?**  
> A: Veterinary verification is mandatory before an incident is confirmed. Evidence is reviewed. Officers see district-wide patterns on GIS.

**Q: Database and security?**  
> A: PostgreSQL on Render, JWT auth, role-based API access, HTTPS on Vercel and Render.

---

## HOW TO EXPORT THIS FILE AS PDF

1. Open this file in **Microsoft Word** or **Google Docs** (copy-paste content)  
2. Apply heading styles for slide titles  
3. **File → Download / Export → PDF**  
4. Or in VS Code: install "Markdown PDF" extension → right-click → Export PDF  

---

*AgriSentinel — Protecting Farms, Securing Food Supply*  
*SIH Hackathon 2026 | Problem Statement SIH260487*  
*Document generated: August 2026*
