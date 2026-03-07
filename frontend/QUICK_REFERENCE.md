# 🚀 Quick Reference Guide

## Import Examples

### ✅ Correct (After Restructure)
```typescript
// UI Components
import { Button, Input, Card, Badge } from '@/components/ui'
import { SearchBar, RiskScoreRing } from '@/components/ui'
import { Skeleton, Toast, Textarea } from '@/components/ui'

// Layout
import { PageLayout, Navbar, Footer } from '@/components/layout'

// Context & Hooks
import { useAuth } from '@/context'
import { useLookup } from '@/hooks'

// Utilities
import { cn, getRiskColor, formatDate } from '@/lib/utils'
import { lookup, login, getProfile } from '@/lib/api'

// Types
import type { RiskLevel, LookupResult, UserProfile } from '@/types'
```

### ❌ Wrong (Old Structure)
```typescript
import { Button } from '@/Button'           // ❌ Old location
import { AuthContext } from '@/AuthContext' // ❌ Moved to @/context
import { PageLayout } from '@/PageLayout'   // ❌ Now in @/components/layout
```

## Component Usage Examples

### Button Component
```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="md" loading={isLoading}>
  Verify
</Button>

// Variants: primary | secondary | ghost | danger | outline
// Sizes: sm | md | lg
```

### Input Component
```tsx
import { Input } from '@/components/ui'

<Input
  label="Phone Number"
  placeholder="Enter phone..."
  error={error}
  hint="Format: +234 9XX XXX XXXX"
/>
```

### Card Component
```tsx
import { Card, StatCard } from '@/components/ui'

<Card glow="signal">
  <h3>Content here</h3>
</Card>

<StatCard
  label="Reports"
  value={42}
  sublabel="This month"
  icon={<ChartIcon />}
/>
```

### Toast Notifications
```tsx
import { Toast } from '@/components/ui'

<Toast
  id="toast-1"
  type="success"
  message="Operation completed!"
  onClose={(id) => removeToast(id)}
/>
```

### Loading States
```tsx
import { Skeleton, SkeletonText } from '@/components/ui'

<Skeleton className="h-10 w-full rounded-lg" />
<SkeletonText lines={3} className="w-3/4" />
```

### Search Bar
```tsx
import { SearchBar } from '@/components/ui'

<SearchBar
  onSearch={(value) => handleLookup(value)}
  loading={isLoading}
  placeholder="Enter identifier..."
  size="large"
/>
```

### Risk Display
```tsx
import { RiskBadge, RiskScoreRing } from '@/components/ui'

<RiskBadge level="HIGH" score={72} size="md" />

<RiskScoreRing score={72} level="HIGH" size={140} />
```

## Page Layout Example

```tsx
import { PageLayout } from '@/components/layout'
import { Button, Input } from '@/components/ui'

export function MyPage() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1>My Page</h1>
        <Button variant="primary">Click me</Button>
      </div>
    </PageLayout>
  )
}
```

## Authentication Example

```tsx
import { useAuth } from '@/context'

export function Profile() {
  const { user, isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) return <div>Not logged in</div>

  return (
    <div>
      <p>Welcome, {user?.username}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  )
}
```

## API Usage Example

```tsx
import { lookup, login } from '@/lib/api'
import { useLookup } from '@/hooks'

// Using the hook
const { result, loading, error, lookup } = useLookup()

// Or directly
async function checkIdentifier(phone: string) {
  try {
    const result = await lookup(phone)
    console.log(result.risk_level)
  } catch (err) {
    console.error('Lookup failed')
  }
}
```

## Utility Functions

```tsx
import { cn, getRiskColor, formatDate, detectIdentifierType } from '@/lib/utils'

// Class name utilities
const buttonClass = cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500'
)

// Risk color mapping
const color = getRiskColor('HIGH') // Returns hex color

// Date formatting
const formatted = formatDate('2024-01-15') // "15 Jan 2024"

// Identifier detection
const type = detectIdentifierType('+2349123456789') // "phone"
```

## File Organization Rules

1. **Components**: All go in `components/ui/` or `components/layout/`
2. **Hooks**: Custom hooks go in `hooks/`
3. **Utilities**: Helper functions go in `lib/utils.ts`
4. **API**: API calls go in `lib/api.ts`
5. **Types**: All types go in `types/index.ts`
6. **Context**: Global state goes in `context/`
7. **Pages**: Page components go in `pages/`

## Creating a New Component

```tsx
// 1. Create file in components/ui/MyComponent.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface MyComponentProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}

export function MyComponent({ variant = 'primary', children }: MyComponentProps) {
  return (
    <div className={cn(
      'base-styles',
      variant === 'primary' && 'primary-styles',
      variant === 'secondary' && 'secondary-styles'
    )}>
      {children}
    </div>
  )
}

// 2. Export from components/ui/index.ts
export { MyComponent } from './MyComponent'

// 3. Use with clean imports
import { MyComponent } from '@/components/ui'
```

## Troubleshooting

### Import not found?
- Make sure you're using `@/` alias
- Check the barrel export in `index.ts`
- Verify file exists in the correct folder

### Types not recognized?
- Check `types/index.ts` exports
- Make sure imports use `import type` for types

### Component not rendering?
- Check props match TypeScript interface
- Verify Tailwind classes are correct
- Check browser console for errors

## Key Folders at a Glance

| Folder | Use For | Example |
|--------|---------|---------|
| `components/ui/` | Reusable components | Button, Input, Card |
| `components/layout/` | Page structure | Navbar, Footer, PageLayout |
| `context/` | Global state | Authentication, User info |
| `hooks/` | Custom hooks | useLookup, useAuth |
| `lib/` | Utilities & API | formatDate, lookup(), cn() |
| `pages/` | Page components | HomePage, AdminPage |
| `types/` | TypeScript types | RiskLevel, UserProfile |

---

**Need more details?** See `STRUCTURE.md` in the frontend folder.
