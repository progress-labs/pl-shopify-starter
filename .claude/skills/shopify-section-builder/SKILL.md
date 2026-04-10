---
name: shopify-section-builder
description: "Build new Shopify OS 2.0 Liquid sections that integrate with a custom island-hydration theme using Tailwind CSS 4 and Web Components. Use this skill whenever the user wants to create a new theme section, convert/port a section from another Shopify theme (like Dawn), rebuild a section from a Figma design, or generate section schema with blocks. Also trigger when the user pastes Liquid code from another theme and wants it adapted, asks to build a section from a Figma link or design context, mentions needing a new section with schema settings, or references building components for their Shopify starter theme. Covers the full output - Liquid markup, JSON schema, island JS files, and scoped CSS. Even if the user just says 'build me a hero section' or 'port this from Dawn,' this skill applies."
---

# Shopify Section Builder

Build production-ready Shopify OS 2.0 sections that slot cleanly into a custom theme built on Tailwind CSS 4 with an island-based hydration system using Web Components.

## Before you start

Read the reference files relevant to your task:

- **Always read**: `references/section-patterns.md` — Section anatomy, schema presets, and Liquid structure
- **If input is from Figma**: `references/figma-workflow.md` — How to extract design context and translate it
- **If input is an existing Liquid file**: `references/conversion-workflow.md` — How to analyze and rebuild from another theme
- **If the section needs interactivity**: `references/islands.md` — Island Web Component patterns and hydration directives

## Input Sources

Every section build starts from one of two places:

### 1. Figma Design
The user provides a Figma link or node. Use the Figma MCP tools (`get_design_context`, `get_screenshot`) to extract layout, spacing, typography, and color information. Then translate that into Liquid + Tailwind markup. Read `references/figma-workflow.md` for the full process.

### 2. Existing Code
The user provides Liquid code from another theme (Dawn, a client theme, a marketplace theme). Analyze the markup, extract the intent and content structure, then rebuild it from scratch using this theme's conventions. Don't port line-by-line — understand what the section does, then build it the right way. Read `references/conversion-workflow.md`.

## Output Checklist

Every section build produces some or all of these files:

1. **Liquid section file** → `sections/<section-name>.liquid`
2. **Island JS file** (if interactive) → `frontend/islands/<island-name>.js`
3. **CSS** (if component-scoped styles are needed beyond Tailwind utilities) → added to `frontend/styles/components/` or inlined
4. **JSON template update** (if the user specifies where it goes) → guidance on which `templates/*.json` to update

Always confirm the file paths with the user before writing.

## Section Anatomy

Every section follows this structure:

```liquid
{%- comment -%}
  Section: <Name>
  Description: <What it does>
{%- endcomment -%}

{%- liquid
  assign section_width = section.settings.section_width
  assign padding_top = section.settings.padding_top
  assign padding_bottom = section.settings.padding_bottom
-%}

{% capture padding_classes %}
  {%- case padding_top -%}
    {%- when 'small' -%}pt-8 md:pt-12
    {%- when 'medium' -%}pt-12 md:pt-20
  {%- endcase -%}
  {%- case padding_bottom -%}
    {%- when 'small' -%}pb-8 md:pb-12
    {%- when 'medium' -%}pb-12 md:pb-20
  {%- endcase -%}
{% endcapture %}

<section id="section-{{ section.id }}" class="{{ padding_classes | strip }}">
  {% if section_width == 'contained' %}
    <div class="container mx-auto px-4">
  {% endif %}

  {%- comment -%} Section content here {%- endcomment -%}

  {% if section_width == 'contained' %}
    </div>
  {% endif %}
</section>

{% schema %}
{
  "name": "Section Name",
  "tag": "section",
  "settings": [
    ... section-specific settings ...
    ... standard layout presets (see below) ...
  ],
  "blocks": [],
  "presets": [
    {
      "name": "Section Name"
    }
  ]
}
{% endschema %}
```

## Standard Layout Settings

Every section includes these three settings at the end of its settings array. They use consistent keys and values across all sections in the theme:

```json
{
  "type": "select",
  "id": "section_width",
  "label": "Section width",
  "options": [
    { "value": "full", "label": "Full width" },
    { "value": "contained", "label": "Contained" }
  ],
  "default": "contained"
},
{
  "type": "select",
  "id": "padding_top",
  "label": "Top padding",
  "options": [
    { "value": "none", "label": "None" },
    { "value": "small", "label": "Small" },
    { "value": "medium", "label": "Medium" }
  ],
  "default": "medium"
},
{
  "type": "select",
  "id": "padding_bottom",
  "label": "Bottom padding",
  "options": [
    { "value": "none", "label": "None" },
    { "value": "small", "label": "Small" },
    { "value": "medium", "label": "Medium" }
  ],
  "default": "medium"
}
```

These are always the last three settings in any section schema. The Liquid that consumes them (the `padding_classes` capture and `section_width` conditional wrapper) is shown in the Section Anatomy above.

## Styling Rules

- Use **Tailwind CSS 4** utility classes directly in Liquid markup — this is the primary styling method
- Design tokens live as CSS custom properties in `frontend/styles/theme.css` — reference them with `var(--token-name)` when Tailwind utilities don't cover it
- Avoid inline `<style>` blocks unless there's a genuinely dynamic value that can only come from a Liquid variable (e.g., a merchant-chosen background color from a color picker setting)
- When a dynamic Liquid value must influence a style, use a CSS custom property on the element: `style="--bg-color: {{ section.settings.bg_color }}"` and reference it in a utility or minimal scoped style
- No external CSS frameworks or libraries beyond what the theme already bundles
- Path alias `@/*` and `~/*` both resolve to `frontend/*`

## Schema Best Practices

Read `references/section-patterns.md` for the full schema reference. Key points:

- Use `header` type settings to organize the customizer UI into logical groups
- Do NOT create separate alt text settings for images — Shopify's `image_picker` objects include alt text (accessible via `image.alt`) that merchants can edit in the media library
- Use `info` properties on settings to guide merchants: explain what a setting does in plain language
- Blocks should have a `limit` when it makes sense (e.g., slides, testimonials)
- Always include a `presets` array so the section appears in the theme editor's "Add section" menu
- Use sensible defaults — the section should look good out of the box with zero merchant configuration

## Interactivity

When a section needs client-side behavior (tabs, sliders, accordions, cart interactions, modals), create an island Web Component. Read `references/islands.md` for the full pattern. The short version:

- Create a JS file in `frontend/islands/`
- The class extends `HTMLElement` and registers with `customElements.define()`
- Add the appropriate hydration directive in Liquid: `client:idle`, `client:visible`, or `client:media`
- The hydration engine (`lib/revive.js`) handles lazy loading — you don't import islands manually

## Shopify Liquid Conventions

- Use `{%- -%}` (whitespace-trimmed tags) for logic and assignments
- Use `{{ }}` for output
- Prefer `{% render 'snippet' %}` over `{% include %}` — render is sandboxed and preferred in OS 2.0
- Access section settings via `section.settings.<id>`
- Access block settings via `block.settings.<id>` inside `{% for block in section.blocks %}`
- Always add `{{ block.shopify_attributes }}` to block wrapper elements for theme editor live preview
- Use `{% schema %}` at the bottom of every section file — it's required and defines the section's settings, blocks, and presets
- Leverage Shopify's image CDN filters: `| image_url: width: 800 | image_tag` for responsive images
- Use `srcset` with multiple widths for responsive images when the design calls for it
