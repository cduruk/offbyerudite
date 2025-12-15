# Off by One - Codebase Guide

Personal blog and essay site for Can Duruk, built with Astro. Site URL: https://justoffbyone.com

## Tech Stack

- **Astro 5** - Static site generator with islands architecture
- **React 19** - Interactive components via Astro islands
- **Tailwind CSS 4** - Styling with Flexoki color scheme
- **MDX** - Blog content with embedded components
- **TypeScript** - Full type safety
- **Vitest** - Unit testing

## Project Structure

```
src/
├── components/           # Astro and React components
│   ├── ui/              # React UI primitives (shadcn patterns, OG templates)
│   ├── poisson-interrupt/  # Interactive visualization components
│   └── hiring-pipeline/    # Hiring calculator components
├── content/
│   ├── blog/            # MDX posts (each in own directory with assets)
│   ├── authors/         # Author profiles
│   └── projects/        # Project showcase
├── layouts/             # Page layouts (Layout.astro)
├── lib/
│   ├── data-utils.ts    # Content collection helpers, TOC, reading time
│   └── utils.ts         # Shared utilities (cn, ensureTrailingSlash)
├── pages/               # File-based routing
│   ├── posts/           # Blog listing and detail pages
│   ├── tags/            # Tag listing and filtering
│   ├── authors/         # Author pages
│   └── tools/           # Interactive tools section
├── styles/              # CSS (global.css, typography.css)
└── consts.ts            # Site metadata, nav links, social links
scripts/                 # Build automation (OG images, new posts)
tests/                   # Vitest tests
```

## Key Files

| File | Purpose |
|------|---------|
| `src/consts.ts` | Site metadata, navigation, social links |
| `src/content.config.ts` | Zod schemas for content collections |
| `src/lib/data-utils.ts` | Post queries, sorting, TOC generation, subpost handling |
| `astro.config.ts` | Astro config with MDX, expressive-code, sitemap |
| `eslint.config.js` | ESLint 9 flat config |

## Commands

```bash
npm run dev           # Start dev server (localhost:1234)
npm run build         # Full build (lint → OG images → type check → build)
npm run lint          # Check code quality
npm run lint:fix      # Auto-fix lint issues
npm run format        # Format with Prettier
npm run format:check  # Verify formatting
npm run new-post      # Create new blog post (interactive or with flags)
npm run generate-og-images  # Generate/regenerate OG images
npm test              # Run tests in watch mode
npm run test:run      # Single test run
```

## Content Collections

### Blog Posts (`src/content/blog/`)
- Each post in its own directory: `post-slug/index.mdx`
- Images stored alongside: `post-slug/image.png`
- OG images auto-generated: `post-slug/og-image.png`

**Frontmatter schema:**
```yaml
title: 'Post Title'
description: 'Meta description (110-160 chars for SEO)'
date: 2025-01-15
tags: ['programming', 'engineering-management']
authors: ['cduruk']
draft: false
ogImage: './og-image.png'
```

**Common tags:** `business`, `margins`, `tech-industry`, `social-media`, `security`, `engineering-management`, `hiring`, `programming`

### Subposts
Posts can have child pages for multi-part content:
- Parent: `post-slug/index.mdx`
- Subposts: `post-slug/part-one.mdx`, `post-slug/part-two.mdx`
- Use `order` frontmatter field to control ordering

### Authors (`src/content/authors/`)
```yaml
name: 'Can Duruk'
avatar: '/avatar.webp'
bio: 'Short bio'
twitter: 'https://x.com/can'
```

## URL Conventions

**All internal links use trailing slashes.** This is enforced throughout the codebase:
- `/posts/` not `/posts`
- `/posts/my-article/` not `/posts/my-article`
- Use `ensureTrailingSlash()` from `src/lib/utils.ts` for dynamic links
- The `<Link>` component auto-normalizes paths

## Creating New Posts

```bash
# Interactive mode
npm run new-post

# With flags
npm run new-post -- --title "Title" --description "Desc" --tags tag1,tag2 --author cduruk
```

Creates directory structure with frontmatter and triggers OG image generation.

## OG Image Generation

```bash
# Generate missing images only
npm run generate-og-images

# Regenerate specific posts
npm run generate-og-images -- --slug post-one,post-two --all-posts

# Control what to generate
npm run generate-og-images -- --tasks posts,static --no-static
```

Templates in `src/components/ui/`:
- `hero-template.tsx` - Blog posts and static pages
- `favicon-template.tsx` - Favicons and logo
- `default-og-template.tsx` - Fallback OG image

## Interactive Components in MDX

```mdx
import { MyComponent } from '@/components/my-tool/MyComponent'
import '@/styles/my-tool.css'

<div class="not-prose">
  <MyComponent client:load />
</div>
```

Hydration directives:
- `client:load` - Immediate load
- `client:idle` - Load after page interactive
- `client:visible` - Load when visible

## Color Scheme (Flexoki)

- Brand red: `#AF3029`
- Highlight red: `#FC4B44`
- Background dark: `#100F0F`
- Foreground light: `#F2F0E5` / `#FFFCF0`
- Muted text: `#878580`
- Border: `#343331`

## Testing

Tests use Vitest and cover utilities like `ensureTrailingSlash()` and OG image CLI parsing.

```bash
npm test          # Watch mode
npm run test:run  # CI mode
npm run test:ui   # Interactive UI
```

## Before Committing

1. Run `npm run lint:fix` to fix lint issues
2. Run `npm run format` then `npm run format:check`
3. Run `npm run build` to verify full build passes
4. For grammar edits, be specific about fixes in commit messages

## Detailed Guidelines

See `AGENTS.md` for comprehensive guidelines on:
- Code quality and linting rules
- Git workflow and PR process
- Blog post creation and importing
- YAML frontmatter validation
- Social media embedding
- Interactive tool development
- Dark mode SVG handling
- Copy-editing patterns

@AGENTS.md
