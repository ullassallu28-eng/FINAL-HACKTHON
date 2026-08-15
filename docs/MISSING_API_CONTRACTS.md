# Missing API Contracts (AgriSentinel Upgrades)

These endpoints or response fields would improve the upgraded frontend. **Do not fake them in production UI.**

## 1. Aggregated Action Center

**Proposed:** `GET /api/v1/farms/{farm_id}/action-center`

**Response:**
```json
{
  "farmId": "FARM-0487",
  "biosecurityScore": 82,
  "riskLevel": "safe",
  "criticalGaps": [{ "id": "...", "title": "Entry disinfection" }],
  "activeIncidents": [...],
  "pendingActions": [...],
  "nextRequiredAction": { "actionId": "...", "title": "...", "type": "evidence" },
  "recentAlerts": [...]
}
```

**Current workaround:** Client parallel-fetches existing endpoints.

## 2. Corrective Action Source Tracking

**Extend:** `CorrectiveActionResponse`

```json
{
  "incidentId": "INC-1042",
  "sourceType": "incident",
  "sourceLabel": "Incident #1042 — Sudden Mortality"
}
```

**Current workaround:** Show traceability stepper; source link hidden until API returns fields.

## 3. Inspection Priority Explanations

**Proposed:** `GET /api/v1/officer/inspection-priority` returns:

```json
[{
  "rank": 1,
  "farm": { ...FarmResponse },
  "reasons": ["Low biosecurity score", "2 open incidents"]
}]
```

**Current workaround:** Uses backend sort order + derives display factors from incidents/actions data.

## 4. Component Score History

**Proposed:** `GET /api/v1/risk/farms/{id}/component-history?days=30`

**Current workaround:** Overall score history + current component snapshot from passport.
