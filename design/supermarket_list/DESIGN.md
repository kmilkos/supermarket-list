---
name: SuperMarket List
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#ae0010'
  on-tertiary: '#ffffff'
  tertiary-container: '#d52022'
  on-tertiary-container: '#ffecea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  price-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  margin-mobile: 16px
  gutter: 12px
  touch-target-min: 44px
  container-padding: 16px
---

## Brand & Style

The design system focuses on utility, speed, and trust. As a price comparison tool, the UI must feel reliable and objective. The aesthetic is **Corporate Modern** with a strong emphasis on **Native-inspired patterns** (iOS/Android) to ensure immediate familiarity for users on the go. 

The target audience consists of budget-conscious shoppers who value efficiency. The emotional response should be one of clarity and "organization." By utilizing heavy whitespace, a clean light-gray background, and high-contrast status colors, the design system minimizes cognitive load during high-stress shopping environments.

## Colors

The palette is functional and semantic. 
- **Primary (Blue):** Used for primary actions, branding, and active navigation states.
- **Success (Green):** Indicates lower prices, "in stock" status, or successful list additions.
- **Danger (Red):** Used for price increases, "out of stock" alerts, and destructive actions (e.g., clearing a list).
- **Background & Surface:** A layered approach using #F8FAFC for the canvas and pure #FFFFFF for cards to create a crisp, readable hierarchy.

## Typography

**Inter** is selected for its exceptional legibility and comprehensive support for Greek characters, ensuring a seamless experience for local markets. The type system utilizes a systematic scale that prioritizes clarity over ornamentation.

- **Numerics:** For prices, use tabular figures (`tnum`) to ensure decimal points align vertically in lists and comparison grids.
- **Hierarchy:** Use `headline-md` for product names in cards and `price-lg` for the primary cost display. 
- **Mobile optimization:** Headlines are capped at 30px to prevent awkward line breaks on smaller devices.

## Layout & Spacing

This design system uses a **fluid, mobile-first grid**. The standard layout is a single column for lists and a 2-column grid for product discovery and supermarket browsing.

- **Touch Targets:** Every interactive element (buttons, checkboxes, list items) must maintain a minimum height/width of **44px** to comply with ergonomic standards.
- **Grid:** On mobile, use a 16px outer margin. In the 2-column product grid, use a 12px gutter.
- **Vertical Rhythm:** Use increments of 4px for all spacing (padding, margins) to maintain a strict visual beat.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and tonal contrast.

- **Level 0 (Background):** #F8FAFC. The foundation layer.
- **Level 1 (Cards/Surface):** Pure White (#FFFFFF) with a soft, diffused shadow: `0px 2px 8px rgba(15, 23, 42, 0.05)`. Used for product cards and supermarket tiles.
- **Level 2 (Floating/Modals):** Bottom-sheets and floating action buttons use a more pronounced shadow: `0px 8px 24px rgba(15, 23, 42, 0.12)`.
- **Level 3 (Overlay):** Scrim for bottom-sheets at 40% opacity (#0F172A).

## Shapes

The shape language is modern and approachable. 
- **Standard Radius:** 10px (`0.625rem`) is applied to all cards, buttons, and input fields.
- **Bottom Sheets:** Top corners are rounded at 16px, while bottom corners remain sharp as they anchor to the screen edge.
- **Progress Bars/Tags:** Use a fully rounded "pill" shape (999px) to distinguish them from interactive containers.

## Components

### Buttons
- **Primary:** Solid Blue background (#2563EB), White text, 48px height for maximum "thumb-ability."
- **Secondary:** Blue border (1.5px), transparent background, Blue text.

### Cards (2-Column Grid)
- **Product Card:** Image at top (aspect ratio 1:1), followed by product name (2 lines max), and price in bold.
- **Supermarket Card:** Logo, name, and "Distance" or "Total Savings" label.

### Navigation
- **Bottom Bar:** 5 tabs (Search, Lists, Compare, Deals, Profile). 56px height. Active state uses the Primary Blue for the icon and label.
- **Bottom Sheets:** Used for all "Filter" and "Sort" actions. Includes a 4px thick "grabber" handle at the top.

### Inputs & Selection
- **Search Bar:** Subtle gray border, 44px height, with a search icon prefix.
- **Checkboxes:** 24px x 24px with 4px corner radius. Primary Blue when checked.

### Lists
- Standard list items should have a minimum height of 64px to accommodate the 44px touch target plus padding.