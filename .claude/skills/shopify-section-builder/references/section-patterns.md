# Section Patterns Reference

Comprehensive reference for Shopify OS 2.0 section schema, settings types, blocks, and common section patterns.

## Table of Contents

1. [Schema Structure](#schema-structure)
2. [Settings Types](#settings-types)
3. [Blocks](#blocks)
4. [Common Section Patterns](#common-section-patterns)
5. [Responsive Images](#responsive-images)
6. [Accessibility](#accessibility)

---

## Schema Structure

The `{% schema %}` tag is valid JSON that defines everything about a section's customizer interface:

```json
{
  "name": "Human-readable name",
  "tag": "section",
  "settings": [],
  "blocks": [],
  "max_blocks": 16,
  "presets": [
    {
      "name": "Preset name",
      "settings": {},
      "blocks": []
    }
  ],
  "templates": ["404", "article", "blog", "cart", "collection", "list-collections", "index", "page", "product", "search"],
  "enabled_on": {
    "templates": ["index"],
    "groups": ["header", "footer"]
  },
  "disabled_on": {
    "groups": ["header", "footer"]
  }
}
```

Key rules:
- `name` is required — this is what merchants see in the theme editor
- `tag` defaults to `div` — use `section` for semantic HTML
- Do not include `class` in the schema unless specifically needed — it adds unnecessary noise
- Do not include `limit` unless the section genuinely should only appear once (e.g., header, footer) — omit for unlimited
- `presets` make the section available in the "Add section" picker — without this, the section can only be used if hardcoded in a JSON template
- `enabled_on` and `disabled_on` are mutually exclusive — use one or neither
- `templates` in `enabled_on`/`disabled_on` restricts which page types the section appears on
- `groups` controls header/footer availability

---

## Settings Types

### Input Settings

| Type | Use for | Liquid access |
|------|---------|---------------|
| `text` | Short single-line text | `{{ section.settings.id }}` |
| `textarea` | Multi-line text, descriptions | `{{ section.settings.id }}` |
| `richtext` | Formatted text with bold/italic/links | `{{ section.settings.id }}` (returns HTML) |
| `inline_richtext` | Formatted text without wrapping `<p>` | `{{ section.settings.id }}` |
| `number` | Numeric values | `{{ section.settings.id }}` |
| `range` | Slider with min/max/step | `{{ section.settings.id }}` |
| `checkbox` | Boolean toggle | `{% if section.settings.id %}` |
| `select` | Dropdown with predefined options | `{{ section.settings.id }}` (returns option value) |
| `radio` | Radio buttons (2-5 options) | `{{ section.settings.id }}` |

### Specialized Settings

| Type | Use for | Liquid access |
|------|---------|---------------|
| `image_picker` | Image uploads | `{{ section.settings.id \| image_url: width: 800 }}` |
| `url` | Any URL (internal or external) | `{{ section.settings.id }}` |
| `video` | Shopify-hosted video | `{{ section.settings.id \| video_tag }}` |
| `video_url` | YouTube/Vimeo embed URLs | `{{ section.settings.id.type }}` / `.id` |
| `color` | Color picker (hex) | `{{ section.settings.id }}` |
| `color_scheme` | Theme color scheme picker | `class="color-{{ section.settings.id }}"` |
| `color_background` | Gradient-capable background color | `style="background: {{ section.settings.id }}"` |
| `font_picker` | Font selector from Shopify font library | `{{ section.settings.id.family }}` |
| `collection` | Collection picker | `{% for product in section.settings.id.products %}` |
| `collection_list` | Multiple collection picker | `{% for collection in section.settings.id %}` |
| `product` | Single product picker | `section.settings.id` (product object) |
| `product_list` | Multiple product picker | `{% for product in section.settings.id %}` |
| `blog` | Blog picker | `section.settings.id` (blog object) |
| `article` | Article picker | `section.settings.id` (article object) |
| `page` | Page picker | `section.settings.id` (page object) |
| `link_list` | Menu/navigation picker | `{% for link in section.settings.id.links %}` |
| `liquid` | Raw Liquid code input | `{{ section.settings.id }}` |
| `html` | Raw HTML input | `{{ section.settings.id }}` |

### Organizational Settings (no output value)

| Type | Use for |
|------|---------|
| `header` | Group heading in customizer sidebar |
| `paragraph` | Help text / instructions for merchants |

### Setting Definition Structure

```json
{
  "type": "text",
  "id": "heading",
  "label": "Heading",
  "default": "Welcome to our store",
  "placeholder": "Enter a heading...",
  "info": "This appears above the main content"
}
```

- `id` must be unique within the section (or within a block type)
- `label` is what the merchant sees
- `default` provides the initial value — always set sensible defaults
- `info` adds help text below the setting — use it to guide merchants
- `placeholder` adds ghost text to text inputs

---

## Blocks

Blocks are repeatable, reorderable content units within a section. Merchants add, remove, and rearrange them in the theme editor.

### Block Definition

```json
{
  "blocks": [
    {
      "type": "slide",
      "name": "Slide",
      "limit": 6,
      "settings": [
        {
          "type": "image_picker",
          "id": "image",
          "label": "Image"
        },
        {
          "type": "text",
          "id": "heading",
          "label": "Heading"
        }
      ]
    }
  ]
}
```

### Rendering Blocks in Liquid

```liquid
{%- for block in section.blocks -%}
  {%- case block.type -%}
    {%- when 'slide' -%}
      <div {{ block.shopify_attributes }}>
        {%- if block.settings.image != blank -%}
          {{
            block.settings.image
            | image_url: width: 1200
            | image_tag:
              loading: 'lazy',
              alt: block.settings.image.alt,
              class: 'w-full h-auto'
          }}
        {%- endif -%}
        {%- if block.settings.heading != blank -%}
          <h3>{{ block.settings.heading }}</h3>
        {%- endif -%}
      </div>
  {%- endcase -%}
{%- endfor -%}
```

Key rules:
- Always include `{{ block.shopify_attributes }}` on the block's outermost element — this enables live preview in the theme editor
- Use `{%- case block.type -%}` when a section has multiple block types
- Check for blank values before rendering: `{%- if block.settings.heading != blank -%}`
- Use `forloop.first` to set eager loading on above-the-fold images

### App Blocks

To allow third-party apps to inject content into your section, add `@app` to the blocks array:

```json
{
  "blocks": [
    { "type": "@app" },
    { "type": "slide", "name": "Slide", "settings": [...] }
  ]
}
```

Render app blocks with:
```liquid
{%- when '@app' -%}
  {% render block %}
```

---

## Common Section Patterns

### Hero / Banner

Settings: heading, subheading, image, button text, button URL, text alignment, overlay opacity
Blocks: usually none (or buttons as blocks for multiple CTAs)
Notes: Use `object-cover` for responsive background images. Consider `loading: 'eager'` for hero images since they're above the fold.

### Featured Collection / Product Grid

Settings: collection picker, heading, products per row, products to show
Blocks: none (products come from the collection)
Notes: Use CSS grid with Tailwind (`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`). Render product cards via a shared snippet.

### Rich Text / Content

Settings: heading, body (richtext), text alignment, max width
Blocks: none or multiple text/button blocks
Notes: Use `prose` class from Tailwind for richtext output to get good default typography.

### Image with Text

Settings: image, heading, body, button, layout (image left/right), vertical alignment
Blocks: none
Notes: Use CSS grid or flex for the two-column layout. Swap order with `order-first`/`order-last` based on layout setting.

### Slideshow / Carousel

Settings: autoplay, speed, transition style
Blocks: slides (image, heading, subheading, button)
Notes: This needs an island for interactivity. Create a carousel island with previous/next/dot navigation.

### FAQ / Accordion

Settings: heading, subheading
Blocks: items (question + answer)
Notes: Use a `<details>` element for no-JS baseline, enhanced with an island for smooth animations and single-open behavior.

### Testimonials

Settings: heading, layout (grid/slider)
Blocks: testimonial (quote, author, role, avatar)

### Newsletter / Email Signup

Settings: heading, subheading, placeholder text
Notes: Uses Shopify's `customer` form endpoint. Needs an island for AJAX submission.

---

## Responsive Images

Always use Shopify's image CDN for performance:

```liquid
{%- if section.settings.image != blank -%}
  {{
    section.settings.image
    | image_url: width: 1920
    | image_tag:
      loading: 'lazy',
      alt: section.settings.image.alt,
      widths: '375, 750, 1100, 1500, 1920',
      sizes: '100vw',
      class: 'w-full h-auto object-cover'
  }}
{%- endif -%}
```

For contained images with known max width:
```liquid
sizes: '(min-width: 1200px) 1100px, 100vw'
```

Rules:
- Set `loading: 'eager'` for above-the-fold images (hero, first visible section)
- Set `loading: 'lazy'` for everything else
- Always provide `alt` text via the image object's built-in `.alt` property (e.g., `section.settings.image.alt`) — do not create separate alt text settings
- Include a `widths` attribute with breakpoints matching the design
- Set `sizes` to match the actual rendered width at each breakpoint

---

## Accessibility

- Use semantic HTML: `<section>`, `<article>`, `<nav>`, `<figure>`, `<figcaption>`
- Headings should follow hierarchy — sections typically start at `<h2>` since `<h1>` is the page title
- All images need alt text — use the image object's `.alt` property, not a separate setting
- Interactive elements need focus styles (Tailwind's `focus-visible:` variant)
- Color contrast must meet WCAG AA (4.5:1 for body text, 3:1 for large text)
- Use `aria-label` or `aria-labelledby` on sections when the purpose isn't obvious from visible text
- Buttons should be `<button>` elements (not divs or spans with click handlers)
- Links should be `<a>` elements with valid `href`
