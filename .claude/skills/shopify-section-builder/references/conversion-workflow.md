# Code Conversion Workflow

How to rebuild a section from another Shopify theme (Dawn, a marketplace theme, a client's old theme) to fit this theme's architecture.

---

## Step 1: Analyze the Source Section

Read the provided Liquid file and identify:

- **Purpose**: What does the section do? (hero banner, product grid, FAQ, etc.)
- **Settings**: What's configurable? List every setting with its type and purpose.
- **Blocks**: Are there repeatable content units? What fields do they have?
- **JavaScript**: Does the source use JS? What does it do? (slider, accordion, cart interaction)
- **CSS**: How is it styled? Inline styles, a dedicated CSS file, CSS classes?
- **Dependencies**: Does it reference snippets, assets, or libraries not included in the source?

Don't get attached to the source code's structure. The goal is to understand *what* the section does, not *how* it's currently built.

## Step 2: Identify What to Keep vs. Rebuild

**Keep (adapt to our conventions):**
- The content structure and merchant-facing settings
- The responsive behavior intent (what changes at breakpoints)
- Block types and their fields
- Any Shopify API interactions (cart, product data, etc.)

**Rebuild from scratch:**
- All markup — rewrite in semantic HTML with Tailwind classes
- All styling — replace CSS files/inline styles with Tailwind utilities
- All JavaScript — rebuild as island Web Components if interactivity is needed
- Schema — restructure with our standard layout settings appended

**Drop:**
- Theme-specific CSS classes from the source theme
- References to the source theme's snippet library (we have our own)
- Deprecated Liquid patterns (`{% include %}`, `{% assign %}` in certain contexts)
- Inline `<style>` and `<script>` tags (unless truly necessary for dynamic values)

## Step 3: Map Source Settings to Our Schema

Review each source setting and decide:

1. **Is it still relevant?** Some settings exist because of the source theme's limitations. If Tailwind handles it natively, the setting may be unnecessary.
2. **Does the type match?** The source might use a `text` setting where `select` makes more sense, or vice versa.
3. **Does it need restructuring?** Some source themes put too many options at the section level that should be block settings, or vice versa.

Common conversions:
- Source uses a custom CSS class setting for colors → Replace with `color` or `color_scheme` type
- Source uses pixel values for spacing → Replace with our standard padding presets (none/small/medium)
- Source uses a layout toggle (e.g., "image left/right") → Keep as a `select` setting
- Source has separate mobile/desktop image settings → Keep — this is good practice

## Step 4: Rebuild the Section

Follow this order:

1. **Write the schema first.** Define settings and blocks based on your analysis. Include our standard layout settings at the end.
2. **Build the Liquid markup.** Start with the section wrapper from the Section Anatomy template, then build the content structure.
3. **Style with Tailwind.** Translate the visual layout into utility classes. Don't reference the source CSS.
4. **Create the island** (if needed). If the source section uses JavaScript, create a new island that provides the same interactivity using our Web Component pattern.

## Step 5: Handle Common Source Patterns

### Dawn-specific patterns

Dawn sections often use:
- `color_scheme` settings with `color-{{ scheme }}` classes → adapt to your theme's color token system or keep if your theme supports color schemes
- `section-{{ section.id }}-padding` style tags for dynamic spacing → replace with our standard padding presets
- `animate-on-scroll` classes → drop unless your theme has its own scroll animation system
- `{% render 'icon-arrow' %}` and other Dawn snippets → replace with your theme's equivalent or inline SVGs

### Marketplace theme patterns

- Heavy use of inline `<style>` with Liquid variables → extract the dynamic values, apply the rest with Tailwind
- Custom JavaScript in `<script>` tags at the bottom → rebuild as an island
- jQuery dependencies → rewrite in vanilla JS
- Complex option selectors → simplify where possible

### Legacy theme patterns

- `{% include %}` → change to `{% render %}`
- `{% capture %}` for complex markup → often can be simplified with modern Liquid
- Asset pipeline references (`{{ 'section.css' | asset_url | stylesheet_tag }}`) → drop, styling comes from Tailwind
- `{{ 'section.js' | asset_url | script_tag }}` → drop, interactivity comes from islands

## Checklist Before Delivering

- [ ] Schema includes all merchant-configurable settings from the source
- [ ] Standard layout settings (section_width, padding_top, padding_bottom) are at the end of settings
- [ ] Schema has `presets` so the section appears in the theme editor
- [ ] All images use Shopify CDN filters with responsive widths
- [ ] All images have alt text via the image object's `.alt` property (no separate alt text settings)
- [ ] Blocks include `{{ block.shopify_attributes }}` on their wrapper element
- [ ] No references to source theme's CSS classes, snippets, or JS files
- [ ] No inline `<style>` blocks (unless truly needed for dynamic Liquid values)
- [ ] No inline `<script>` tags — interactivity uses islands
- [ ] Section looks reasonable with default settings (good defaults in schema)
- [ ] Section is accessible (semantic HTML, heading hierarchy, focus styles)
