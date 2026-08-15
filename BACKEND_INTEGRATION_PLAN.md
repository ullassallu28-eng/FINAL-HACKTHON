# BioShield — Backend Integration Plan

**Project:** SIH260487 — Digital Farm Management Portal for Biosecurity Measures in Pig and Poultry Farms  
**Platform:** BioShield — Closed-Loop Biosecurity & Farm Response Platform  
**Document purpose:** Map the existing frontend to required backend APIs, data models, and integration steps.  
**Scope:** Analysis and planning only — no backend implementation, no frontend UI changes.

---

## Table of Contents

1. [Frontend Architecture Summary](#1-frontend-architecture-summary)
2. [Pages & Navigation](#2-pages--navigation)
3. [Component Inventory](#3-component-inventory)
4. [Forms](#4-forms)
5. [Buttons & Actions](#5-buttons--actions)
6. [Hardcoded Data](#6-hardcoded-data)
7. [Simulated / Mock Data](#7-simulated--mock-data)
8. [API Integration Points (Existing Service Layer)](#8-api-integration-points-existing-service-layer)
9. [Core Workflow Mapping](#9-core-workflow-mapping)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [User Roles & Access Matrix](#11-user-roles--access-matrix)
12. [Database Entities & Relationships](#12-database-entities--relationships)
13. [API Endpoint Specification](#13-api-endpoint-specification)
14. [Additional Endpoints (UI Gaps / Future Hooks)](#14-additional-endpoints-ui-gaps--future-hooks)
15. [Required Frontend Changes (Non-UI)](#15-required-frontend-changes-non-ui)
16. [Environment Variables](#16-environment-variables)
17. [Integration Phases](#17-integration-phases)
18. [File Reference Index](#18-file-reference-index)

---

## 1. Frontend Architecture Summary

| Aspect | Detail |
|--------|--------|
| **Stack** | React 19 + TypeScript + Vite |
| **Routing** | Tab-based SPA (`NavTab` state in `App.tsx`) — no React Router |
| **State** | React Context (`AuthContext`, `NotificationContext`) + local component state |
| **Data layer** | `src/services/api.ts` — async service objects with in-memory mock stores |
| **Live telemetry** | Separate client-side simulation engine (`src/simulation/`) — not part of `api.ts` |
| **Types** | Canonical contracts in `src/types/index.ts` |
| **Styling** | Custom CSS (`App.css`, `index.css`) — do not modify for backend integration |

The frontend is **already structured for backend swap**: replace mock implementations inside `src/services/api.ts` with real HTTP calls. Components consume services only — they do not import `mockData.ts` directly (except `AuthContext`).

---

## 2. Pages & Navigation

There is a single HTML page. "Pages" are **navigation tabs** rendered in the main workspace.

| Tab ID | Label (Sidebar) | Role Visibility | Rendered Component | Notes |
|--------|-----------------|-----------------|-------------------|-------|
| `overview` | Dashboard Overview | All | `FarmerDashboard` / `VetDashboard` / `OfficerDashboard` | Role-dependent default home |
| `passport` | Biosecurity Passport | All | `FarmerDashboard` + opens `BiosecurityPassportModal` | Modal fetches passport via API |
| `risk` | Risk Analytics | All | `RiskDashboard` | Fetches risk factors via API |
| `incident` | Report & Track / Incident Queue | All | `FarmerDashboard` (farmer) / `VetDashboard` (vet) | Vet sees verification queue |
| `actions` | Corrective Actions | All | `CorrectiveActionsList` | Role-filtered actions |
| `gis` | GIS Farm Map | All | `GisFarmMap` | Officer primary use case |
| `officer` | Inspection Priorities | Vet, Officer | `OfficerDashboard` | Regional command center |

**Global overlays (not tabs):**

| Overlay | Component | Trigger |
|---------|-----------|---------|
| Biosecurity Passport Modal | `BiosecurityPassportModal` | Sidebar, Navbar farm actions, GIS panel |
| Incident Report Modal | `IncidentReportForm` | Sidebar quick action, Farmer dashboard, mobile nav |
| Evidence Upload Modal | `EvidenceUploadModal` | Corrective Actions table (farmer) |
| Notification Drawer | `NotificationCenter` | Navbar bell icon |
| Simulation Control Bar | Inline in `App.tsx` | Always visible footer — presentation/demo mode |

---

## 3. Component Inventory

### 3.1 Layout & Shell

| Component | Path | Responsibility |
|-----------|------|----------------|
| `App` | `src/App.tsx` | Providers, tab routing, modals, simulation bar |
| `Navbar` | `src/components/common/Navbar.tsx` | Branding, **role switcher**, farm selector, notifications |
| `Sidebar` | `src/components/common/Sidebar.tsx` | Desktop navigation, farmer quick actions |
| `MobileNav` | `src/components/common/MobileNav.tsx` | Mobile drawer + bottom tab bar |
| `StatusBadge` | `src/components/common/StatusBadge.tsx` | Risk, incident, action, farm-type badges |

### 3.2 Role Dashboards

| Component | Path | Data Sources |
|-----------|------|--------------|
| `FarmerDashboard` | `src/components/farmer/FarmerDashboard.tsx` | `AuthContext.activeFarm`, `useSimulation().snapshot` |
| `VetDashboard` | `src/components/vet/VetDashboard.tsx` | `incidentService` |
| `OfficerDashboard` | `src/components/officer/OfficerDashboard.tsx` | `officerService`, `farmService` |
| `RiskDashboard` | `src/components/risk/RiskDashboard.tsx` | `riskService`, `AuthContext.activeFarm` |

### 3.3 Feature Modules

| Component | Path | Data Sources |
|-----------|------|--------------|
| `BiosecurityPassportModal` | `src/components/farmer/BiosecurityPassportModal.tsx` | `passportService` |
| `IncidentReportForm` | `src/components/incident/IncidentReportForm.tsx` | `incidentService`, `AuthContext` |
| `CorrectiveActionsList` | `src/components/corrective/CorrectiveActionsList.tsx` | `correctiveActionService`, `AuthContext` |
| `EvidenceUploadModal` | `src/components/corrective/EvidenceUploadModal.tsx` | `correctiveActionService` |
| `GisFarmMap` | `src/components/gis/GisFarmMap.tsx` | `gisService` |
| `NotificationCenter` | `src/components/notifications/NotificationCenter.tsx` | `NotificationContext` → `notificationService` |

### 3.4 Context & Hooks

| Module | Path | Purpose |
|--------|------|---------|
| `AuthContext` | `src/context/AuthContext.tsx` | Role, active farm, farm list (mock) |
| `NotificationContext` | `src/context/NotificationContext.tsx` | Notifications, unread count, mark-as-read |
| `useSimulation` | `src/hooks/useSimulation.ts` | Subscribe to telemetry simulation snapshot |

### 3.5 Simulation Engine (Client-Side Demo)

| Module | Path | Purpose |
|--------|------|---------|
| `simulationState` | `src/simulation/simulationState.ts` | In-memory farm telemetry store |
| `simulationController` | `src/simulation/simulationController.ts` | Start/pause/reset/speed timer |
| `eventGenerator` | `src/simulation/eventGenerator.ts` | Random biosecurity events, risk deltas |
| `risk.ts` | `src/utils/risk.ts` | Score clamping, risk level thresholds |

---

## 4. Forms

### 4.1 Incident Report Form (`IncidentReportForm`)

| Field | Type | Required | Default (mock) | Backend Field |
|-------|------|----------|----------------|---------------|
| Incident Category | `<select>` | Yes | `"Sudden Mortality Increase"` | `incidentType` |
| Animal Species / Batch | `<select>` | Yes | Based on farm type | `animalType` |
| Number Affected | `<input number>` | Yes | `12` | `numberAffected` |
| Date & Time Observed | `<input datetime-local>` | Yes | Current datetime | `dateTime` |
| Farm Zone Location | `<input text>` | Yes | `"Shed 02 - Isolation Pen B"` | `location` |
| Symptoms & Observations | `<textarea>` | No | `""` (fallback text on submit) | `description` |
| Evidence File | `<input file>` | No | Pre-filled filename mock | Multipart upload → `evidenceFiles[]` |

**Auto-populated on submit (from context):** `farmId`, `farmName`, `farmType`

**Incident type options:**
- Sudden Mortality Increase
- Respiratory Distress Symptoms
- Feed or Water Contamination
- Perimeter Fencing / Bio-Barrier Breach
- Unverified Visitor Entry

**Animal type options:**
- Poultry (Broilers)
- Poultry (Layers)
- Swine / Pigs (Growers)
- Swine / Pigs (Breeding Stock)

### 4.2 Veterinary Verification Notes (`VetDashboard`)

| Field | Type | Required | Backend Field |
|-------|------|----------|---------------|
| Inspector Notes | `<textarea>` | No (recommended) | `notes` (passed to verify action) |

**Actions:** Validate (Verify) | Request More Info | Reject

### 4.3 Evidence Upload Form (`EvidenceUploadModal`)

| Field | Type | Required | Default (mock) | Backend Field |
|-------|------|----------|----------------|---------------|
| Evidence File | `<input file>` | Yes | `"gate_basin_refill_proof.jpg"` | Multipart → `file` |
| Compliance Notes | `<textarea>` | No | `""` | `notes` |
| Capture Timestamp | Read-only display | Auto | Client `Date.now()` | `timestamp` (server should also record) |
| GPS Geotag | Read-only display | Auto | Hardcoded Ranchi coords | `location` (from browser Geolocation API) |

### 4.4 Forms NOT Present in UI (Workflow Gaps)

These are implied by the problem statement but have **no dedicated frontend form** today:

| Workflow Step | Gap | Backend Still Required |
|---------------|-----|------------------------|
| Farm Registration | No registration wizard | Yes — farms exist in mock data only |
| Biosecurity Assessment | Scores shown in passport; no assessment questionnaire | Yes — scores must be computed/stored |
| Inspection Scheduling | Button exists, no form/modal | Yes — officer "Schedule Inspection" is UI-only |

---

## 5. Buttons & Actions

### 5.1 Navigation Actions

| Action | Location | Effect |
|--------|----------|--------|
| Tab navigation | Sidebar, MobileNav, bottom bar | Switches `activeTab` |
| Role switch | Navbar | Sets `role` in AuthContext (demo) |
| Farm selector | Navbar dropdown | Sets `activeFarm` |
| Open notifications | Navbar bell | Opens `NotificationCenter` drawer |
| Mobile menu toggle | Navbar hamburger | Opens mobile drawer |

### 5.2 Farmer Actions

| Action | Location | Current Behavior | Backend Needed |
|--------|----------|------------------|----------------|
| Report Incident | Dashboard, Sidebar, Mobile | Opens modal → `incidentService.submitIncident` | `POST /incidents` + file upload |
| View Passport | Dashboard, Sidebar, GIS | Opens modal → `passportService.getBiosecurityPassport` | `GET /farms/:id/passport` |
| Why did score change? | Farmer dashboard banner | Navigates to Risk tab | `GET /farms/:id/risk/*` |
| View Actions | Metrics card | Navigates to Actions tab | `GET /corrective-actions` |
| Toggle checklist item | Farmer dashboard | **Local state only** | `PATCH /farms/:id/checklist/:itemId` |
| Open Corrective Actions | Aarohi tip banner | Navigates to Actions tab | — |
| Upload Evidence | Corrective Actions table | Opens modal → `correctiveActionService.submitEvidence` | `POST /corrective-actions/:id/evidence` |

### 5.3 Veterinarian Actions

| Action | Location | Current Behavior | Backend Needed |
|--------|----------|------------------|----------------|
| Select incident | Vet queue list | Loads detail panel | `GET /incidents/:id` |
| Validate (Verify) | Vet workspace | `incidentService.verifyIncident("validate")` | `POST /incidents/:id/verify` |
| Request More Info | Vet workspace | `verifyIncident("request_info")` | Same endpoint, different action |
| Reject | Vet workspace | `verifyIncident("reject")` | Same endpoint, different action |
| Verify corrective action | Actions table | `correctiveActionService.verifyAction(true)` | `POST /corrective-actions/:id/verify` |
| Reject corrective action | Actions table | `verifyAction(false)` | Same endpoint |

### 5.4 Officer / Government Actions

| Action | Location | Current Behavior | Backend Needed |
|--------|----------|------------------|----------------|
| Open Regional GIS Map | Officer dashboard | Tab navigation | `GET /gis/nodes` |
| Schedule Inspection | Priority farms table | **No handler — UI only** | `POST /inspections` |
| View GIS farm details | GIS map marker click | Local state | Included in GIS nodes |
| View Passport (GIS) | GIS detail panel | Opens passport modal | `GET /farms/:id/passport` |

### 5.5 Simulation Actions (Demo / Presentation)

| Action | Location | Current Behavior | Production Backend |
|--------|----------|------------------|-------------------|
| Run / Pause / Reset | Simulation bar | Client `simulationController` | Replace with WebSocket/SSE telemetry OR hide bar |
| Speed 1×/2×/5× | Simulation bar | Client timer speed | N/A for production |

### 5.6 Notification Actions

| Action | Location | Current Behavior | Backend Needed |
|--------|----------|------------------|----------------|
| Mark as read | Notification card click | `notificationService.markAsRead` | `PATCH /notifications/:id/read` |
| Close drawer | X / backdrop | Local state | — |

---

## 6. Hardcoded Data

Data embedded directly in components (not fetched from `api.ts`):

| Location | Hardcoded Content |
|----------|-------------------|
| `FarmerDashboard` | Daily checklist items (5 items, local state); score trend "+4 points (7-day trend)" |
| `RiskDashboard` | 7-day risk history bar chart (Aug 05–Today, scores 72–78); risk level label "LOW RISK (SAFE)" |
| `VetDashboard` | Nearby regional context text (Ramgarh pig farm, 14km quarantine) |
| `OfficerDashboard` | Risk distribution percentages (77%/17%/6%) and farm counts in chart |
| `EvidenceUploadModal` | GPS: `"Lat: 23.3441° N, Long: 85.3096° E (Main Gate)"`; default filename |
| `IncidentReportForm` | Default `numberAffected: 12`, default location, pre-set filename |
| `GisFarmMap` | Containment buffer visual ("15km Containment Buffer"); lat/lng → CSS position formula |
| `Navbar` | Role labels; "Live Monitor" badge |
| `App.tsx` | Simulation bar copy ("Ranchi district") |

---

## 7. Simulated / Mock Data

### 7.1 Mock Data Store (`src/data/mockData.ts`)

| Export | Records | Used By |
|--------|---------|---------|
| `initialFarm` | 1 farm | AuthContext default, simulation, API fallback |
| `allFarmsMock` | 4 farms | AuthContext, `farmService.getAllFarms` |
| `initialPassport` | 1 passport | `passportService` |
| `initialIncidents` | 2 incidents | `incidentService` |
| `initialCorrectiveActions` | 3 actions | `correctiveActionService` |
| `initialRiskFactors` | 4 factors | `riskService` |
| `initialGisNodes` | 5 nodes (4 farms + 1 vet facility) | `gisService` |
| `initialOfficerStats` | 1 stats object | `officerService` |
| `initialNotifications` | 4 notifications | `notificationService` |
| `initialZones` | 8 zones | Simulation only |
| `initialEvents` | 3 events | Simulation only |
| `initialAlerts` | 2 alerts | Simulation only |
| `initialRiskHistory` | 4 points | Simulation only |
| `initialVisitors` | 1 visitor | Simulation only |
| `initialVehicles` | 1 vehicle | Simulation only |
| `initialBatches` | 3 batches | Simulation only |
| `initialChecklist` | 5 items | Simulation only |
| `initialRecommendations` | 2 items | Simulation only |

### 7.2 In-Memory API Simulation (`src/services/api.ts`)

- All services mutate module-level arrays/objects (`farmsData`, `incidentsData`, etc.)
- Artificial latency: 150–300ms via `delay()`
- Auto-generates IDs: `INC-2026-{random}`, `NOTIF-{timestamp}`
- Auto-assigns incident severity: `high` if `numberAffected > 20`, else `medium`
- Auto-creates notifications on incident submit, verify, evidence submit
- File uploads store `url: "#"` — no actual storage
- Passport for non-primary farms is **algorithmically generated** from farm score

### 7.3 Client Telemetry Simulation (`src/simulation/`)

Generates live events affecting:
- `farm.biosecurityScore`, `riskLevel`, `visitorsToday`, `vehiclesToday`, `complianceRate`, `vaccinationCoverage`, `activeIncidents`, `activeAlerts`
- Zone risk scores
- Events timeline (shown in FarmerDashboard)
- Aarohi advisor messages
- Alerts, visitors, vehicles, risk contributors, risk history

**Event types:** `visitor_entered`, `visitor_exited`, `vehicle_entered`, `vehicle_exited`, `disinfection_completed`, `disinfection_missed`, `health_incident`, `vaccination_recorded`, `animal_movement`, `inspection_completed`, `feed_delivery`, `restricted_zone_entry`, `sanitation_completed`

---

## 8. API Integration Points (Existing Service Layer)

All integration should target `src/services/api.ts`. Current service methods:

```typescript
// farmService
getFarm(farmId: string): Promise<Farm>
getAllFarms(): Promise<Farm[]>

// passportService
getBiosecurityPassport(farmId: string): Promise<BiosecurityPassport>

// incidentService
getIncidents(farmId?: string): Promise<IncidentReport[]>
submitIncident(payload): Promise<IncidentReport>
verifyIncident(incidentId, action, notes?): Promise<IncidentReport>

// correctiveActionService
getActions(farmId?: string): Promise<CorrectiveAction[]>
submitEvidence(actionId, evidence): Promise<CorrectiveAction>
verifyAction(actionId, approved: boolean): Promise<CorrectiveAction>

// riskService
getRiskFactors(): Promise<RiskFactor[]>

// gisService
getGisMapNodes(): Promise<GisMapNode[]>

// officerService
getOfficerStats(): Promise<OfficerStats>

// notificationService
getNotifications(role?: UserRole): Promise<NotificationItem[]>
markAsRead(id: string): Promise<void>
```

### Components → Service Call Map

| Component | Service Methods |
|-----------|----------------|
| `AuthContext` | *(currently mockData — needs auth + farm list API)* |
| `BiosecurityPassportModal` | `passportService.getBiosecurityPassport` |
| `IncidentReportForm` | `incidentService.submitIncident` |
| `VetDashboard` | `incidentService.getIncidents`, `verifyIncident` |
| `CorrectiveActionsList` | `correctiveActionService.getActions`, `verifyAction` |
| `EvidenceUploadModal` | `correctiveActionService.submitEvidence` |
| `RiskDashboard` | `riskService.getRiskFactors` |
| `OfficerDashboard` | `officerService.getOfficerStats`, `farmService.getAllFarms` |
| `GisFarmMap` | `gisService.getGisMapNodes` |
| `NotificationContext` | `notificationService.getNotifications`, `markAsRead` |
| `FarmerDashboard` | *(simulation snapshot — separate integration path)* |

---

## 9. Core Workflow Mapping

```
Farm Registration → Biosecurity Assessment → Risk Calculation → Incident Reporting
→ GIS/Spatial Risk Analysis → Veterinary Verification → Corrective Action Generation
→ Farmer Action Completion → Evidence Upload → Veterinary Verification
→ Compliance Closure → Risk Recalculation
```

| Workflow Step | Frontend Support | Backend Responsibility | Trigger |
|---------------|------------------|------------------------|---------|
| **Farm Registration** | Farm selector shows registered farms; no registration UI | Create farm record, assign owner, store coordinates | Admin/officer API (no UI yet) |
| **Biosecurity Assessment** | Passport displays component scores | Assessment questionnaire scoring engine | On registration + periodic reassessment |
| **Risk Calculation** | RiskDashboard factors; simulation live scoring; passport score | Risk engine: factors, history, spatial weighting | Continuous + on events |
| **Incident Reporting** | `IncidentReportForm` | Store incident, notify vet/officer, bump risk | Farmer submits form |
| **GIS/Spatial Risk Analysis** | `GisFarmMap` with filters | Geo queries, proximity risk, containment zones | Officer/vet views map |
| **Veterinary Verification** | `VetDashboard` | Validate/reject/request-info; audit trail | Vet action buttons |
| **Corrective Action Generation** | Actions appear in list (mock seeded) | Auto-generate from verified incidents + risk rules | Backend on incident verify / risk threshold |
| **Farmer Action Completion** | Checklist toggle (local only today) | Track checklist completion | Farmer updates |
| **Evidence Upload** | `EvidenceUploadModal` | File storage + metadata | Farmer submits evidence |
| **Veterinary Verification (evidence)** | Verify/Reject in Actions table | Approve/reject evidence | Vet/officer buttons |
| **Compliance Closure** | Action status → `Verified`/`Closed` | Close workflow, update passport compliance | Backend state machine |
| **Risk Recalculation** | Simulation + static chart | Recalculate farm/district scores | After each workflow transition |

---

## 10. Authentication & Authorization

### 10.1 Current State (Demo Mode)

- **No login screen**, no tokens, no sessions
- Role selected via Navbar toggle (`farmer` | `veterinarian` | `officer`)
- Farm selected via dropdown from `allFarmsMock`
- Any role can view any tab (sidebar hides `officer` tab for farmer only)

### 10.2 Required Authentication (Production)

| Requirement | Recommendation |
|-------------|----------------|
| **Auth method** | JWT (access + refresh) or session cookie |
| **Login** | Email/phone + password; optional OTP for farmers |
| **Token storage** | `httpOnly` cookie (preferred) or `Authorization: Bearer` header |
| **Role claim** | JWT payload: `{ sub, role, farmIds[], districtId? }` |
| **Farm scoping** | Farmers restricted to owned/assigned `farmId`(s) |
| **Vet scoping** | District/region-based incident + action access |
| **Officer scoping** | Regional read-all; write on inspections/compliance |

### 10.3 Suggested Auth Endpoints

See [Section 13.1](#131-authentication--users).

### 10.4 Frontend Auth Changes (Non-UI)

- Extend `AuthContext` with `user`, `token`, `login()`, `logout()`, `isAuthenticated`
- Replace Navbar role switcher with authenticated user role (keep switcher only in dev via env flag)
- Attach auth header in `api.ts` HTTP client
- Redirect unauthenticated users (new route or modal — minimal addition)

---

## 11. User Roles & Access Matrix

Roles defined in `src/types/index.ts`: `"farmer" | "veterinarian" | "officer"`

| Resource / Action | Farmer | Veterinarian | Officer |
|-------------------|--------|--------------|---------|
| View own farm dashboard | ✅ | — | — |
| View regional dashboard | — | Partial | ✅ |
| View biosecurity passport | ✅ (own) | ✅ (assigned) | ✅ (all) |
| Submit incident | ✅ (own farm) | — | — |
| Verify incident | — | ✅ | — |
| View corrective actions | ✅ (own) | ✅ (district) | ✅ (region) |
| Upload evidence | ✅ (own actions) | — | — |
| Verify evidence/actions | — | ✅ | ✅ |
| View risk analytics | ✅ (own) | ✅ | ✅ |
| View GIS map | ✅ | ✅ | ✅ |
| Schedule inspection | — | ✅ | ✅ |
| View notifications | ✅ (filtered) | ✅ (filtered) | ✅ (filtered) |
| Simulation controls | ✅ (demo) | ✅ (demo) | ✅ (demo) |

---

## 12. Database Entities & Relationships

### 12.1 Entity-Relationship Overview

```
User ─────────────┬──────────── Farm (owner/manager)
                  │
                  ├──────────── Inspection (inspector → farm)
                  │
Veterinarian ───────┼──────────── IncidentVerification
                  │
Officer ──────────┘

Farm ──┬── Zone ──── FarmEvent (telemetry)
       ├── AnimalBatch
       ├── BiosecurityPassport (1:1 current snapshot)
       ├── BiosecurityAssessment (1:N history)
       ├── RiskScoreHistory (1:N)
       ├── RiskFactor (1:N active)
       ├── DailyChecklist / ChecklistItem (1:N)
       ├── Incident (1:N)
       ├── CorrectiveAction (1:N)
       └── Alert (1:N)

Incident ──┬── EvidenceFile (1:N)
           ├── IncidentVerification (1:N audit)
           └── CorrectiveAction (auto-generated, 0:N)

CorrectiveAction ──┬── ActionEvidence (0:1)
                   └── ActionVerification (0:N audit)

Notification ──── User (target)
GISNode ───────── Farm | VetFacility (view/projection)
OfficerStats ──── Materialized aggregate (district)
SpatialZone ───── ContainmentBuffer (GIS overlay)
```

### 12.2 Entity Definitions

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | VARCHAR | Unique |
| phone | VARCHAR | Optional |
| password_hash | VARCHAR | |
| full_name | VARCHAR | |
| role | ENUM | `farmer`, `veterinarian`, `officer` |
| district_id | UUID | FK → districts |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `farms`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR | e.g. `FARM-JH-2026-0487` |
| name | VARCHAR | |
| owner_id | UUID | FK → users |
| owner_name | VARCHAR | Denormalized display |
| location | TEXT | Address / block |
| farm_type | ENUM | `poultry`, `pig`, `mixed` |
| capacity | INTEGER | |
| animal_count | INTEGER | |
| latitude | DECIMAL | |
| longitude | DECIMAL | |
| biosecurity_score | INTEGER | 0–100 |
| previous_score | INTEGER | |
| risk_level | ENUM | `safe`, `caution`, `critical` |
| compliance_rate | DECIMAL | |
| vaccination_coverage | DECIMAL | |
| active_incidents | INTEGER | Denormalized count |
| active_alerts | INTEGER | Denormalized count |
| registration_status | ENUM | `pending`, `registered`, `suspended` |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `zones`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR | PK |
| farm_id | VARCHAR | FK |
| name | VARCHAR | |
| type | ENUM | See `ZoneType` in types |
| risk_score | INTEGER | |
| risk_level | ENUM | |
| compliance_rate | DECIMAL | |
| animal_count | INTEGER | Nullable |
| notes | TEXT | Nullable |
| last_inspection | TIMESTAMPTZ | Nullable |

#### `biosecurity_passports`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| farm_id | VARCHAR | FK, unique active |
| hygiene_score | INTEGER | |
| visitor_control_score | INTEGER | |
| quarantine_protocol_score | INTEGER | |
| waste_management_score | INTEGER | |
| compliance_status | ENUM | `Compliant`, `Attention Required`, `Non-Compliant` |
| risk_trend | ENUM | `improving`, `stable`, `deteriorating` |
| passport_qr_code | VARCHAR | |
| issue_date | DATE | |
| last_inspection_date | DATE | |

#### `inspections`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR | e.g. `INSP-2026-08` |
| farm_id | VARCHAR | FK |
| inspector_id | UUID | FK → users |
| inspector_name | VARCHAR | |
| date | DATE | |
| result | ENUM | `Passed`, `Conditional Pass`, `Needs Improvement` |
| notes | TEXT | |
| scheduled_at | TIMESTAMPTZ | Nullable |
| status | ENUM | `scheduled`, `completed`, `cancelled` |

#### `incidents`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR | e.g. `INC-2026-881` |
| farm_id | VARCHAR | FK |
| incident_type | VARCHAR | |
| animal_type | VARCHAR | |
| number_affected | INTEGER | |
| observed_at | TIMESTAMPTZ | |
| description | TEXT | |
| location | VARCHAR | Zone within farm |
| status | ENUM | See `IncidentStatus` |
| severity | ENUM | `low`, `medium`, `high`, `critical` |
| veterinarian_notes | TEXT | Nullable |
| requested_info_notes | TEXT | Nullable |
| verified_at | TIMESTAMPTZ | Nullable |
| verified_by | UUID | FK → users |
| reported_by | UUID | FK → users |
| created_at | TIMESTAMPTZ | |

#### `incident_evidence_files`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| incident_id | VARCHAR | FK |
| file_name | VARCHAR | |
| file_url | VARCHAR | S3/storage URL |
| uploaded_at | TIMESTAMPTZ | |

#### `corrective_actions`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR | e.g. `ACT-2026-101` |
| farm_id | VARCHAR | FK |
| incident_id | VARCHAR | FK, nullable |
| title | VARCHAR | |
| description | TEXT | |
| priority | ENUM | `low`, `medium`, `high`, `urgent` |
| assigned_person | VARCHAR | |
| assigned_user_id | UUID | Nullable FK |
| deadline | DATE | |
| status | ENUM | See `CorrectiveActionStatus` |
| evidence_required | BOOLEAN | |
| verification_status | ENUM | `Unverified`, `Verification Pending`, `Verified` |
| created_at | TIMESTAMPTZ | |

#### `action_evidence`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| action_id | VARCHAR | FK |
| file_url | VARCHAR | |
| file_name | VARCHAR | |
| notes | TEXT | |
| location | VARCHAR | GPS string |
| captured_at | TIMESTAMPTZ | |
| submitted_at | TIMESTAMPTZ | |

#### `risk_factors`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR | PK |
| farm_id | VARCHAR | FK |
| label | VARCHAR | |
| delta | INTEGER | Score impact |
| category | ENUM | `incident`, `mortality`, `sanitation`, `visitor`, `environment` |
| description | TEXT | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

#### `risk_score_history`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| farm_id | VARCHAR | FK |
| score | INTEGER | |
| recorded_at | TIMESTAMPTZ | |

#### `farm_events` (telemetry)
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR | PK |
| farm_id | VARCHAR | FK |
| zone_id | VARCHAR | FK |
| event_type | ENUM | See `EventType` |
| title | VARCHAR | |
| description | TEXT | |
| status | ENUM | `ok`, `warning`, `critical` |
| risk_delta | INTEGER | |
| occurred_at | TIMESTAMPTZ | |

#### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR | PK |
| user_id | UUID | FK, nullable (broadcast by role) |
| target_role | ENUM | `farmer`, `veterinarian`, `officer`, `all` |
| title | VARCHAR | |
| message | TEXT | |
| type | ENUM | See `NotificationItem.type` |
| read | BOOLEAN | |
| action_url | VARCHAR | Nullable |
| created_at | TIMESTAMPTZ | |

#### `visitors` / `vehicles` / `animal_batches`
Supporting telemetry entities matching `Visitor`, `Vehicle`, `AnimalBatch` types in frontend.

#### `spatial_zones` (GIS)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR | |
| center_lat | DECIMAL | |
| center_lng | DECIMAL | |
| radius_km | DECIMAL | |
| zone_type | ENUM | `containment`, `quarantine`, `surveillance` |
| related_farm_id | VARCHAR | Nullable FK |
| active | BOOLEAN | |

---

## 13. API Endpoint Specification

**Base URL:** `{VITE_API_BASE_URL}/api/v1`  
**Content-Type:** `application/json` (unless multipart noted)  
**Auth header:** `Authorization: Bearer {access_token}`

### 13.1 Authentication & Users

#### `POST /auth/login`
**Auth:** Public

**Request:**
```json
{
  "email": "rajesh.kumar@example.com",
  "password": "securePassword123"
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 3600,
  "user": {
    "id": "usr-uuid-001",
    "fullName": "Rajesh Kumar",
    "email": "rajesh.kumar@example.com",
    "role": "farmer",
    "farmIds": ["FARM-JH-2026-0487"],
    "districtId": "district-ranchi"
  }
}
```

#### `POST /auth/refresh`
**Request:** `{ "refreshToken": "..." }`  
**Response `200`:** `{ "accessToken": "...", "expiresIn": 3600 }`

#### `POST /auth/logout`
**Auth:** Required — invalidates refresh token.

#### `GET /auth/me`
**Response `200`:** Same `user` object as login.

---

### 13.2 Farms

#### `GET /farms`
**Roles:** `veterinarian`, `officer` (all in district/region); `farmer` (own only)

**Query params:** `?districtId=&riskLevel=&farmType=&page=&limit=`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "FARM-JH-2026-0487",
      "name": "GreenValley Bio-Farm #04",
      "location": "Ranchi District, Jharkhand",
      "owner": "Rajesh Kumar",
      "farmType": "poultry",
      "capacity": 3500,
      "animalCount": 2850,
      "biosecurityScore": 78,
      "previousScore": 74,
      "riskLevel": "safe",
      "visitorsToday": 8,
      "vehiclesToday": 4,
      "complianceRate": 88,
      "vaccinationCoverage": 94,
      "activeIncidents": 1,
      "activeAlerts": 2,
      "updatedAt": "2026-08-11T06:59:00.000Z",
      "coordinates": { "lat": 23.3441, "lng": 85.3096 }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 142 }
}
```

*Matches frontend `Farm` interface exactly.*

#### `GET /farms/:farmId`
**Roles:** Scoped access  
**Response `200`:** Single `Farm` object.

#### `POST /farms` *(Registration — no UI yet)*
**Roles:** `officer`, `farmer` (self-registration if enabled)

**Request:**
```json
{
  "name": "GreenValley Bio-Farm #04",
  "location": "Block B, Sector 4, Ranchi District, JH",
  "farmType": "poultry",
  "capacity": 3500,
  "animalCount": 2850,
  "coordinates": { "lat": 23.3441, "lng": 85.3096 },
  "ownerName": "Rajesh Kumar",
  "ownerEmail": "rajesh.kumar@example.com",
  "ownerPhone": "+919876543210"
}
```

**Response `201`:** Created `Farm` + triggers biosecurity assessment job.

#### `PATCH /farms/:farmId`
**Roles:** `officer`, farm owner  
**Request:** Partial `Farm` fields (capacity, animalCount, etc.)

---

### 13.3 Biosecurity Passport & Assessment

#### `GET /farms/:farmId/passport`
**Used by:** `passportService.getBiosecurityPassport`

**Response `200`:**
```json
{
  "farmId": "FARM-JH-2026-0487",
  "farmName": "GreenValley Bio-Farm #04",
  "farmType": "poultry",
  "ownerName": "Rajesh Kumar",
  "location": "Block B, Sector 4, Ranchi District, JH",
  "capacity": 3500,
  "animalCount": 2850,
  "biosecurityScore": 78,
  "hygieneScore": 84,
  "visitorControlScore": 79,
  "quarantineProtocolScore": 85,
  "vaccinationCoverage": 94,
  "wasteManagementScore": 70,
  "lastInspectionDate": "2026-08-01",
  "inspectionHistory": [
    {
      "id": "INSP-2026-08",
      "date": "2026-08-01",
      "inspectorName": "Dr. A. K. Sharma (District Vet Officer)",
      "result": "Passed",
      "notes": "Shed sanitation and perimeter fencing fully compliant."
    }
  ],
  "complianceStatus": "Compliant",
  "riskTrend": "improving",
  "passportQrCode": "BS-PASSPORT-JH26-0487-VERIFIED",
  "issueDate": "2026-01-15"
}
```

*Matches frontend `BiosecurityPassport` interface exactly.*

#### `POST /farms/:farmId/assessments` *(Biosecurity Assessment — backend-only trigger for now)*
**Request:**
```json
{
  "responses": [
    { "questionId": "Q001", "answer": "yes", "score": 10 },
    { "questionId": "Q002", "answer": "partial", "score": 5 }
  ],
  "assessedBy": "usr-uuid-vet-001"
}
```

**Response `201`:**
```json
{
  "assessmentId": "ASSESS-2026-001",
  "farmId": "FARM-JH-2026-0487",
  "overallScore": 78,
  "componentScores": {
    "hygiene": 84,
    "visitorControl": 79,
    "quarantineProtocol": 85,
    "wasteManagement": 70
  },
  "passportUpdated": true
}
```

---

### 13.4 Incidents

#### `GET /incidents`
**Used by:** `incidentService.getIncidents(farmId?)`

**Query:** `?farmId=FARM-JH-2026-0487&status=&severity=`

**Roles:** Farmer (own farm); Vet/Officer (district)

**Response `200`:**
```json
{
  "data": [
    {
      "id": "INC-2026-881",
      "farmId": "FARM-JH-2026-0102",
      "farmName": "Apex Swine Breeding Center",
      "farmType": "pig",
      "incidentType": "Sudden High Mortality",
      "animalType": "Pig (Growers)",
      "numberAffected": 18,
      "dateTime": "2026-08-10T14:30:00.000Z",
      "description": "Sudden high fever and respiratory distress...",
      "location": "Shed 02 - Isolation Ward",
      "evidenceFiles": [
        {
          "name": "lesions_obs_01.jpeg",
          "url": "https://storage.example.com/evidence/abc.jpeg",
          "timestamp": "2026-08-10T14:35:00.000Z"
        }
      ],
      "status": "Under Review",
      "severity": "critical",
      "veterinarianNotes": "Awaiting swab laboratory report.",
      "requestedInfoNotes": null,
      "verifiedAt": null,
      "verifiedBy": null
    }
  ]
}
```

*Matches frontend `IncidentReport` interface.*

#### `GET /incidents/:incidentId`
**Response `200`:** Single `IncidentReport`.

#### `POST /incidents`
**Used by:** `incidentService.submitIncident`  
**Content-Type:** `multipart/form-data` (if files) OR JSON + separate upload

**JSON Request (without files):**
```json
{
  "farmId": "FARM-JH-2026-0487",
  "incidentType": "Sudden Mortality Increase",
  "animalType": "Poultry (Broilers)",
  "numberAffected": 12,
  "dateTime": "2026-08-11T08:15:00.000Z",
  "description": "Observed health anomaly requiring veterinary inspection.",
  "location": "Shed 02 - Isolation Pen B"
}
```

**Response `201`:**
```json
{
  "id": "INC-2026-882",
  "farmId": "FARM-JH-2026-0487",
  "farmName": "GreenValley Bio-Farm #04",
  "farmType": "poultry",
  "incidentType": "Sudden Mortality Increase",
  "animalType": "Poultry (Broilers)",
  "numberAffected": 12,
  "dateTime": "2026-08-11T08:15:00.000Z",
  "description": "Observed health anomaly...",
  "location": "Shed 02 - Isolation Pen B",
  "evidenceFiles": [],
  "status": "Reported",
  "severity": "medium"
}
```

**Backend side-effects:**
1. Notify veterinarians (`targetRole: "veterinarian"`)
2. Notify officers if severity ≥ `high`
3. Recalculate farm risk score
4. Optionally auto-create corrective action draft

#### `POST /incidents/:incidentId/evidence`
**Content-Type:** `multipart/form-data`  
**Body:** `files[]`  
**Response `201`:** Updated `evidenceFiles` array.

#### `POST /incidents/:incidentId/verify`
**Used by:** `incidentService.verifyIncident(incidentId, action, notes)`

**Request:**
```json
{
  "action": "validate",
  "notes": "Verified by certified District Veterinary Officer. Quarantine boundary activated."
}
```

`action` enum: `"validate"` | `"request_info"` | `"reject"`

**Response `200`:**
```json
{
  "id": "INC-2026-881",
  "status": "Verified",
  "veterinarianNotes": "Verified by certified District Veterinary Officer.",
  "verifiedAt": "2026-08-11T07:30:00.000Z",
  "verifiedBy": "Dr. A. K. Sharma (Vet Officer)"
}
```

**Status mapping:**
| action | Resulting status |
|--------|------------------|
| `validate` | `Verified` |
| `request_info` | `More Info Required` |
| `reject` | `Rejected` |

**Backend side-effects on `validate`:**
- Generate corrective actions
- Update risk factors
- Notify farmer
- Update GIS spatial risk if applicable

---

### 13.5 Corrective Actions

#### `GET /corrective-actions`
**Used by:** `correctiveActionService.getActions(farmId?)`

**Query:** `?farmId=&status=&priority=`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "ACT-2026-101",
      "farmId": "FARM-JH-2026-0487",
      "farmName": "GreenValley Bio-Farm #04",
      "title": "Sanitize & Decontaminate Shed 02 Buffer Area",
      "description": "Apply recommended chemical disinfectant solution...",
      "priority": "high",
      "assignedPerson": "Rajesh Kumar (Farm Manager)",
      "deadline": "2026-08-12",
      "status": "In Progress",
      "evidenceRequired": true,
      "verificationStatus": "Unverified",
      "submittedEvidence": null
    }
  ]
}
```

*Matches frontend `CorrectiveAction` interface.*

#### `POST /corrective-actions` *(Auto-generated — optional manual create)*
**Roles:** `veterinarian`, `officer`, system

**Request:**
```json
{
  "farmId": "FARM-JH-2026-0487",
  "incidentId": "INC-2026-881",
  "title": "Enforce Strict Perimeter Isolation Zone",
  "description": "Install bio-secure barrier netting...",
  "priority": "urgent",
  "assignedPerson": "Rajesh Kumar",
  "deadline": "2026-08-12",
  "evidenceRequired": true
}
```

#### `POST /corrective-actions/:actionId/evidence`
**Used by:** `correctiveActionService.submitEvidence`  
**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Type |
|-------|------|
| file | File |
| notes | string |
| location | string (GPS) |
| timestamp | string (ISO — server validates) |

**Response `200`:**
```json
{
  "id": "ACT-2026-104",
  "status": "Evidence Submitted",
  "verificationStatus": "Verification Pending",
  "submittedEvidence": {
    "fileUrl": "https://storage.example.com/evidence/gate_basin_refill.jpg",
    "fileName": "gate_basin_refill.jpg",
    "timestamp": "2026-08-11T09:45:00.000Z",
    "location": "Lat: 23.3441° N, Long: 85.3096° E",
    "notes": "Basin cleaned and refilled with 2% Virkon solution."
  }
}
```

#### `POST /corrective-actions/:actionId/verify`
**Used by:** `correctiveActionService.verifyAction(actionId, approved)`

**Request:**
```json
{
  "approved": true,
  "notes": "Evidence verified. Disinfection protocol compliant."
}
```

**Response `200`:**
```json
{
  "id": "ACT-2026-104",
  "status": "Verified",
  "verificationStatus": "Verified"
}
```

If `approved: false` → `status: "In Progress"`, `verificationStatus: "Unverified"`

**Backend side-effects on approve:**
- Check if all farm actions closed → update passport compliance
- Trigger risk recalculation
- Notify farmer

#### `PATCH /corrective-actions/:actionId/status`
**Roles:** `farmer` (mark In Progress)

**Request:** `{ "status": "In Progress" }`

---

### 13.6 Risk Analytics

#### `GET /farms/:farmId/risk/factors`
**Used by:** `riskService.getRiskFactors` (currently not farm-scoped — **backend should scope by farm**)

**Response `200`:**
```json
{
  "data": [
    {
      "id": "rf-1",
      "label": "Nearby incident confirmed in Ramgarh sector",
      "delta": 18,
      "category": "incident",
      "description": "Swine respiratory outbreak within 15km perimeter."
    }
  ]
}
```

*Matches frontend `RiskFactor` interface.*

#### `GET /farms/:farmId/risk/history`
**Query:** `?period=7d|30d|90d`

**Response `200`:**
```json
{
  "data": [
    { "time": "2026-08-05T00:00:00.000Z", "score": 72 },
    { "time": "2026-08-11T06:59:00.000Z", "score": 78 }
  ]
}
```

*Matches frontend `RiskHistoryPoint` — replaces hardcoded chart in `RiskDashboard`.*

#### `GET /farms/:farmId/risk/summary`
**Response `200`:**
```json
{
  "farmId": "FARM-JH-2026-0487",
  "biosecurityScore": 78,
  "previousScore": 74,
  "riskLevel": "safe",
  "scoreDelta7d": 4,
  "riskTrend": "improving"
}
```

#### `POST /farms/:farmId/risk/recalculate`
**Roles:** System/internal or officer trigger  
**Response `200`:** Updated risk summary + new factors.

---

### 13.7 GIS & Spatial Analysis

#### `GET /gis/nodes`
**Used by:** `gisService.getGisMapNodes`

**Query:** `?farmType=&riskLevel=&districtId=`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "FARM-JH-2026-0487",
      "name": "GreenValley Bio-Farm #04",
      "farmType": "poultry",
      "riskLevel": "safe",
      "score": 78,
      "lat": 23.3441,
      "lng": 85.3096,
      "activeIncidents": 1,
      "owner": "Rajesh Kumar",
      "contact": "+91 98765 43210",
      "lastInspection": "2026-08-01"
    },
    {
      "id": "VET-FAC-01",
      "name": "District Veterinary Diagnostic Lab",
      "farmType": "mixed",
      "riskLevel": "safe",
      "score": 100,
      "lat": 23.36,
      "lng": 85.33,
      "activeIncidents": 0,
      "owner": "Govt of Jharkhand Animal Husbandry Dept",
      "contact": "+91 651 2234567",
      "lastInspection": "N/A"
    }
  ]
}
```

*Matches frontend `GisMapNode` interface.*

#### `GET /gis/spatial-risk`
**Query:** `?farmId=FARM-JH-2026-0487&radiusKm=15`

**Response `200`:**
```json
{
  "centerFarmId": "FARM-JH-2026-0487",
  "radiusKm": 15,
  "nearbyIncidents": 1,
  "nearbyHighRiskFarms": 1,
  "containmentZones": [
    {
      "id": "cz-001",
      "centerLat": 23.63,
      "centerLng": 85.51,
      "radiusKm": 15,
      "reason": "Swine respiratory outbreak — Apex Swine Breeding Center",
      "active": true
    }
  ],
  "regionalContext": "1 pig breeding farm (Ramgarh sector, 14km away) currently under high bio-security quarantine."
}
```

*Feeds hardcoded VetDashboard nearby context box.*

#### `GET /gis/nodes/:nodeId/proximity`
Returns farms/incidents within configurable radius for map overlays.

---

### 13.8 Officer Dashboard

#### `GET /officer/stats`
**Used by:** `officerService.getOfficerStats`

**Query:** `?districtId=district-ranchi`

**Response `200`:**
```json
{
  "totalRegisteredFarms": 142,
  "highRiskFarms": 8,
  "mediumRiskFarms": 24,
  "lowRiskFarms": 110,
  "openIncidents": 5,
  "pendingVerifications": 3,
  "pendingInspections": 7,
  "openCorrectiveActions": 12
}
```

*Matches frontend `OfficerStats` interface exactly.*

#### `GET /officer/inspection-priority`
**Response `200`:** Risk-ranked farm list (same as `GET /farms` sorted by score ASC).

---

### 13.9 Inspections

#### `POST /inspections`
**Used by:** OfficerDashboard "Schedule Inspection" button (UI hook needed)

**Request:**
```json
{
  "farmId": "FARM-JH-2026-0102",
  "scheduledAt": "2026-08-14T10:00:00.000Z",
  "inspectorId": "usr-uuid-vet-001",
  "notes": "High-risk priority audit — swine farm"
}
```

**Response `201`:**
```json
{
  "id": "INSP-2026-09",
  "farmId": "FARM-JH-2026-0102",
  "status": "scheduled",
  "scheduledAt": "2026-08-14T10:00:00.000Z"
}
```

#### `GET /inspections`
**Query:** `?farmId=&status=&inspectorId=`

#### `PATCH /inspections/:inspectionId`
**Request:** Complete inspection with result + notes (updates passport history).

---

### 13.10 Notifications

#### `GET /notifications`
**Used by:** `notificationService.getNotifications(role?)`

**Query:** `?role=farmer&unreadOnly=true`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "NOTIF-001",
      "title": "New Incident Reported",
      "message": "High mortality reported at Apex Swine Breeding Center (Ramgarh).",
      "timestamp": "2026-08-11T06:49:00.000Z",
      "type": "incident",
      "read": false,
      "targetRole": "all",
      "actionUrl": "/incidents/INC-2026-881"
    }
  ]
}
```

*Note: Frontend currently uses human-readable timestamps like "10 mins ago" — backend should return ISO `timestamp`; frontend can format.*

#### `PATCH /notifications/:id/read`
**Used by:** `notificationService.markAsRead`

**Response `204`:** No content.

#### `PATCH /notifications/read-all`
**Response `204`.**

---

### 13.11 Farm Telemetry (Replaces Simulation)

#### `GET /farms/:farmId/telemetry/snapshot`
**Response `200`:** Full `SimulationSnapshot` shape (minus `isRunning`, `speed`, `tickCount`):

```json
{
  "farm": { },
  "zones": [ ],
  "events": [ ],
  "alerts": [ ],
  "riskHistory": [ ],
  "riskContributors": [ ],
  "visitors": [ ],
  "vehicles": [ ],
  "batches": [ ],
  "checklist": [ ],
  "recommendations": [ ],
  "aarohi": {
    "mood": "happy",
    "message": "Good morning! Your farm is safe today."
  }
}
```

#### `GET /farms/:farmId/events`
**Query:** `?limit=40&since=`

#### `WebSocket /ws/farms/:farmId/telemetry`
Push real-time `FarmEvent` objects to replace simulation engine in production.

**Message example:**
```json
{
  "type": "farm_event",
  "payload": {
    "id": "evt-1042",
    "type": "disinfection_completed",
    "time": "2026-08-11T07:00:00.000Z",
    "zoneId": "disinfection",
    "zoneName": "Disinfection Bay",
    "title": "Disinfection completed",
    "description": "Vehicle bay disinfected with certified QAC spray.",
    "status": "ok",
    "riskDelta": -3
  }
}
```

---

### 13.12 Checklist

#### `GET /farms/:farmId/checklist`
**Response `200`:**
```json
{
  "data": [
    {
      "id": "check-1",
      "title": "Entry gate vehicle dip disinfected",
      "completed": true,
      "priority": "normal"
    }
  ]
}
```

#### `PATCH /farms/:farmId/checklist/:itemId`
**Request:** `{ "completed": true }`  
**Response `200`:** Updated checklist item.

---

### 13.13 File Storage

#### `POST /files/upload`
**Content-Type:** `multipart/form-data`

**Response `201`:**
```json
{
  "fileId": "file-uuid",
  "fileName": "mortality_obs_sample.jpg",
  "url": "https://storage.example.com/bioshield/file-uuid.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 245678,
  "uploadedAt": "2026-08-11T07:00:00.000Z"
}
```

---

## 14. Additional Endpoints (UI Gaps / Future Hooks)

| Endpoint | Purpose | UI Status |
|----------|---------|-----------|
| `POST /farms/register` | Self-service farm registration | No form — needed for workflow step 1 |
| `GET /assessments/questions` | Biosecurity questionnaire | No form — scores shown in passport |
| `POST /farms/:id/assessments` | Submit assessment | Backend-only for now |
| `GET /incidents/:id/nearby-context` | Spatial context for vet panel | Hardcoded in VetDashboard |
| `POST /inspections` | Schedule inspection | Button exists, no handler |
| `GET /farms/:id/risk/history` | 7-day chart | Hardcoded bars in RiskDashboard |
| `GET /advisor/aarohi` | AI advisor messages | Simulation-generated today |
| `POST /auth/register` | User registration | No UI |

---

## 15. Required Frontend Changes (Non-UI)

> **Constraint:** Do not redesign UI, replace components, or break existing behavior during initial integration.

### 15.1 Phase 1 — Swap Service Layer Only

**File:** `src/services/api.ts`

1. Add HTTP client wrapper:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("accessToken"); // or cookie-based
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

2. Replace each mock service method with real HTTP calls matching schemas above.
3. Keep the **same exported function signatures** so components require zero changes.
4. Handle `{ data: [...] }` wrapper vs raw array — normalize in service layer.

### 15.2 Phase 2 — Auth Context

**File:** `src/context/AuthContext.tsx`

- Fetch `GET /auth/me` on mount
- Load farms via `GET /farms` instead of `allFarmsMock`
- Gate `VITE_ENABLE_DEMO_ROLE_SWITCHER=true` for Navbar role toggle in development

### 15.3 Phase 3 — File Uploads

**Files:** `IncidentReportForm.tsx`, `EvidenceUploadModal.tsx`

- Change submit handlers to use `FormData` + `multipart/form-data`
- **Do not change form layout** — only submission logic
- Use browser `navigator.geolocation.getCurrentPosition` for real GPS in evidence modal

### 15.4 Phase 4 — Replace Hardcoded Data Feeds

| File | Change |
|------|--------|
| `RiskDashboard.tsx` | Fetch `GET /farms/:id/risk/history` — same chart component, dynamic data |
| `VetDashboard.tsx` | Fetch `GET /gis/spatial-risk?farmId=` for nearby context |
| `OfficerDashboard.tsx` | Derive distribution bars from `OfficerStats` (already fetched) |
| `FarmerDashboard.tsx` | Fetch `GET /farms/:id/checklist` instead of local hardcoded checklist |
| `EvidenceUploadModal.tsx` | Real geolocation + upload via multipart |

### 15.5 Phase 5 — Telemetry

**Option A (Production):** WebSocket subscription replaces simulation for live events.  
**Option B (Demo):** Keep simulation bar when `VITE_DEMO_MODE=true`.

**File:** `src/hooks/useSimulation.ts` — add backend polling/WebSocket path alongside existing simulation.

### 15.6 Phase 6 — Officer Inspection Button

**File:** `OfficerDashboard.tsx` — wire `Schedule Inspection` to `POST /inspections` (minimal: `onClick` handler + confirm toast; no new page).

### 15.7 Types

**File:** `src/types/index.ts`

Optional additions (backward-compatible):
```typescript
export interface ApiResponse<T> {
  data: T;
  pagination?: { page: number; limit: number; total: number };
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  farmIds: string[];
  districtId?: string;
}
```

---

## 16. Environment Variables

### Frontend (`.env` / Vite)

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `VITE_API_BASE_URL` | Yes | `http://localhost:8080` | Backend base URL |
| `VITE_WS_URL` | Optional | `ws://localhost:8080/ws` | Real-time telemetry |
| `VITE_ENABLE_DEMO_ROLE_SWITCHER` | Optional | `true` | Show Navbar role toggle in dev |
| `VITE_DEMO_MODE` | Optional | `true` | Show simulation control bar |
| `VITE_FILE_UPLOAD_MAX_MB` | Optional | `10` | Client-side upload validation |
| `VITE_GEOLOCATION_ENABLED` | Optional | `true` | Enable GPS capture in evidence form |

### Backend (for reference — your implementation)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET` | Token signing |
| `JWT_ACCESS_EXPIRY` | e.g. `3600` |
| `JWT_REFRESH_EXPIRY` | e.g. `604800` |
| `S3_BUCKET` / `AZURE_STORAGE_CONTAINER` | Evidence file storage |
| `STORAGE_BASE_URL` | Public file URLs |
| `CORS_ORIGIN` | Frontend origin (Vite dev: `http://localhost:5173`) |
| `REDIS_URL` | Optional — pub/sub for WebSocket notifications |
| `RISK_ENGINE_URL` | Optional — external ML risk service |
| `GIS_POSTGIS_ENABLED` | Spatial queries |
| `DEFAULT_DISTRICT_ID` | Seed/demo config |

---

## 17. Integration Phases

| Phase | Scope | Frontend Impact | Backend Deliverables |
|-------|-------|-----------------|---------------------|
| **P0** | Auth + Farms | AuthContext, api.ts | Login, JWT, GET /farms, GET /farms/:id |
| **P1** | Incidents | api.ts (already wired) | CRUD incidents, verify, file upload |
| **P2** | Corrective Actions | api.ts (already wired) | Actions CRUD, evidence, verify |
| **P3** | Passport + Risk | api.ts + RiskDashboard data | Passport, risk factors, history |
| **P4** | Officer + GIS | api.ts | Stats, GIS nodes, spatial risk |
| **P5** | Notifications | api.ts (already wired) | Notification CRUD, push on events |
| **P6** | Telemetry | useSimulation hook | Events API + WebSocket |
| **P7** | Registration + Assessment | New minimal hooks only | Farm register, assessment engine |
| **P8** | Inspections | OfficerDashboard onClick | Inspection scheduling API |

---

## 18. File Reference Index

| Path | Role |
|------|------|
| `src/App.tsx` | Main shell, tab routing, simulation bar |
| `src/types/index.ts` | **Canonical API contracts** |
| `src/services/api.ts` | **Primary integration target** |
| `src/data/mockData.ts` | Mock seed data (keep for offline dev) |
| `src/context/AuthContext.tsx` | Auth + farm context |
| `src/context/NotificationContext.tsx` | Notification state |
| `src/simulation/*` | Client telemetry demo |
| `src/components/farmer/FarmerDashboard.tsx` | Farmer home |
| `src/components/vet/VetDashboard.tsx` | Incident verification |
| `src/components/officer/OfficerDashboard.tsx` | Regional command |
| `src/components/risk/RiskDashboard.tsx` | Risk analytics |
| `src/components/incident/IncidentReportForm.tsx` | Incident submission |
| `src/components/corrective/CorrectiveActionsList.tsx` | Action tracking |
| `src/components/corrective/EvidenceUploadModal.tsx` | Evidence upload |
| `src/components/farmer/BiosecurityPassportModal.tsx` | Passport view |
| `src/components/gis/GisFarmMap.tsx` | GIS map |
| `src/components/notifications/NotificationCenter.tsx` | Notifications |
| `src/components/common/Navbar.tsx` | Role + farm selector |
| `src/components/common/Sidebar.tsx` | Navigation |
| `src/components/common/MobileNav.tsx` | Mobile navigation |

---

## Appendix A — Standard Error Response

All endpoints should return consistent errors:

```json
{
  "error": {
    "code": "INCIDENT_NOT_FOUND",
    "message": "Incident INC-2026-999 was not found.",
    "status": 404
  }
}
```

| HTTP Status | Usage |
|-------------|-------|
| 400 | Validation error |
| 401 | Missing/invalid token |
| 403 | Role forbidden |
| 404 | Resource not found |
| 409 | State conflict (e.g. verify already-closed incident) |
| 422 | Business rule violation |
| 500 | Server error |

---

## Appendix B — ID Generation Conventions (Match Frontend Mock Patterns)

| Entity | Pattern | Example |
|--------|---------|---------|
| Farm | `FARM-{STATE}-{YEAR}-{SEQ}` | `FARM-JH-2026-0487` |
| Incident | `INC-{YEAR}-{SEQ}` | `INC-2026-881` |
| Corrective Action | `ACT-{YEAR}-{SEQ}` | `ACT-2026-101` |
| Inspection | `INSP-{YEAR}-{MONTH}` | `INSP-2026-08` |
| Notification | `NOTIF-{SEQ}` | `NOTIF-001` |

---

*Document generated from static analysis of the BioShield frontend codebase. The existing frontend continues to function unchanged with mock services until `src/services/api.ts` is swapped per Phase 1.*
