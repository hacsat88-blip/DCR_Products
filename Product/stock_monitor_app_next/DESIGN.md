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

## Responsive Rules

- Collapse side panels below 1024px
- Convert dense tables to card rows below 768px
- Preserve keyboard access across all breakpoints

## Agent Prompt Notes

- Build UIs with this document as the visual source of truth
- Keep component naming consistent with existing codebase naming
- Optimize for maintainability and accessibility first
