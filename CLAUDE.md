# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Build and run the extension in development mode:
```bash
pnpm dev              # Chrome (default)
pnpm dev:firefox      # Firefox
pnpm dev:edge         # Edge
pnpm dev:safari       # Safari
```

Build for production:
```bash
pnpm build            # Chrome (default)
pnpm build:firefox    # Firefox
pnpm build:edge       # Edge
pnpm build:safari     # Safari
```

Create packaged extension:
```bash
pnpm zip              # All browsers
pnpm zip:chrome       # Chrome only
pnpm zip:firefox      # Firefox only
pnpm zip:edge         # Edge only
pnpm zip:safari       # Safari only
```

Type checking:
```bash
pnpm compile
```

## Architecture Overview

This is a modern browser extension template using WXT (Web Extension Toolkit) with a sidepanel UI. The extension architecture consists of:

1. **Entry Points** (`/entrypoints/`):
   - `background.ts`: Manages sidepanel lifecycle and browser action clicks
   - `sidepanel/`: Contains the main React application
   - `content.ts`: Minimal content script (only targets Google)

2. **State Management**:
   - Uses custom hooks with WXT storage API for persistent settings
   - Three storage namespaces: `appearance`, `system`, `ui`
   - Settings are stored locally and synchronized across extension lifecycle

3. **Theme System**:
   - Supports system/light/dark themes via `use-theme.ts` hook
   - Uses CSS variables with oklch color space for theming
   - Theme preference is persisted and applied on startup

4. **UI Components**:
   - Built with shadcn/ui components and Radix UI primitives
   - Three main tabs: Home, Profile, Settings
   - All components are in `/components/ui/` and follow shadcn/ui patterns

5. **Configuration**:
   - Runtime config in `app.config.ts` with TypeScript module augmentation
   - WXT config in `wxt.config.ts` handles extension manifest generation
   - Tailwind CSS 4.0 configuration in `assets/tailwind.css`

## Key Technical Details

- **Framework**: WXT + React 19 + TypeScript + Tailwind CSS 4.0
- **Extension Type**: Sidepanel (not popup) - opens in browser sidebar
- **Browser Support**: Chrome, Firefox, Edge, Safari (via WXT)
- **Storage**: Uses WXT storage API (`wxt/storage`) for persistent settings
- **Icons**: Uses Lucide React for consistent iconography
- **Styling**: Tailwind CSS 4.0 with @tailwindcss/vite for JIT compilation

## Important Patterns

1. **Adding New Components**: Use shadcn/ui CLI or follow existing patterns in `/components/ui/`
2. **Settings Storage**: Use the `useSettings` hook to persist user preferences
3. **Theme Integration**: Use the `useTheme` hook and follow the CSS variable patterns
4. **Type Safety**: All configuration and settings have TypeScript interfaces
5. **Extension APIs**: Use WXT's auto-imports for browser APIs (no need to import `browser`)

## Development Notes

- The extension uses a sidepanel UI, not a popup - it opens in the browser's sidebar
- Hot reload is enabled in development mode for rapid iteration
- The background script handles all sidepanel management logic
- Settings are persisted using WXT's storage API with proper TypeScript types
- All UI components follow shadcn/ui patterns for consistency