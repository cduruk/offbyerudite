# Agent Guidelines

## General Best Practices

- Maintain existing Markdown formatting when editing documentation (respect heading levels, tables, and blockquotes).
- Prefer fenced code blocks with explicit language identifiers when adding examples.
- Run available package scripts (e.g., `npm run build`, `npm run lint`) before claiming tests have passed.

## Code Quality & Linting

**Project uses ESLint 9 (flat config) + Prettier:**

- **ESLint** handles code quality checks (unused variables, best practices, potential bugs)
- **Prettier** handles code formatting (indentation, quotes, semicolons)
- **Astro check** handles TypeScript type checking

**When to run linting:**

1. **Before commits**:
   - Run `npm run lint:fix` to auto-fix issues
   - Run `npm run format` to format code
   - **Verify with `npm run format:check`** to ensure all files were formatted
   - If format:check still shows warnings, run prettier directly on those specific files
2. **After major changes**: Run `npm run lint` to check for issues without modifying files
3. **Before PRs**: The build process (`npm run build`) automatically runs linting first
4. **During development**: Configure your editor to show ESLint warnings in real-time

**Fixing lint errors:**

- Most issues can be auto-fixed with `npm run lint:fix`
- For warnings about unused variables, prefix with `_` (e.g., `_unusedVar`)
- For legitimate cases requiring rule exceptions, use inline comments:
  ```ts
  // eslint-disable-next-line rule-name
  const value = someCode()
  ```
- Avoid disabling rules globally unless absolutely necessary

**Configuration:**

- ESLint config: `eslint.config.js` (flat config format)
- Prettier config: embedded in `package.json`
- Rules are configured for TypeScript, React, and Astro files
- Type definition files (`.d.ts`) and config files have more lenient rules

## Git Workflow

**Always work on a new branch and create a PR:**

1. **Create a new branch** at the start of any non-trivial work:

   ```bash
   git checkout -b descriptive-branch-name
   ```

2. **Make commits** as you complete discrete pieces of work:

   - Write clear, descriptive commit messages
   - Include the Claude Code co-author footer
   - Break work into logical commits (e.g., separate commits for import, grammar fixes, link updates)

3. **Push branch and create PR** when work is complete:

   ```bash
   git push -u origin branch-name
   gh pr create --title "..." --body "..."
   ```

   - Write a comprehensive PR description summarizing all changes
   - Include context about what was done and why
   - List key changes as bullet points

4. **Wait for user approval** before merging:
   - Do not merge PRs automatically
   - When user requests merge, use: `gh pr merge <number> --rebase --delete-branch`
   - Repository may require rebase merges (not squash or merge commits)

**Exception:** Small documentation updates or typo fixes may be committed directly to `main` at your discretion.

## Blog Post Creation

- Always use `npm run new-post` rather than manually creating post directories.
- This ensures proper directory structure, frontmatter formatting, and auto-generates OG images.
- The script supports both interactive prompts and CLI flags (`npm run new-post -- --title "..." --description "..." --tags foo,bar`).
- Provide required fields via flags when running non-interactively; otherwise the script will prompt for missing values.
- **Use existing tags whenever possible** - check existing posts in `src/content/blog/` before creating new tags. Common tags include: `business`, `margins`, `tech-industry`, `social-media`, `security`, `engineering-management`, `hiring`, `programming`.

### Importing Posts from External Sources

When importing blog posts from external sites (e.g., Margins, Substack):

1. **Fetch content**: Use `WebFetch` tool to extract the full article text, preserving structure
2. **Download images**: Use `curl` to download all images to the post directory
3. **Create post directory**: `mkdir -p src/content/blog/post-slug/`
4. **Create index.mdx**: Include frontmatter with:
   - Original publication date (preserve historical context)
   - Appropriate tags
   - Note about original publication source using a Callout component
5. **Generate OG image**: Run `npm run generate-og-images` after creating the post
6. **Add reference links**: Link to relevant Wikipedia articles, source materials, and referenced content

### YAML Frontmatter Validation

**Always validate YAML frontmatter for proper quote escaping:**

When frontmatter fields contain apostrophes or contractions (e.g., "don't", "can't", "you'll"):

- **Use double quotes** for the entire string value (preferred for readability)
- **Or double the apostrophe** if using single quotes (`''` becomes the escape sequence)

**Examples:**

```yaml
# ✅ Correct - use double quotes
description: "Why you don't want to make this mistake"

# ✅ Also correct - but harder to read
description: 'Why you don''t want to make this mistake'

# ❌ Incorrect - will break YAML parsing
description: 'Why you don't want to make this mistake'
```

**Why this matters:**

- Invalid YAML causes MDX files to fail parsing during Astro build
- The error prevents the entire post from loading
- Particularly important for `title` and `description` fields

**When to check:**

- When importing posts with user-written descriptions
- When titles or descriptions contain possessives or contractions
- Before running the build process

### Meta Descriptions & SEO

- Meta descriptions must be between **110-160 characters** for optimal SEO
- Be concise but descriptive
- Include key terms without keyword stuffing
- After updating a description, regenerate the OG image with `npm run generate-og-images`

### Embedding Social Media Content

**Twitter/X Embeds:**

- Use the official Twitter embed code from the tweet
- Center embeds using a flex container:
  ```html
  <div style="display: flex; justify-content: center; margin: 2rem 0;">
    <blockquote class="twitter-tweet">...</blockquote>
    <script
      async
      src="https://platform.twitter.com/widgets.js"
      charset="utf-8"
    ></script>
  </div>
  ```
- Place embeds contextually where they're first referenced in the text

## Asset Generation & Templates

- When modifying OG image designs or favicon designs, edit the React templates in `src/components/ui/`:
  - `hero-template.tsx` - Blog post and static page OG images
  - `favicon-template.tsx` - Favicons and logo
  - `default-og-template.tsx` - Default fallback OG image
- Don't edit the generation scripts in `scripts/` unless changing the generation process itself.
- OG images are auto-generated during build via `npm run build`.
- Manual generation is available via `npm run generate-og-images`.
  - Pass `--slug slug-one,slug-two` to regenerate specific posts (combine with `--all-posts` to overwrite existing assets).
  - Use `--tasks static` or `--no-static` to control whether static page OGs are rebuilt.

## Audio Generation (TTS)

Generate spoken audio versions of blog posts using Modal + Chatterbox TTS.

**Usage:**

```bash
npm run generate-audio                    # Generate audio for posts without audio.wav
npm run generate-audio -- --slug my-post  # Generate for specific post(s)
npm run generate-audio -- --force         # Regenerate all posts
```

**How it works:**

1. TypeScript orchestrator (`scripts/generate-audio.ts`) discovers posts and extracts plain text from MDX
2. Text is cleaned (removes code blocks, components, special characters) and truncated to ~3000 chars
3. Modal function (`scripts/tts/chatterbox_tts.py`) runs Chatterbox TTS on GPU to generate WAV audio
4. Audio saved to post directory as `audio.wav`

**Requirements:**

- `uv` (Python package manager) - [docs.astral.sh/uv](https://docs.astral.sh/uv/)
- Modal account with GPU access - run `modal setup` to authenticate

**Testing TTS directly:**

Generate sample audio with your own text:

```bash
# Basic test
uv run --with modal modal run scripts/tts/chatterbox_tts.py --text "Hello, welcome to my blog." --output test.wav

# Longer text (keep under ~3000 chars)
uv run --with modal modal run scripts/tts/chatterbox_tts.py --text "This is a longer paragraph demonstrating the text to speech capabilities." --output demo.wav
```

First run takes ~30 seconds for cold boot, subsequent runs are much faster.

**Limitations:**

- Text limited to ~3000 chars (longer text causes CUDA errors)
- Cold boot takes ~30 seconds on Modal
- Output is WAV format (MP3 conversion planned for future)

## Color Scheme

- Maintain Flexoki color scheme consistency across all visual assets.
- Refer to existing template files for correct color values:
  - Brand red: `#AF3029`
  - Highlight red: `#FC4B44`
  - Background (dark): `#100F0F`
  - Foreground (light): `#F2F0E5` / `#FFFCF0`
  - Muted text: `#878580`
  - Border: `#343331`

## Copy-Editing & Grammar

When copy-editing blog posts, check for:

- **Missing conjunctions**: "car see" → "car and see"
- **Missing articles**: "Model T is" → "The Model T is", "Google founders'" → "the Google founders'"
- **Missing prepositions**: "because how" → "because of how"
- **Missing verbs**: "to build possible" → "to build became possible"
- **Duplicate words**: "that, many times, that" → "that, many times,"
- **Duplicate prepositions**: "for enough for people" → "for enough people"

After making grammar fixes:

- Create a commit detailing all corrections made
- Be specific about what was fixed (e.g., "Add missing conjunction", "Remove duplicate preposition")

## Build Process

- The build process automatically runs `generate-og-images` before `astro check` and `astro build`.
- Always run `npm run build` to verify changes don't break the build pipeline.
- Check the build output for any errors or warnings before committing.

## Interactive Tools & React Component Embedding

### Creating Standalone Tool Pages

Interactive tools should live under `/tools/` directory with proper navigation structure:

**Directory Structure:**

```
src/pages/tools/
├── index.astro           # Landing page listing all tools
├── interruptions.astro   # Individual tool page
└── hiring-pipeline.astro # Another tool page
```

**Tool Page Pattern:**

```astro
---
import Breadcrumbs from '@/components/Breadcrumbs.astro'
import PageHead from '@/components/PageHead.astro'
import { YourReactComponent } from '@/components/your-tool/YourReactComponent'
import Layout from '@/layouts/Layout.astro'
import '@/styles/your-tool.css' // Tool-specific styles
---

<Layout class="max-w-5xl">
  <PageHead
    slot="head"
    title="Your Tool Name"
    description="Tool description"
    ogImage="/static/og/about.png"
  />
  <Breadcrumbs
    items={[
      { href: '/tools/', label: 'Tools', icon: 'lucide:wrench' },
      { label: 'Your Tool Name', icon: 'lucide:activity' },
    ]}
  />

  <section>
    <div class="prose mb-8">
      <h1>Tool Title</h1>
      <p>Introductory text</p>
    </div>

    <div class="not-prose">
      <YourReactComponent client:load />
    </div>
  </section>
</Layout>
```

### Embedding React Components in MDX

React components can be embedded in blog posts with proper hydration directives:

```mdx
---
title: 'Your Post Title'
description: 'Post description'
---

import { YourReactComponent } from '@/components/your-tool/YourReactComponent'
import '@/styles/your-tool.css'

## Introduction

Your content here...

<div class="not-prose">
  <YourReactComponent param1={value1} param2={value2} client:load />
</div>

More content...
```

**Hydration Directives:**

- `client:load` - Load immediately on page load (for critical components)
- `client:idle` - Load after page is interactive (better for performance)
- `client:visible` - Load when component enters viewport

### CSS Organization for Tools

When creating interactive tools with custom styling:

**When to create separate CSS files:**

- Tool uses CSS custom properties not needed elsewhere
- Tool has significant styling that would clutter global.css
- Tool might be reused across multiple pages
- Tool needs scoped color schemes or theme variables

**Pattern:**

1. Create `/src/styles/tool-name.css` with tool-specific variables
2. Import in both the standalone tool page AND blog posts that embed it
3. Remove tool-specific variables from global.css

**Example:**

```css
/* src/styles/poisson-visualizations.css */
:root {
  --svg-slate-50: #f8fafc;
  --svg-slate-100: #f1f5f9;
  --svg-slate-300: #cbd5e1;
}

[data-theme='dark'] {
  --svg-slate-50: #0f172a;
  --svg-slate-100: #1e293b;
  --svg-slate-300: #94a3b8; /* Lighter for better contrast */
}
```

### Dark Mode for SVG Visualizations

SVG elements require special handling for dark mode compatibility:

**SVG Text Readability:**

```tsx
// Adaptive fill colors for text
<text
  className="fill-gray-600 dark:fill-gray-100 font-bold"
>
  Text content
</text>

// Adaptive text shadows (white in light mode, black in dark mode)
<text
  className="fill-gray-600 dark:fill-gray-100 [text-shadow:0_0_2px_rgba(255,255,255,0.9)] dark:[text-shadow:0_0_2px_rgba(0,0,0,0.9)]"
>
  Text with shadow
</text>
```

**Key Principles:**

- Use medium gray (`gray-600`) for light mode text, not dark gray (`gray-900`)
- Use light gray (`gray-100`) for dark mode text for high contrast
- Keep text shadow blur radius small (2px) for crisp readability
- Make shadows adaptive: white shadows in light mode help against busy backgrounds, black shadows in dark mode
- Use `font-bold` or `font-semibold` to improve base visibility

**SVG Pattern & Shape Colors:**

```css
/* Hatched patterns need lighter colors in dark mode */
:root {
  --svg-slate-300: #cbd5e1; /* Medium gray for light mode */
}

[data-theme='dark'] {
  --svg-slate-300: #94a3b8; /* Lighter gray for dark mode contrast */
}
```

**Common Issues & Solutions:**

- **Text too dark in light mode**: Use `fill-gray-600` instead of `fill-gray-900`
- **Text invisible in dark mode**: Use `dark:fill-gray-100` for high contrast
- **Glowing effect**: Reduce shadow blur from 6px to 2px and lower opacity
- **Hatched patterns invisible**: Lighten pattern stroke color in dark mode using CSS variables

**Testing Dark Mode:**
Always test visualizations in both light and dark modes before committing:

```bash
# Toggle dark mode in browser DevTools or system settings
# Verify text readability, pattern visibility, and color contrast
```
