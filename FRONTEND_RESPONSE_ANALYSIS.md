# Frontend API Response Analysis Report

## Executive Summary

**Status:** ⚠️ **MIXED - SOME ENDPOINTS WORK, OTHERS WILL FAIL**

The frontend correctly receives and handles responses for some endpoints, but has critical issues with others. Most of the problems stem from:
1. **Wrong API request methods/endpoints** (already identified)
2. **Incorrect response field expectations** in some cases
3. **Mock data being used** instead of real API integration in AdminPage

---

## Detailed Analysis by Endpoint

### 1. ✅ AUTH REGISTER - CORRECT USAGE

**Endpoint:** `POST /auth/register`

**Frontend Sends:**
```typescript
requestOtp(phone: string) {
  const { data } = await api.post('/auth/register', { phone })
}
```

**Backend Returns:**
```json
{
  "message": "OTP sent to your phone number. Valid for 5 minutes.",
  "phone": "0801****5678"
}
```

**Frontend Expects:**
```typescript
// In LoginPage.tsx (line 25)
await requestOtp(data.phone)
setPhone(data.phone)
setStep('otp')
```

**Analysis:**
- ✅ Request format correct
- ✅ Endpoint correct
- ✅ Response is just awaited, then state is updated
- ✅ The function doesn't extract specific fields - just waits for success
- **Status:** ✅ WORKS

---

### 2. ✅ AUTH VERIFY - CORRECT USAGE

**Endpoint:** `POST /auth/verify`

**Frontend Sends:**
```typescript
verifyOtp(phone: string, otp: string) {
  const { data } = await api.post('/auth/verify', { phone, otp })
}
```

**Backend Returns:**
```json
{
  "token": "eyJ...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "user",
  "is_trusted": false
}
```

**Frontend Uses:**
```typescript
// In LoginPage.tsx (line 42)
const auth = await verifyOtp(phone, data.otp)
login(auth)  // Passes entire response to AuthContext
```

**AuthContext Usage:**
```typescript
// In AuthContext.tsx (line 36)
const login = useCallback((auth: AuthResponse) => {
  localStorage.setItem('tn_token', auth.token)
  setToken(auth.token)
}, [])
```

**Expected Type (types/index.ts):**
```typescript
export interface AuthResponse {
  token: string
  user_id: string
  role: string
  is_trusted: boolean
}
```

**Analysis:**
- ✅ Request format correct
- ✅ Response structure matches expected fields
- ✅ Token is extracted and stored correctly
- ✅ AuthContext properly receives and stores the response
- **Status:** ✅ WORKS

---

### 3. ❌ GET PROFILE - WRONG ENDPOINT (WILL FAIL)

**Frontend Calls:**
```typescript
// In api.ts (line 37)
getProfile(): Promise<UserProfile> {
  const { data } = await api.get('/auth/profile')  // ← WRONG ENDPOINT
  return data
}

// Used in AuthContext.tsx (line 48)
if (!token) return
getProfile()
  .then(setUser)
  .catch(logout)
```

**Backend Actually Provides:**
```
GET /me  (not /auth/profile)
```

**Expected Response (from backend spec):**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "role": "user",
  "is_trusted": false,
  "report_count": 5,
  "reputation_score": 45,
  "member_since": "2025-12-01T10:30:00Z"
}
```

**Frontend Expects:**
```typescript
export interface UserProfile {
  user_id: string
  username?: string
  role: string
  is_trusted: boolean
  report_count: number
  reputation_score: number
  member_since: string
}
```

**Analysis:**
- ❌ **CRITICAL:** Calling wrong endpoint `/auth/profile` instead of `/me`
- ⚠️ If the endpoint existed with correct response, the type matching would be OK
- ❌ **Impact:** User profile will not load after login, causing auth to fail
- **Status:** ❌ WILL FAIL

**Error Flow:**
```
1. User logs in → getProfile() is called
2. getProfile() calls GET /auth/profile
3. 404 Not Found (endpoint doesn't exist)
4. catch(logout) triggers
5. User is logged out immediately
```

---

### 4. ❌ LOOKUP - WRONG HTTP METHOD (WILL FAIL)

**Frontend Calls:**
```typescript
// In api.ts (line 19)
lookup(identifier: string): Promise<LookupResult> {
  const { data } = await api.post('/lookup', { identifier })  // ← POST (WRONG)
  return data
}

// Used in useLookup.ts (line 14)
const data = await lookup(identifier)
setResult(data)
```

**Backend Expects:**
```
GET /lookup?identifier=<value>  (not POST)
```

**Backend Returns:**
```json
{
  "identifier": "08012345678",
  "identifier_type": "phone",
  "risk_score": 75,
  "risk_level": "HIGH",
  "report_count": 12,
  "first_seen_at": "2025-11-15T08:20:00Z",
  "last_seen_at": "2025-12-03T14:45:00Z",
  "tags": ["investment_scam", "ponzi_scheme"],
  "is_known": true
}
```

**Frontend Expects (types/index.ts):**
```typescript
export interface LookupResult {
  identifier: string
  identifier_type: 'phone' | 'url' | 'wallet' | 'app'
  risk_score: number
  risk_level: RiskLevel
  report_count: number
  first_seen_at: string | null
  last_seen_at: string | null
  tags: string[]
  is_known: boolean
}
```

**Frontend Usage (LookupPage.tsx, line 88):**
```typescript
{result && !loading && (
  <div>
    <div>{result.identifier_type}</div>
    <div>{result.risk_score}</div>
    <RiskBadge level={result.risk_level as RiskLevel} score={result.risk_score} />
    // ... uses all fields correctly
  </div>
)}
```

**Analysis:**
- ❌ **CRITICAL:** Using POST instead of GET
- ✅ If request method were fixed, response field matching would be correct
- ❌ Error handling in useLookup.ts correctly displays error message
- **Status:** ❌ WILL FAIL (method mismatch)

**Error Flow:**
```
1. User enters identifier in LookupPage
2. lookup() sends POST /lookup { identifier }
3. Backend doesn't have POST /lookup (404 or 405 Method Not Allowed)
4. Error caught in useLookup.ts (line 19)
5. Error message displayed: "Lookup failed. Please try again."
```

---

### 5. ✅ REPORT SUBMISSION - CORRECT USAGE

**Endpoint:** `POST /report`

**Frontend Sends (ReportPage.tsx, line 72):**
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

**Note:** Field is `identifier` in frontend form, but backend API spec shows `identifer` (typo). However, the actual field being sent matches what backend code expects.

**Backend Returns:**
```json
{
  "report_id": "660e8400-e29b-41d4-a716-446655440001",
  "message": "Report submitted successfully",
  "risk_score": 65,
  "status": "pending"
}
```

**Frontend Uses (ReportPage.tsx, line 81):**
```typescript
setSubmitted(true)
// Shows success page
```

**Analysis:**
- ✅ Request fields match backend expectations
- ✅ Response is received but not used (just success state)
- ✅ Error handling properly extracts error message
- ✅ Success page displays correctly
- **Status:** ✅ WORKS

---

### 6. ✅ PENDING REPORTS - CORRECT USAGE (BUT USING MOCK DATA)

**Endpoint:** `GET /admin/reports/pending`

**Frontend Calls (AdminPage.tsx, line 87):**
```typescript
const handleModerate = async (id: string, action: 'approve' | 'reject') => {
  setModerating(id)
  try {
    // In production: await moderateReport(id, action)
    setReports((prev) => prev.filter((r) => r.id !== id))  // ← MOCK DATA
  } finally {
    setModerating(null)
  }
}
```

**⚠️ Issue:** The API call is commented out! Using mock data instead.

**Backend Returns:**
```json
[
  {
    "id": "uuid",
    "identifier_id": "uuid",
    "reporter_id": "uuid",
    "scam_type": "investment",
    "description": "text",
    "amount_lost_ngn": 500000,
    "channel": "web",
    "status": "pending",
    "moderated_by": null,
    "moderated_at": null,
    "moderation_note": null,
    "created_at": "2025-12-01T10:30:00Z",
    "updated_at": "2025-12-01T10:30:00Z"
  }
]
```

**Frontend Expects (types/index.ts):**
```typescript
export interface AdminReport {
  id: string
  identifier_id: string
  scam_type: string
  description?: string
  amount_lost_ngn?: number
  channel: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}
```

**Analysis:**
- ✅ Type definition matches backend response
- ✅ Rendering code (AdminPage.tsx) correctly displays all fields
- ⚠️ **Major Issue:** API call is commented out, using MOCK_REPORTS instead
- ❌ **Status:** NOT INTEGRATED - Using mock data instead of real API

---

### 7. ✅ MODERATE REPORT - CORRECT USAGE (BUT NOT CALLED)

**Endpoint:** `POST /admin/reports/:id/moderate`

**Frontend Implementation (api.ts, line 54):**
```typescript
moderateReport(id: string, action: 'approve' | 'reject', note?: string) {
  const { data } = await api.post(`/admin/reports/${id}/moderate`, { action, note })
  return data
}
```

**Backend Returns:**
```json
{
  "success": true,
  "message": "Report 550e8400-e29b-41d4-a716-446655440000 has been approved."
}
```

**Frontend Usage:**
```typescript
// In AdminPage.tsx (line 87)
// In production: await moderateReport(id, action)
// Currently commented out, using mock instead
```

**Analysis:**
- ✅ Request format correct
- ✅ Response handling would work if called
- ⚠️ **Major Issue:** Function is not actually called - using mock instead
- ❌ **Status:** NOT INTEGRATED

---

### 8. ✅ AUDIT LOGS - CORRECT USAGE (BUT USING MOCK DATA)

**Endpoint:** `GET /admin/audit-logs`

**Frontend Calls (AdminPage.tsx, line 63):**
```typescript
const [logs] = useState<AuditLog[]>(MOCK_LOGS)  // ← MOCK DATA
```

**Backend Returns:**
```json
[
  {
    "id": "uuid",
    "actor_id": "uuid",
    "actor_hash": null,
    "action": "lookup",
    "resource_type": "identifier",
    "resource_id": "uuid",
    "details": { ... },
    "ip_address": "192.168.1.100",
    "channel": "web",
    "created_at": "2025-12-03T14:45:00Z"
  }
]
```

**Frontend Expects (types/index.ts):**
```typescript
export interface AuditLog {
  id: string
  actor_id?: string
  action: string
  entity_type?: string
  entity_id?: string
  channel: string
  created_at: string
}
```

**Analysis:**
- ⚠️ Type definition is incomplete compared to backend response (missing actor_hash, resource fields, details, ip_address)
- ⚠️ **Major Issue:** Using MOCK_LOGS instead of calling API
- ❌ **Status:** NOT INTEGRATED

---

## Summary of Response Field Mismatches

| Endpoint | Request Match | Response Match | Integration Status |
|----------|---------------|----------------|--------------------|
| Register OTP | ✅ Correct | ✅ Correct | ✅ WORKS |
| Verify OTP | ✅ Correct | ✅ Correct | ✅ WORKS |
| Get Profile | ❌ Wrong endpoint | N/A (won't call) | ❌ FAILS |
| Lookup | ❌ Wrong method | ✅ Would match | ❌ FAILS |
| Submit Report | ✅ Correct | ✅ Correct | ✅ WORKS |
| Pending Reports | ✅ Correct | ✅ Correct | ⚠️ MOCK DATA |
| Moderate Report | ✅ Correct | ✅ Correct | ⚠️ NOT CALLED |
| Audit Logs | ✅ Correct | ⚠️ Incomplete type | ⚠️ MOCK DATA |

---

## Critical Issues to Fix

### 🔴 Issue #1: Login Fails Due to Wrong Profile Endpoint (CRITICAL)
**File:** `frontend/src/lib/api.ts` (line 37)
**File:** `frontend/src/context/AuthContext.tsx` (line 48)

**Problem:**
```typescript
// WRONG:
export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get('/auth/profile')  // ← Doesn't exist
  return data
}
```

**Impact:** After user logs in successfully, the app tries to fetch profile and fails, automatically logging them out.

**Fix:**
```typescript
// CORRECT:
export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get('/me')  // ← Correct endpoint
  return data
}
```

---

### 🔴 Issue #2: Lookup API Fails Due to Wrong HTTP Method (CRITICAL)
**File:** `frontend/src/lib/api.ts` (line 19)

**Problem:**
```typescript
// WRONG:
export async function lookup(identifier: string): Promise<LookupResult> {
  const { data } = await api.post('/lookup', { identifier })  // ← POST instead of GET
  return data
}
```

**Impact:** Identifier lookup feature will not work.

**Fix:**
```typescript
// CORRECT:
export async function lookup(identifier: string): Promise<LookupResult> {
  const { data } = await api.get('/lookup', { params: { identifier } })
  return data
}
```

---

### 🟡 Issue #3: Admin Panel Using Mock Data (HIGH)
**File:** `frontend/src/pages/AdminPage.tsx`

**Problems:**
1. Line 63: `const [logs] = useState<AuditLog[]>(MOCK_LOGS)` - Not calling API
2. Line 61: `const [reports, setReports] = useState<AdminReport[]>(MOCK_REPORTS)` - Using mock
3. Line 87: `// In production: await moderateReport(id, action)` - API call commented out

**Impact:** Admin dashboard doesn't integrate with backend, shows fake data.

**Fix:**
Uncomment API calls and add useEffect to fetch real data on mount.

---

### 🟡 Issue #4: Incomplete AuditLog Type Definition (MEDIUM)
**File:** `frontend/src/types/index.ts` (line 47)

**Problem:**
```typescript
// Incomplete - missing fields from backend
export interface AuditLog {
  id: string
  actor_id?: string           // ← Should be required when actor authenticated
  action: string
  entity_type?: string        // ← Backend says resource_type
  entity_id?: string          // ← Backend says resource_id
  channel: string
  created_at: string
  // Missing: actor_hash, resource_type, resource_id, details, ip_address
}
```

**Fix:** Update to match backend response structure.

---

## Frontend Response Handling Quality

### Strong Points ✅
1. **Error handling** - Uses try/catch properly in all API calls
2. **Loading states** - Shows spinners while waiting for responses
3. **Error display** - Shows user-friendly error messages
4. **Type safety** - Uses TypeScript interfaces for all responses
5. **OTP flow** - Correctly implements 2-step auth process

### Weak Points ⚠️
1. **Mock data usage** - Admin page relies on mock data instead of API
2. **Incomplete type definitions** - AuditLog type doesn't match backend
3. **Response data not validated** - No runtime validation of API responses
4. **API calls commented out** - moderateReport() not being called
5. **No response error handling** - Assumes all fields exist without checking

---

## Recommendations

### Immediate (Blocking Issues)
1. **Fix `/me` endpoint** - Change getProfile() to call correct endpoint
2. **Fix lookup HTTP method** - Change from POST to GET
3. **Uncomment admin API calls** - Enable real API integration
4. **Add fetch calls to AdminPage** - Use useEffect to load real data

### Short Term (Quality Improvements)
1. **Complete AuditLog type** - Add missing fields from backend
2. **Add response validation** - Validate API responses at runtime
3. **Remove dead code** - Delete unused login(), logout(), reportScam() functions
4. **Add loading states** - Show spinners in admin page while fetching

### Long Term (Architecture)
1. **Create custom hooks** - useAdminReports, useAuditLogs, etc.
2. **Implement error boundaries** - Better error UI
3. **Add request retries** - Automatically retry failed API calls
4. **Cache responses** - Reduce API calls for frequently accessed data
