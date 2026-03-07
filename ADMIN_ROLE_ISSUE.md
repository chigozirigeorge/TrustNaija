# Admin Panel 500 Error - Root Cause Analysis

## Error
When clicking "Approve" on a pending report in the admin panel, you get a **500 Internal Server Error**.

---

## Root Cause

The `/admin/reports/:id/moderate` endpoint requires the user to have a **`moderator` or `admin` role**, but your logged-in user has the **`user` role**.

### Backend Code
```rust
pub struct ModeratorUser(pub JwtClaims);

impl FromRequestParts<AppState> for ModeratorUser {
    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let token = extract_bearer_token(parts)?;
        let claims = validate_token(&token, &state.config.jwt_secret)?;

        if claims.role != "moderator" && claims.role != "admin" {
            return Err(AppError::Forbidden(
                "Moderator or admin role required".into(),
            ));
        }

        Ok(ModeratorUser(claims))
    }
}
```

---

## What Endpoints Require Moderator Role?

| Endpoint | Requires Role |
|----------|---------------|
| `GET /admin/reports/pending` | ✅ moderator \| admin |
| `POST /admin/reports/:id/moderate` | ✅ moderator \| admin |
| `GET /admin/audit-logs` | ✅ admin |
| `GET /admin/identifiers/:id` | ✅ moderator \| admin |

---

## How to Fix

You need to manually set the user's role to `moderator` or `admin` in the database.

### Option 1: Direct SQL Update (Development)
```sql
UPDATE users 
SET role = 'moderator' 
WHERE id = '<your-user-id>';
```

### Option 2: Check Your User ID First
After logging in, your user ID is in the JWT token. You can decode it:

**In Browser Console:**
```javascript
// Get the stored token
const token = localStorage.getItem('tn_token');

// Parse JWT (basic decoding - works without validation)
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('User ID:', payload.sub);
console.log('Current Role:', payload.role);
```

Then update the database:
```sql
UPDATE users 
SET role = 'moderator' 
WHERE id = '<your-user-id-from-jwt>';
```

### Option 3: In Production - Create Admin Users with Proper Setup
In a production system, you should:
1. Have a separate admin registration endpoint
2. Only allow creating admins through authenticated admin accounts
3. Or use environment-based seeding for initial admin users

---

## Database Schema (Users Table)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone_hash VARCHAR(255) NOT NULL UNIQUE,
  email_hash VARCHAR(255),
  username VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user',  -- 'user', 'moderator', 'admin'
  is_verified BOOLEAN DEFAULT false,
  is_trusted BOOLEAN DEFAULT false,
  report_count INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE
);
```

---

## What I Fixed in Frontend

I updated the API calls to include the optional `tags` field:

**Before:**
```typescript
export async function moderateReport(id: string, action: 'approve' | 'reject', note?: string) {
  const { data } = await api.post(`/admin/reports/${id}/moderate`, { action, note })
  return data
}
```

**After:**
```typescript
export async function moderateReport(id: string, action: 'approve' | 'reject', note?: string, tags?: string[]) {
  const { data } = await api.post(`/admin/reports/${id}/moderate`, { action, note, tags })
  return data
}
```

This ensures the request body matches what the backend expects.

---

## Next Steps

1. **Get your user ID** from the JWT token (see console command above)
2. **Update the database** to give yourself moderator role:
   ```sql
   UPDATE users SET role = 'moderator' WHERE id = '<your-id>';
   ```
3. **Log out and log back in** (to get a new token with moderator role)
4. **Try approving a report again**

After logging back in, the approval should work! ✅

---

## Testing the Fix

After updating your role:
1. Open browser DevTools (F12)
2. Go to Console
3. Run: `localStorage.removeItem('tn_token')`
4. Refresh the page
5. Log in again
6. Check token role: `JSON.parse(atob(localStorage.getItem('tn_token').split('.')[1]))` should show `"role":"moderator"`
7. Go to Admin panel and try approving a report
