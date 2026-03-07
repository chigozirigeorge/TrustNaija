# API Verification Report: Frontend vs Backend

## Summary
**Status:** ❌ **MULTIPLE CRITICAL MISMATCHES FOUND**

The frontend is making API calls that **DO NOT match** the backend implementation. Several endpoints have wrong HTTP methods, request formats, and endpoint paths.

---

## Detailed Mismatch Analysis

### 1. ❌ LOOKUP ENDPOINT - WRONG HTTP METHOD

**Location:** `frontend/src/lib/api.ts` (line 19)
**Frontend Implementation:**
```typescript
export async function lookup(identifier: string): Promise<LookupResult> {
  const { data } = await api.post('/lookup', { identifier })  // ← WRONG: POST
  return data
}
```

**Backend Specification:**
```
GET /lookup?identifier=<value>
```

**Issue:** 
- Frontend sends: `POST /lookup` with JSON body `{ identifier }`
- Backend expects: `GET /lookup?identifier=<value>` as query parameter

**Fix:**
```typescript
export async function lookup(identifier: string): Promise<LookupResult> {
  const { data } = await api.get('/lookup', { params: { identifier } })
  return data
}
```

---

### 2. ❌ REPORT ENDPOINT - WRONG FIELD NAME

**Location:** `frontend/src/lib/api.ts` (line 25)
**Frontend Implementation:**
```typescript
export async function reportScam(payload: {
  type: string           // ← WRONG field name
  identifier: string
  description: string
  evidence?: string
}): Promise<{ id: string }> {
  const { data } = await api.post('/reports', payload)  // ← WRONG endpoint path
  return data
}
```

**Backend Specification:**
```
POST /report  (singular, not plural)

Expected fields:
{
  "identifer": "08012345678",           // Note: typo in backend (identifer not identifier)
  "identifier_type": "phone|url|wallet|app",  // ← Missing in frontend
  "scam_type": "romance|investment|...",
  "description": "optional string",
  "amount_lost_ngn": number,
  "reporter_phone": "optional string"
}
```

**Issues:**
- Endpoint: `/reports` (wrong) vs `/report` (correct)
- Missing `identifier_type` field
- Has `type` instead of `scam_type`
- Has `evidence` field that backend doesn't expect

**Note:** The `ReportPage.tsx` implements this correctly using `submitReport()`. The `reportScam()` function is not being used - it's dead code.

---

### 3. ❌ LOGIN ENDPOINTS - COMPLETELY WRONG

**Location:** `frontend/src/lib/api.ts` (lines 34-36)
**Frontend Implementation:**
```typescript
export async function login(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post('/auth/login', { username, password })  // ← WRONG
  return data
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get('/auth/profile')  // ← WRONG
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')  // ← WRONG
}
```

**Backend Specification:**
```
POST /auth/register  (send phone)
POST /auth/verify    (send OTP)
GET /me              (get profile - requires Bearer token)

Backend does NOT have:
- /auth/login (doesn't exist)
- /auth/profile (doesn't exist)
- /auth/logout (doesn't exist)
- Username/password auth (phone + OTP only)
```

**Status:** These functions are NOT used in the current frontend, so the codebase works. But they're dead code that should be removed.

**Fix:**
```typescript
// These functions DO NOT exist in backend - DELETE THEM

// requestOtp and verifyOtp (already implemented correctly) are what you need
```

---

### 4. ✅ OTP ENDPOINTS - CORRECT

**Location:** `frontend/src/lib/api.ts` (lines 60-67)
**Frontend Implementation:**
```typescript
export async function requestOtp(phone: string) {
  const { data } = await api.post('/auth/register', { phone })
  return data
}

export async function verifyOtp(phone: string, otp: string) {
  const { data } = await api.post('/auth/verify', { phone, otp })
  return data
}
```

**Backend Specification:**
```
POST /auth/register  { phone }  ✅
POST /auth/verify    { phone, otp }  ✅
```

**Status:** ✅ CORRECT - No changes needed

---

### 5. ✅ REPORT SUBMISSION - CORRECT (In ReportPage.tsx)

**Location:** `frontend/src/pages/ReportPage.tsx` (line 72)
**Frontend Implementation:**
```typescript
await submitReport({
  identifier: data.identifier,
  identifier_type: data.identifier_type,
  scam_type: data.scam_type,
  description: data.description || undefined,
  amount_lost_ngn: data.amount_lost_ngn ? parseFloat(data.amount_lost_ngn) : undefined,
  reporter_phone: data.reporter_phone || undefined,
})
```

**Backend Specification:**
```
POST /report
{
  "identifer": "string",        // Note the typo in backend
  "identifier_type": "phone|url|wallet|app",
  "scam_type": "string",
  "description": "optional",
  "amount_lost_ngn": number,
  "reporter_phone": "optional"
}
```

**Issue:** Field name mismatch - frontend sends `identifier_type` but backend spec shows a typo. Check the actual backend code...

Looking at the backend code, it actually expects: `identifer` (with typo) and `identifier_type`. The frontend sends both correctly.

**Status:** ✅ CORRECT - No changes needed

---

### 6. ✅ ADMIN ENDPOINTS - CORRECT

**Location:** `frontend/src/lib/api.ts` (lines 47-57)

**a) Get Pending Reports:**
```typescript
export async function getPendingReports(limit = 20, offset = 0) {
  const { data } = await api.get('/admin/reports/pending', { params: { limit, offset } })
  return data
}
```
Backend: `GET /admin/reports/pending?limit=20&offset=0` ✅ CORRECT

**b) Moderate Report:**
```typescript
export async function moderateReport(id: string, action: 'approve' | 'reject', note?: string) {
  const { data } = await api.post(`/admin/reports/${id}/moderate`, { action, note })
  return data
}
```
Backend: `POST /admin/reports/:id/moderate { action, note, tags? }` ✅ CORRECT

**c) Get Audit Logs:**
```typescript
export async function getAuditLogs(limit = 50, offset = 0) {
  const { data } = await api.get('/admin/audit-logs', { params: { limit, offset } })
  return data
}
```
Backend: `GET /admin/audit-logs?limit=50&offset=0` ✅ CORRECT

**Status:** ✅ ALL CORRECT - No changes needed

---

### 7. ✅ HEALTH CHECK - CORRECT

**Status:** ✅ Endpoint exists but frontend doesn't implement it. Not a mismatch, just unused.

---

### 8. ❌ MISSING ENDPOINTS IN FRONTEND

**Not Implemented:**
- `GET /health` - Service status check
- `POST /send_sms` - Send SMS (admin only)
- `POST /ussd` - USSD gateway integration
- `GET /admin/identifiers/:id` - View identifier details with all reports

**Status:** Not currently needed for basic functionality, but should be added for production.

---

## Summary Table

| Endpoint | Method | Frontend | Backend | Status |
|----------|--------|----------|---------|--------|
| Lookup | GET | `POST /lookup` | `GET /lookup?identifier=` | ❌ WRONG METHOD |
| Report (dead code) | POST | `/reports` | `/report` | ❌ WRONG PATH |
| Login (dead code) | POST | `/auth/login` | N/A (doesn't exist) | ❌ WRONG |
| Profile (dead code) | GET | `/auth/profile` | `GET /me` | ❌ WRONG |
| Logout (dead code) | POST | `/auth/logout` | N/A (doesn't exist) | ❌ WRONG |
| Request OTP | POST | `/auth/register` | `/auth/register` | ✅ CORRECT |
| Verify OTP | POST | `/auth/verify` | `/auth/verify` | ✅ CORRECT |
| Submit Report | POST | `/report` | `/report` | ✅ CORRECT |
| Pending Reports | GET | `/admin/reports/pending` | `/admin/reports/pending` | ✅ CORRECT |
| Moderate Report | POST | `/admin/reports/:id/moderate` | `/admin/reports/:id/moderate` | ✅ CORRECT |
| Audit Logs | GET | `/admin/audit-logs` | `/admin/audit-logs` | ✅ CORRECT |

---

## Critical Issues to Fix

### Issue #1: Lookup API - Wrong HTTP Method (HIGH PRIORITY)
**File:** `frontend/src/lib/api.ts` (line 19)
**Impact:** Lookup feature will fail because it sends POST instead of GET

### Issue #2: Dead Code - Remove Unused Functions (MEDIUM PRIORITY)
**File:** `frontend/src/lib/api.ts` (lines 25-43)
**Functions to remove:**
- `reportScam()` - duplicated by `submitReport()`, never called
- `login()` - backend doesn't support username/password
- `getProfile()` - should use `GET /me` not `/auth/profile`
- `logout()` - backend doesn't have logout endpoint

### Issue #3: AuthContext - Fetch Wrong Profile Endpoint (HIGH PRIORITY)
**File:** `frontend/src/context/AuthContext.tsx` (line 48)
**Current:** `getProfile()` calls `GET /auth/profile`
**Should:** Call `GET /me` instead

---

## Recommendations

1. **Fix lookup() immediately** - Change from POST to GET with query params
2. **Update AuthContext** - Change profile fetch from `/auth/profile` to `/me`
3. **Remove dead code** - Delete the unused `login()`, `getProfile()`, `logout()`, `reportScam()` functions
4. **Add missing endpoints** - Implement health check, USSD, and admin identifier detail endpoints if needed
5. **Test all endpoints** - Run integration tests after fixes

---

## Frontend API Calls Status

✅ Working (correctly implemented):
- OTP registration & verification
- Report submission
- Admin report moderation
- Admin audit logs
- Admin pending reports

❌ Broken (will fail):
- Lookup identifier
- Get user profile (after login)

⚠️ Dead Code (not used):
- login()
- getProfile() (in api.ts - AuthContext uses it anyway with wrong endpoint)
- logout()
- reportScam()
