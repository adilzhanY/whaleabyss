# Design System Documentation

This document defines the design system for Whale Abyss website. All components and pages should follow these guidelines to maintain visual consistency.

---

## 1. Layout & Spacing

### Container Widths

The website uses a three-tier container system based on content type:

| Container Class | Width | Use Case | Pages |
|----------------|-------|----------|-------|
| `max-w-7xl` | 1280px | Wide content, catalogs, grids | `/services`, `/events`, Home hero |
| `max-w-6xl` | 1152px | Standard content pages | `/cart`, `/orders`, `/service/[slug]` |
| `max-w-4xl` | 896px | Text-heavy, legal documents | `/profile`, `/info`, `/payment`, `/privacy`, `/public_offer` |
| `max-w-[50rem]` | 800px | Narrow text content | `/faq`, `/about` |

**Standard Pattern:**
```tsx
<main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-8">
  {/* Content */}
</main>
```

### Horizontal Padding

- **Mobile**: `px-4` (1rem / 16px)
- **Desktop**: `sm:px-6` (1.5rem / 24px)
- Always use responsive padding: `px-4 sm:px-6`

### Vertical Spacing

**Main Content Area:**
- Top padding: `pt-24` (6rem / 96px) - accounts for fixed header
- Bottom padding: `pb-8` (2rem / 32px) for standard pages, `pb-16` (4rem / 64px) for longer pages, `pb-20` (5rem / 80px) for full-height pages

**Section Spacing:**
- Between sections: `mb-8` (2rem), `mb-12` (3rem) for major sections
- Between elements: `gap-4` (1rem), `gap-6` (1.5rem), `gap-8` (2rem)

### Spacing Scale

Most commonly used spacing values:
- `gap-2` (0.5rem / 8px) - tight spacing
- `gap-3` (0.75rem / 12px) - compact spacing
- `gap-4` (1rem / 16px) - standard spacing
- `gap-6` (1.5rem / 24px) - comfortable spacing
- `gap-8` (2rem / 32px) - loose spacing

**Padding Scale:**
- `p-2` / `p-3` / `p-4` - small components
- `p-6` - medium cards
- `p-8` - large cards
- `p-12` - hero sections

---

## 2. Typography

### Font Families

Defined in `app/layout.tsx`:

```typescript
const primaryFont = Onest({
  variable: "--font-primary",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
```

- **Primary Font**: Onest - Used for all UI text, body copy, and most headings
- **Display Font**: Space Grotesk - Used only for "Whale Abyss" brand mark in navbar

**Usage:**
```tsx
style={{ fontFamily: "var(--font-primary), sans-serif" }}
```

### Base Font Size

```css
html {
  font-size: 17.5px; /* Scales up all rem-based sizes globally by ~9.4% */
}
```

### Heading Hierarchy

**CRITICAL: All main page headers MUST be identical for visual harmony.**

#### H1 - Main Page Title (Standard Pattern)

**ALL pages must use this exact pattern:**

```tsx
<div className="mb-12 text-center">
  <h1 className="text-4xl sm:text-5xl font-black text-blue-950 mb-4" 
      style={{ fontFamily: "var(--font-primary), sans-serif" }}>
    Page Title
  </h1>
  {/* Optional description */}
  <p className="text-slate-600 max-w-2xl mx-auto">
    Page description text
  </p>
</div>
```

**Specifications:**
- **Size**: `text-4xl sm:text-5xl` (2.25rem → 2.8125rem / 39.375px → 49.2px)
- **Weight**: `font-black` (900)
- **Color**: `text-blue-950` (#172554)
- **Margin Bottom**: `mb-4` (1rem / 16px)
- **Alignment**: Always centered (`text-center`)
- **Font Family**: `var(--font-primary)` (Onest)
- **Container**: Wrapped in `<div className="mb-12 text-center">`
- **Description** (optional): `text-slate-600 max-w-2xl mx-auto`

**Why this matters:**
When users navigate between pages, the main title should feel identical in size, weight, and position. This creates visual harmony and professional consistency. `/services` and `/events` should look the same, `/cart` and `/orders` should look the same - all main page titles are equal.

**Examples:**
- ✅ `/services`: "Все услуги" - text-4xl sm:text-5xl font-black centered
- ✅ `/events`: "Активные события" - text-4xl sm:text-5xl font-black centered
- ✅ `/cart`: "Корзина" - text-4xl sm:text-5xl font-black centered
- ✅ `/orders`: "Мои заказы" - text-4xl sm:text-5xl font-black centered
- ✅ `/reviews`: "Отзывы клиентов" - text-4xl sm:text-5xl font-black centered
- ✅ `/faq`: "Часто задаваемые вопросы" - text-4xl sm:text-5xl font-black centered
- ✅ `/about`: "О нас" - text-4xl sm:text-5xl font-black centered
- ✅ `/privacy`: "Политика конфиденциальности" - text-4xl sm:text-5xl font-black centered

**Special Cases:**
- `/profile`: User name is displayed as H1 (dynamic content, not a page title)
- `/service/[slug]`: Service title overlaid on hero image (different layout pattern)

#### H2 - Section Headings

| Level | Size Class | Actual Size | Weight | Use Case |
|-------|-----------|-------------|--------|----------|
| H2 | `text-xl` or `text-2xl` | 1.25rem or 1.5rem | `font-bold` | Section headings |
| H3 | `text-lg` | 1.125rem | `font-semibold` | Subsection headings |

### Body Text

| Size Class | Actual Size | Use Case |
|-----------|-------------|----------|
| `text-sm` | 0.875rem (15.3px) | Default body text, descriptions, labels |
| `text-base` | 1rem (17.5px) | Emphasized body text, larger descriptions |
| `text-lg` | 1.125rem (19.7px) | Hero text, important descriptions |
| `text-xs` | 0.75rem (13.1px) | Small labels, badges, metadata |

### Font Weights

| Class | Weight | Use Case |
|-------|--------|----------|
| `font-black` | 900 | H1 headings, hero titles |
| `font-bold` | 700 | H2 headings, emphasis, legal titles |
| `font-semibold` | 600 | H3 headings, buttons, labels |
| `font-medium` | 500 | Body text emphasis, navigation |
| `font-normal` | 400 | Default body text |

---

## 3. Colors

### CSS Variables (defined in `globals.css`)

```css
:root {
  /* Backgrounds */
  --bg-main: #f8fafc;        /* Page background (slate-50) */
  --bg-card: #ffffff;        /* Card/component background */
  --bg-highlight: #eef2ff;   /* Hover/focus states (indigo-50) */

  /* Text */
  --text-primary: #0f172a;   /* Primary text (slate-900) */
  --text-secondary: #64748b; /* Secondary text (slate-500) */
  --text-price: #1e3a8a;     /* Price text (blue-800) */

  /* Accents */
  --accent-primary: #1e3a8a;       /* Primary brand color (blue-800) */
  --accent-primary-hover: #172554; /* Hover state (blue-950) */
  --accent-icon: #1e3a8a;          /* Icon color */
  --accent-border: #e2e8f0;        /* Border color (slate-200) */
}
```

### Tailwind Color Usage

**Text Colors:**
- `text-blue-950` (#172554) - Primary headings (16 uses)
- `text-slate-800` (#1e293b) - Alternative headings (11 uses)
- `text-slate-600` (#475569) - Secondary text (74 uses)
- `text-slate-500` (#64748b) - Tertiary text, placeholders (93 uses)
- `text-slate-400` (#94a3b8) - Disabled text, icons (19 uses)

**Semantic Colors:**
- Success: `text-green-600`, `bg-green-100`
- Error: `text-red-600`, `bg-red-100`
- Warning: `text-amber-500`, `bg-amber-100`
- Info: `text-blue-600`, `bg-blue-100`

**Standard Pattern:**
```tsx
style={{ color: "var(--text-primary)" }}
style={{ color: "var(--text-secondary)" }}
```

---

## 4. Shadows

### Shadow System

Defined in `globals.css` with layered approach:

```css
/* Input fields (recessed) */
--shadow-input:
  inset 0 1px 2px rgba(15, 23, 42, 0.06),
  0 1px 0 rgba(255, 255, 255, 0.8);

/* Cards */
--shadow-card:
  0 1px 2px rgba(15, 23, 42, 0.04),
  0 2px 4px rgba(15, 23, 42, 0.04),
  0 4px 12px rgba(15, 23, 42, 0.06);

--shadow-card-hover:
  0 4px 6px rgba(15, 23, 42, 0.06),
  0 12px 24px rgba(15, 23, 42, 0.1),
  0 0 0 1px rgba(30, 58, 138, 0.08);

/* Buttons */
--shadow-btn:
  inset 0 1px 0 rgba(255, 255, 255, 0.9),
  0 1px 2px rgba(15, 23, 42, 0.08),
  0 2px 6px rgba(15, 23, 42, 0.06);

--shadow-btn-primary:
  inset 0 1px 0 rgba(255, 255, 255, 0.25),
  inset 0 -1px 0 rgba(0, 0, 0, 0.15),
  0 1px 2px rgba(30, 58, 138, 0.4),
  0 4px 12px rgba(30, 58, 138, 0.28);

/* Glass effect */
--shadow-glass:
  inset 0 1px 0 rgba(255, 255, 255, 0.8),
  0 4px 12px rgba(30, 58, 138, 0.06),
  0 16px 40px rgba(15, 23, 42, 0.08);
```

### Tailwind Shadow Classes

- `shadow-sm` - Subtle card shadow
- `shadow` - Default shadow
- `shadow-lg` - Elevated elements
- `shadow-xl` - Modals, popovers

---

## 5. Border Radius

### Radius Scale

| Class | Size | Use Case |
|-------|------|----------|
| `rounded-xl` | 0.75rem (12px) | Most common - buttons, inputs, small cards (150 uses) |
| `rounded-2xl` | 1rem (16px) | Medium cards, panels (39 uses) |
| `rounded-3xl` | 1.5rem (24px) | Large cards, hero sections (36 uses) |
| `rounded-lg` | 0.5rem (8px) | Small components, badges (44 uses) |
| `rounded-full` | 9999px | Circular elements, avatars, pills (30 uses) |

**CSS Variables:**
```css
--card-radius: 1rem;  /* 16px - rounded-2xl */
--btn-radius: 0.5rem; /* 8px - rounded-lg */
```

**Standard Pattern:**
- Buttons: `rounded-xl` or `rounded-lg`
- Cards: `rounded-2xl` or `rounded-3xl`
- Inputs: `rounded-xl` or `rounded-lg`

---

## 6. Components

### Buttons

Defined as CSS classes in `globals.css`:

**Primary Button:**
```tsx
<button className="btn-primary">
  Button Text
</button>
```

Properties:
- Padding: `0.625rem 1.25rem` (10px 20px)
- Border radius: `0.875rem` (14px)
- Background: `var(--accent-primary)` (#1e3a8a)
- Font weight: 600
- Shadow: `var(--shadow-btn-primary)`
- Hover: Lifts up 1px, enhanced shadow

**Secondary Button:**
```tsx
<button className="btn-secondary">
  Button Text
</button>
```

Properties:
- Same padding and radius as primary
- Background: `var(--bg-card)` (white)
- Border: `1px solid var(--accent-border)`
- Color: `var(--text-primary)`
- Hover: Background changes to `var(--bg-highlight)`

**Icon Button:**
```tsx
<button className="btn-icon">
  <Icon />
</button>
```

Properties:
- Size: `2.5rem × 2.5rem` (40px × 40px)
- Border radius: `0.875rem`
- Hover: Scales to 1.06

### Input Fields

```tsx
<input className="input-field" />
```

Properties:
- Padding: `0.625rem 0.875rem` (10px 14px)
- Border radius: `0.75rem` (12px)
- Border: `1px solid var(--accent-border)`
- Shadow: `var(--shadow-input)`
- Focus: Blue ring with 3px offset

### Cards

**Raised Card:**
```tsx
<div className="card-raised">
  {/* Content */}
</div>
```

Properties:
- Background: `var(--bg-card)`
- Border: `1px solid var(--accent-border)`
- Border radius: `var(--card-radius)` (1rem)
- Shadow: `var(--shadow-card)`
- Hover: Lifts up 2px, enhanced shadow

**Glass Panel:**
```tsx
<div className="glass-panel">
  {/* Content */}
</div>
```

Properties:
- Backdrop filter: `blur(60px) saturate(200%) brightness(1.06)`
- Background: `rgba(255, 255, 255, 0.78)`
- Border: `1px solid rgba(255, 255, 255, 0.75)`
- Gradient overlay for "liquid glass" effect

---

## 7. Responsive Breakpoints

Tailwind default breakpoints:

| Prefix | Min Width | Use Case |
|--------|-----------|----------|
| `sm:` | 640px | Small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large desktops |

**Common Patterns:**
- Padding: `px-4 sm:px-6`
- Text size: `text-2xl sm:text-3xl`
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Flex direction: `flex-col sm:flex-row`

---

## 8. Animation & Transitions

### Keyframes

Defined in `globals.css`:

- `fadeIn` / `fadeOut` - Opacity transitions
- `slideDownFadeIn` / `slideUpFadeOut` - Dropdown menus
- `scaleIn` / `scaleOut` - Modals
- `slideIn` / `slideInLeft` - Side panels

### Transition Classes

```css
.dropdown-enter { animation: slideDownFadeIn 0.2s ease-out forwards; }
.dropdown-exit { animation: slideUpFadeOut 0.15s ease-in forwards; }
.backdrop-enter { animation: fadeIn 0.2s ease-out forwards; }
.backdrop-exit { animation: fadeOut 0.2s ease-in forwards; }
.modal-enter { animation: scaleIn 0.25s ease-out forwards; }
.modal-exit { animation: scaleOut 0.2s ease-in forwards; }
```

### Standard Transitions

```tsx
transition-colors duration-200
transition-transform duration-200
transition-all duration-300
```

---

## 9. Current Inconsistencies (To Be Fixed)

### ✅ FIXED - Container Widths
- ✅ `/services` now uses `max-w-7xl` (1280px)
- ✅ `/events` uses `max-w-7xl` (1280px)
- ✅ `/service/[slug]` uses `max-w-6xl` without inline styles

### ✅ FIXED - Typography
- ✅ All H1 headers now use `text-4xl sm:text-5xl font-black text-blue-950`
- ✅ All headers are centered with consistent `mb-4` spacing
- ✅ Legal pages now use `font-black` instead of `font-bold`
- ✅ All pages follow the standard H1 pattern

### ✅ FIXED - Spacing
- ✅ All pages use `px-4 sm:px-6` for horizontal padding
- ✅ Consistent `pt-24` for top padding (accounts for fixed header)
- ✅ Header containers use `mb-12` consistently

---

## 10. Design Tokens Reference

### Quick Reference Table

| Token | Value | Usage |
|-------|-------|-------|
| Container (Wide) | `max-w-7xl` (1280px) | Catalogs, grids |
| Container (Standard) | `max-w-6xl` (1152px) | Most pages |
| Container (Narrow) | `max-w-4xl` (896px) | Text content |
| H1 (Large) | `text-4xl font-black` | Catalog pages |
| H1 (Standard) | `text-3xl font-black` | Most pages |
| Body Text | `text-sm` | Default |
| Primary Color | `#1e3a8a` (blue-800) | Brand |
| Text Primary | `#0f172a` (slate-900) | Headings |
| Text Secondary | `#64748b` (slate-500) | Body |
| Border Radius (Card) | `rounded-2xl` (1rem) | Cards |
| Border Radius (Button) | `rounded-xl` (0.75rem) | Buttons |
| Spacing (Standard) | `gap-4` (1rem) | Elements |
| Spacing (Section) | `mb-8` (2rem) | Sections |

---

## 11. Implementation Guidelines

### When Creating a New Page

1. **Choose container width** based on content type:
   - Catalog/grid → `max-w-7xl`
   - Standard content → `max-w-6xl`
   - Text-heavy → `max-w-4xl`

2. **Use standard main structure:**
   ```tsx
   <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-8">
     <Breadcrumb />
     <h1 className="text-3xl font-black text-blue-950 mb-8" 
         style={{ fontFamily: "var(--font-primary), sans-serif" }}>
       Page Title
     </h1>
     {/* Content */}
   </main>
   ```

3. **Use CSS variables** for colors:
   ```tsx
   style={{ color: "var(--text-primary)" }}
   style={{ backgroundColor: "var(--bg-card)" }}
   ```

4. **Use design system classes** for components:
   - Buttons: `.btn-primary`, `.btn-secondary`, `.btn-icon`
   - Inputs: `.input-field`
   - Cards: `.card-raised`, `.glass-panel`

5. **Follow spacing scale:**
   - Between elements: `gap-4`
   - Between sections: `mb-8` or `mb-12`
   - Card padding: `p-6` or `p-8`

### Code Review Checklist

- [ ] Container width matches page type
- [ ] Responsive padding: `px-4 sm:px-6`
- [ ] H1 uses `text-3xl font-black` (or `text-4xl` for catalogs)
- [ ] Colors use CSS variables or consistent Tailwind classes
- [ ] Border radius follows scale: `rounded-xl`, `rounded-2xl`, `rounded-3xl`
- [ ] Spacing uses standard scale: `gap-4`, `mb-8`, `p-6`
- [ ] Font family explicitly set: `style={{ fontFamily: "var(--font-primary), sans-serif" }}`
- [ ] Breadcrumb component included (except homepage)

---

**Last Updated:** 2026-05-17  
**Version:** 1.0
