# Youji Health Data Plan

## Goal

Prepare the Athletic Labs app for field testing with Youji Health device data, historical comparisons, optional VALD Performance data, updated report UI, and tablet smoke testing.

The first implementation focus is Youji Health data handling:

- Store the values needed for Athletic Labs calculations and clean report summaries.
- Avoid bloating the Athletic Labs database with every Youji Health field.
- Show a QR/link on the report that lets the athlete or family open the original device report for all details.

## Workstreams

### 1. Youji Health Data Contract

Status: in progress.

Tasks:

- Define normalized Youji fields for DB and report usage.
- Store only selected normalized fields plus the original device report link.
- Add report QR/link output using the scanned device QR URL.
- Make duplicate QR handling production-safe after test debugging.
- Add tests for QR import, duplicate handling, and report payload generation.

### 2. Historical Test Data Import

Status: pending.

Tasks:

- Review old test files and map columns to current athlete/test schema.
- Import historical athletes and measurements into `historical_athlete_data` or equivalent comparison tables.
- Validate birth year, gender, sport type, and metric units.
- Run percentile/comparison smoke tests against imported records.

### 3. VALD Performance Mode

Status: pending.

Tasks:

- Add per-session config: `hasValdPerformance`.
- When VALD is enabled, hide/disable local inputs replaced by VALD metrics.
- Add backend integration for VALD GET results.
- Store VALD raw payload and normalized metrics separately from manual/Youji data.
- Make report generation select metric source by session config.

### 4. Report UI Update

Status: pending.

Tasks:

- Redesign report layout for cleaner field-test output.
- Separate body composition, field performance, comparisons, and recommendations.
- Show Youji detail QR with helper text.
- Handle missing metrics gracefully.
- Ensure PDF/ZIP export matches the live report.

### 5. Field Test Readiness

Status: pending.

Tasks:

- Run backend health, DB migration, and report generation tests.
- Run tablet smoke tests on production URLs.
- Test offline/pending sync behavior.
- Test QR scan flow on real devices.
- Test missed athlete recovery flow.

### 6. Missed Athlete Recovery

Status: pending.

Tasks:

- Change `gelmedi` behavior so athletes do not disappear permanently from the working list.
- Add a visible filter/tab for `Gelmedi`.
- Add one-click `Geri Al / Teste Al` action.
- Keep audit state: not started, in progress, completed, absent.

## Youji Health Field Decision

### Current State

The backend already stores the full device report in `x_one_report_imports`:

- `qr_url`
- `qr_token`
- `raw_payload`
- `composition`
- `measurement`
- `posture`
- `balance`
- `report_id`
- `agent_id`

This was useful while proving the integration, but the production data model should not depend on storing every Youji field forever. The next step is to keep the selected summary fields and the original report URL/QR, and make raw payload storage optional or debug-only.

## Normalized DB Fields

These fields should be stored in structured DB columns because they are used in calculations, comparisons, filtering, or report summaries.

| Field | Source | DB target | Report summary | Notes |
| --- | --- | --- | --- | --- |
| Measurement time | Youji measurement/report timestamp | Add to Youji import or measurement metadata | Yes | Needed for audit and report credibility. |
| Height | Youji measurement | `measurements.height` | Yes | Already mapped. |
| Weight | Youji measurement/composition | `measurements.weight` | Yes | Already mapped. |
| BMI | Youji or derived | `measurements.bmi` | Yes | Already mapped/derived. |
| FFMI / strength index | Youji or derived from body fat | `measurements.ffmi` | Yes | Already mapped/derived. |
| Body fat percent | Youji composition | New structured field recommended | Maybe | Needed if FFMI is derived and for future body-composition reports. |
| Mineral amount | Youji composition | New structured field recommended | Yes | User-requested report field. |
| Protein amount | Youji composition | New structured field recommended | Yes | User-requested report field. |
| Device report URL | Scanned QR URL | `x_one_report_imports.qr_url` | Yes, as QR | Already stored. Primary access path for all detailed Youji fields. |
| Device report id | QR/API response | `x_one_report_imports.report_id` | No | Already stored, used for duplicate protection. |
| Device serial | Youji payload | New structured field optional | No | Useful for support/debugging. |

## Do Not Store Long-Term

These should not be normalized into Athletic Labs DB unless we later decide they are part of our product logic:

- Full composition object
- Full measurement object
- Full posture object
- Full balance object
- Raw device API response
- Device-specific scores or vendor-only labels
- Any field whose unit/meaning is not confirmed

Reason: the athlete can access the complete Youji report through the QR/link on the report. If we later need another field, we can fetch it again from the report link/API and add a deliberate migration.

Short-term exception:

- During integration/debugging we may keep raw payloads temporarily.
- Before field production hardening, decide whether `raw_payload`, `composition`, `measurement`, `posture`, and `balance` remain as debug fields or are replaced by a smaller summary table.

## Report Display Decision

The report should show a clean summary, not every Youji field.

Show directly:

- Boy
- Kilo
- BMI
- FFMI / kuvvet indeksi
- Mineral miktarı
- Protein miktarı
- Ölçüm zamanı

Show only if useful and age-appropriate:

- Body fat percent
- Body composition note/recommendation
- 12+ age specific recommendations

Do not show directly by default:

- All posture/balance/vendor-specific raw fields
- Debug IDs
- Tokens
- Device serial

Instead, show:

> Detaylı vücut analiz raporunu görmek için QR kodu okutun.

The QR should encode the original `x_one_report_imports.qr_url`.

Do not store QR image binaries unless there is a specific offline requirement. Store the URL and generate the QR image at report/export time.

## Backend Changes Needed

These changes should be implemented in `athletic-labs-backend`.

- Add migration for selected structured Youji fields.
- Keep `XOneReportImport.qr_url` as the canonical device report link.
- Generate report QR from `qr_url` at response/render time.
- Extend `XOneReportImport` model with optional structured summary fields, or add a separate `youji_report_summaries` table.
- Update `normalizeXOnePayload` to extract:
  - measurement time
  - body fat percent
  - mineral amount
  - protein amount
  - device serial
- Return Youji summary and `deviceReportQrUrl` in calculate-report response.
- Avoid adding every Youji value as a DB column.
- Make long-term raw payload retention an explicit choice, not the default product model.
- Add tests for normalization using real sample payloads.

Recommended DB shape:

- Keep performance and core anthropometrics in `measurements`.
- Keep Youji-specific body composition fields in `x_one_report_imports` or a dedicated `youji_report_summaries`.

Preferred long-term option:

- Create `youji_report_summaries`.
- One row per `x_one_report_import_id`.
- This avoids overloading `measurements` with vendor-specific fields.
- Keep only the report link plus summary values needed by Athletic Labs.

## Frontend Changes Needed

- Extend report types with `youjiSummary`.
- Render Youji body composition summary in the report.
- Generate QR image from `deviceReportQrUrl`.
- Update PDF export to include the same QR and summary.
- Add UI feedback after QR import showing which Youji fields were captured.

## Field Test Order

1. Implement Youji summary extraction and report QR.
2. Add/report historical comparison data.
3. Add VALD session mode.
4. Update report UI.
5. Fix absent athlete recovery.
6. Run production deploy.
7. Test on tablets using production URLs.
