# DESIGN.md

## Visual Direction

- Tone: technical, precise, calm confidence
- Personality: practical over decorative
- Density: medium-high information density
- Layout style: card-and-panel workspace with clear hierarchy

## Color System

- Background: #0F131A
- Surface: #151B24
- Surface Alt: #1B2431
- Text Primary: #E8EDF5
- Text Secondary: #A9B4C4
- Accent Primary: #2EC27E
- Accent Secondary: #3FA7FF
- Warning: #F6C343
- Error: #F97066
- Border: #2A3647

## Typography

- Heading Font: IBM Plex Sans
- Body Font: Noto Sans JP
- Mono Font: JetBrains Mono
- Heading scale:
  - H1: 36/44, 700
  - H2: 28/36, 700
  - H3: 22/30, 600
- Body scale:
  - Large: 18/28, 400
  - Base: 16/24, 400
  - Small: 14/22, 400
  - Caption: 12/18, 500

## Component Style

- Buttons:
  - Primary: Accent Primary fill, dark text, 10px radius
  - Secondary: transparent with Border stroke
  - Danger: Error fill, white text
- Inputs:
  - Surface background, Border stroke, 8px radius
  - Focus ring: Accent Secondary at 2px
- Cards:
  - Surface background, 12px radius, subtle shadow
  - Header and body separation with 1px border
- Navigation:
  - Left rail on desktop, bottom tab on mobile
  - Active state uses Accent Primary indicator

## Spacing & Layout

- Spacing scale: 4, 8, 12, 16, 24, 32, 48
- Grid:
  - Desktop: 12 columns, max width 1280px
  - Tablet: 8 columns
  - Mobile: 4 columns
- Minimum touch target: 44x44

## Motion

- Enter transitions: 180-240ms, ease-out
- List stagger: 30ms per item, up to 8 items
- Avoid continuous decorative animation

## Do

- Keep contrasts WCAG AA or better
- Prefer explicit labels over icon-only controls
- Keep primary actions visually dominant

## Do Not

- Use low-contrast gray on dark surfaces
- Rely on color alone for status communication
- Introduce large layout shifts on data updates

## Visual Anti-Slop

- Start visually important pages with a concise design read: audience, page type, visual language, and density.
- Avoid generic AI defaults such as purple gradient mesh heroes, repeated three-card rows, decorative fake system labels, and nested cards without purpose.
- Use image references only when visual fidelity is the main success criterion, then translate them into the existing DCR design language instead of treating them as a new source of truth.

## Responsive Rules

- Collapse side panels below 1024px
- Convert dense tables to card rows below 768px
- Preserve keyboard access across all breakpoints
- Mobile-first approach for new components

## Accessibility

- WCAG 2.1 AA compliance minimum
- Keyboard navigation support for all interactive elements
- Screen reader labels for icon-only buttons
- Focus visible indicator: 2px Accent Secondary outline
- Color contrast ratios: 4.5:1 for text, 3:1 for UI components
- ARIA labels for dynamic content updates

## Component Library

- Primary: shadcn/ui (Radix UI primitives + Tailwind styling)
- Charts: Recharts, Lightweight Charts
- Animation: Framer Motion
- Forms: React Hook Form + Zod validation
- State: Zustand for global state, React Query for server state

## Theme Strategy

- Default: Dark theme (as specified in Color System)
- Light theme: Invert colors while maintaining contrast ratios
- Theme persistence: localStorage with system preference fallback
- CSS variables for all theme tokens to enable runtime switching

## Performance Guidelines

- Component lazy loading for routes
- Image optimization with next/image
- Code splitting at route level
- Bundle size monitoring: <200KB initial JS
- Lighthouse score targets: Performance 90+, Accessibility 100

## Agent Prompt Notes

- Build UIs with this document as the visual source of truth
- Keep component naming consistent with existing codebase naming
- Optimize for maintainability and accessibility first
