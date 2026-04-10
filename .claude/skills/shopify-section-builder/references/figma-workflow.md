# Figma-to-Section Workflow

How to translate a Figma design into a Liquid section for this theme.

---

## Step 1: Extract Design Context

Use the Figma MCP tools to understand the design:

1. **`get_design_context`** — Extracts layout structure, spacing, typography, colors, and component hierarchy from a Figma node. This is your primary source of truth for what to build.
2. **`get_screenshot`** — Captures a visual screenshot of the design. Use this to see the overall composition and verify your understanding of the layout.

Start with `get_design_context` on the section-level frame. If the section contains complex sub-components (a product card, a custom button), run `get_design_context` on those individually to get their details.

## Step 2: Analyze the Design

From the design context, extract:

- **Layout type**: Is it a single column, two-column, grid, or stacked layout?
- **Spacing values**: Map Figma spacing to Tailwind spacing scale (e.g., 32px → `gap-8`, 16px → `gap-4`)
- **Typography**: Map font sizes to Tailwind classes (`text-sm`, `text-lg`, `text-3xl`, etc.). Note weight, line height, letter spacing.
- **Colors**: Identify which colors are theme tokens (map to CSS custom properties) vs. one-off values
- **Breakpoints**: Identify what changes between mobile and desktop (column count, font size, visibility, layout direction)
- **Content types**: What's dynamic (merchant-editable) vs. structural (hardcoded in Liquid)
- **Interactivity**: Anything that needs JS — hover states beyond CSS, sliders, toggles, animations

## Step 3: Map to Section Architecture

Decide what becomes:
- **Section settings**: Content that the merchant edits once per section (heading, background color, layout choice)
- **Block settings**: Content that repeats and is reorderable (slides, features, team members, FAQs)
- **Hardcoded markup**: Structural elements that don't change (grid wrapper, decorative elements)

Rule of thumb: If the design shows 3+ instances of similar content (cards, slides, list items), those are blocks. If something appears once and is clearly editable (a headline, a CTA), it's a section setting.

## Step 4: Translate Figma Spacing to Tailwind

Figma uses absolute pixel values. Map them to Tailwind's spacing scale:

| Figma (px) | Tailwind | Rem |
|------------|---------|-----|
| 4 | 1 | 0.25 |
| 8 | 2 | 0.5 |
| 12 | 3 | 0.75 |
| 16 | 4 | 1 |
| 20 | 5 | 1.25 |
| 24 | 6 | 1.5 |
| 32 | 8 | 2 |
| 40 | 10 | 2.5 |
| 48 | 12 | 3 |
| 64 | 16 | 4 |
| 80 | 20 | 5 |
| 96 | 24 | 6 |

For values between these stops, round to the nearest Tailwind value. Pixel-perfect matching to Figma is less important than consistent use of the spacing scale.

## Step 5: Translate Figma Typography to Tailwind

| Figma size | Tailwind class | Size |
|------------|---------------|------|
| 12px | text-xs | 0.75rem |
| 14px | text-sm | 0.875rem |
| 16px | text-base | 1rem |
| 18px | text-lg | 1.125rem |
| 20px | text-xl | 1.25rem |
| 24px | text-2xl | 1.5rem |
| 30px | text-3xl | 1.875rem |
| 36px | text-4xl | 2.25rem |
| 48px | text-5xl | 3rem |
| 60px | text-6xl | 3.75rem |

Font weight mapping: Thin→100, Light→300, Regular→400, Medium→500, SemiBold→600, Bold→700, ExtraBold→800, Black→900.

## Step 6: Build the Section

Follow the section anatomy from SKILL.md:
1. Start with the standard section wrapper (padding classes, contained/full width)
2. Build the layout with Tailwind grid or flex
3. Add responsive breakpoints (`md:`, `lg:` prefixes)
4. Map editable content to section/block settings
5. Create the schema with appropriate setting types
6. Add the standard layout settings (section_width, padding_top, padding_bottom) at the end
7. If interactivity is needed, create the island JS file

## General Principles

- Don't try to replicate every pixel from Figma — translate the design intent into the theme's existing patterns
- Use the theme's design tokens wherever possible instead of hardcoding values
- If a Figma component maps to an existing snippet in the theme, use `{% render %}` to include it
- When in doubt about whether something is a setting or hardcoded, make it a setting — merchants appreciate flexibility
- Test the section's appearance with no content filled in (empty state) — it should still look reasonable or show helpful placeholder messaging
