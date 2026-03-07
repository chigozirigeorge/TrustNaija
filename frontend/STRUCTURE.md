# Frontend Folder Structure Guide

This document describes the reorganized frontend folder structure for the TrustNaija project.

## Directory Structure

```
src/
├── components/              # All UI components
│   ├── ui/                 # Reusable UI components
│   │   ├── Badge.tsx       # Badge components (RiskBadge, Tag, etc.)
│   │   ├── Button.tsx      # Button component with variants
│   │   ├── Card.tsx        # Card components (Card, CardHeader, CardBody, StatCard)
│   │   ├── Input.tsx       # Input field component
│   │   ├── RiskScoreRing.tsx  # Circular risk score visualization
│   │   ├── SearchBar.tsx   # Search input with submit
│   │   ├── Select.tsx      # Select dropdown component
│   │   ├── Skeleton.tsx    # Loading skeleton components
│   │   ├── Textarea.tsx    # Textarea component
│   │   ├── Toast.tsx       # Toast notification component
│   │   └── index.ts        # UI components barrel export
│   └── layout/             # Layout components
│       ├── Footer.tsx      # Page footer
│       ├── Navbar.tsx      # Navigation bar
│       ├── PageLayout.tsx  # Main page wrapper
│       └── index.tsx       # Layout barrel export
├── context/                # React Context providers
│   ├── AuthContext.ts      # Authentication context and useAuth hook
│   └── index.ts            # Context exports
├── hooks/                  # Custom React hooks
│   ├── useLookup.ts        # Identifier lookup hook
│   └── index.ts            # Hooks barrel export
├── lib/                    # Utility libraries
│   ├── api.ts              # API client and fetch functions
│   ├── utils.ts            # Helper functions (cn, getRiskColor, formatDate, etc.)
│   └── index.ts            # Lib exports
├── pages/                  # Page components
│   ├── HomePage.tsx        # Home/landing page
│   ├── AdminPage.tsx       # Admin dashboard
│   ├── ReportPage.tsx      # Report submission page
│   ├── UssdPage.tsx        # USSD guide page
│   └── index.ts            # Pages barrel export
├── types/                  # TypeScript type definitions
│   └── index.ts            # All type exports
├── utils/                  # Shared utility functions
│   └── index.ts            # Utility functions
├── services/               # API service layer (legacy, kept for compatibility)
│   └── api.ts              # API client setup
├── App.tsx                 # Main app component with routing
├── AuthContext.tsx         # (DEPRECATED - moved to context/AuthContext.ts)
├── main.tsx                # Entry point
├── index.tsx               # App initialization
├── index.css               # Global styles
└── index.html              # HTML template
```

## Component Organization

### UI Components (`src/components/ui/`)
Self-contained, reusable components with no page-specific logic:
- **Badge.tsx**: `RiskBadge`, `Tag`, `StatusBadge`, `TagBadge`
- **Button.tsx**: Button with variants (primary, secondary, ghost, danger, outline)
- **Card.tsx**: Card, CardHeader, CardBody, StatCard containers
- **Input.tsx**: Text input with label, error, hint support
- **RiskScoreRing.tsx**: Animated circular risk score display
- **SearchBar.tsx**: Search form with verification button
- **Select.tsx**: Dropdown select with label and error states
- **Skeleton.tsx**: Loading placeholders
- **Textarea.tsx**: Multi-line text input
- **Toast.tsx**: Notification toast component

### Layout Components (`src/components/layout/`)
Page-level layout components:
- **Navbar.tsx**: Top navigation with responsive mobile menu
- **Footer.tsx**: Footer with links and info
- **PageLayout.tsx**: Main page wrapper with Navbar + Footer

### Context (`src/context/`)
React Context for global state management:
- **AuthContext.ts**: User authentication state with `useAuth()` hook

### Hooks (`src/hooks/`)
Custom React hooks for reusable logic:
- **useLookup.ts**: Manages identifier lookup state and API calls

### Libraries (`src/lib/`)
Utility functions and API client:
- **utils.ts**: `cn()`, `getRiskColor()`, `formatDate()`, etc.
- **api.ts**: Axios API client with functions like `lookup()`, `login()`

## Import Paths

The project uses path aliases defined in `tsconfig.json`:

```typescript
// Good ✅
import { Button, Card } from '@/components/ui'
import { PageLayout } from '@/components/layout'
import { useAuth } from '@/context/AuthContext'
import { useLookup } from '@/hooks'
import { cn, getRiskColor } from '@/lib/utils'
import type { RiskLevel, LookupResult } from '@/types'

// Avoid ❌
import { Button } from '../components/ui/Button'
import Button from '../../../../components/ui/Button.tsx'
```

## Barrel Exports

Key barrel exports for cleaner imports:

```typescript
// src/components/ui/index.ts - All UI components in one import
export { Button, Input, Card, Badge, Select, SearchBar, RiskScoreRing, Skeleton, Toast, Textarea }

// src/components/layout/index.ts - All layout components
export { PageLayout, Navbar, Footer }

// src/context/index.ts - Context providers
export { AuthProvider, useAuth }

// src/hooks/index.ts - Custom hooks
export { useLookup }

// src/lib/index.ts - Utilities and API
export { cn, getRiskColor, lookup, login }
```

## Migration Notes

- **Old Root Components**: Component files previously at `src/Button.tsx`, `src/Input.tsx`, etc. are now in `src/components/ui/`
- **AuthContext**: Moved from `src/AuthContext.tsx` to `src/context/AuthContext.ts`
- **Layout Components**: Navbar, Footer, PageLayout moved to `src/components/layout/`
- **API Client**: Both `src/lib/api.ts` and `src/services/api.ts` exist; prefer `src/lib/api.ts`
- **Utilities**: `src/utils.ts` content is partially mirrored in `src/lib/utils.ts`

## Best Practices

1. **Always use barrel exports** for cleaner imports
2. **Organize by feature**: Group related components, hooks, and types together
3. **Keep components pure**: UI components should not import from `pages/`
4. **Use TypeScript**: Define all props and return types clearly
5. **Central types**: All types go in `src/types/index.ts`
6. **Reuse utilities**: Common functions go in `src/lib/utils.ts`

## Component Development Workflow

When creating a new component:

1. Determine if it's a UI component or page component
2. Create it in the appropriate folder (`components/ui` or `pages`)
3. Add TypeScript types for all props
4. Export from the barrel file (`index.ts`)
5. Use in your pages with path aliases
6. Keep styles in Tailwind classes (no separate CSS files)
