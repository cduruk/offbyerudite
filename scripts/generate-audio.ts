/**
 * Audio generation script for blog posts using Modal + Chatterbox TTS.
 *
 * Usage:
 *   npm run generate-audio                    # Generate audio for posts without audio
 *   npm run generate-audio -- --slug my-post  # Generate for specific post(s)
 *   npm run generate-audio -- --force         # Regenerate all posts
 */

import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BLOG_DIR = join(__dirname, '../src/content/blog')

interface Frontmatter {
  [key: string]: string
}

interface BlogPost {
  slug: string
  dir: string
  hasAudio: boolean
  title?: string
  description?: string
  draft?: string
}

interface CliOptions {
  slugs: string[]
  force: boolean
  help: boolean
}

// Simple frontmatter parser (reused from generate-og-images.ts)
function parseFrontmatter(content: string): Frontmatter | null {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/
  const match = content.match(frontmatterRegex)

  if (!match) return null

  const frontmatter: Frontmatter = {}
  const lines = match[1].split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()

    // Remove quotes
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1)
    }

    frontmatter[key] = value
  }

  return frontmatter
}

/**
 * Extract plain text from MDX content for TTS.
 * Aggressively cleans text to avoid issues with TTS model.
 */
function extractTextFromMdx(content: string, frontmatter: Frontmatter): string {
  // Start with the title
  const parts: string[] = []

  if (frontmatter.title) {
    parts.push(frontmatter.title)
  }

  // Remove frontmatter
  let text = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')

  // Remove import statements
  text = text.replace(/^import\s+.*$/gm, '')

  // Remove export statements
  text = text.replace(/^export\s+.*$/gm, '')

  // Remove JSX/MDX components (self-closing and with children)
  text = text.replace(/<[A-Z][a-zA-Z]*[^>]*\/>/g, '') // Self-closing: <Component />
  text = text.replace(/<[A-Z][a-zA-Z]*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, '') // With children
  text = text.replace(/<[a-z][a-zA-Z]*[^>]*>[\s\S]*?<\/[a-z][a-zA-Z]*>/g, '') // HTML elements like <div>

  // Remove fenced code blocks
  text = text.replace(/```[\s\S]*?```/g, '')

  // Remove inline code
  text = text.replace(/`[^`]+`/g, '')

  // Remove images but keep alt text
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')

  // Convert links to just text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Convert headers to plain text (add a pause indicator)
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '\n$1.\n')

  // Remove emphasis markers but keep text
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
  text = text.replace(/\*([^*]+)\*/g, '$1') // Italic
  text = text.replace(/__([^_]+)__/g, '$1') // Bold alt
  text = text.replace(/_([^_]+)_/g, '$1') // Italic alt

  // Remove blockquotes marker
  text = text.replace(/^>\s+/gm, '')

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '')

  // Remove list markers but keep text
  text = text.replace(/^[\s]*[-*+]\s+/gm, '')
  text = text.replace(/^[\s]*\d+\.\s+/gm, '')

  // Remove URLs that might have leaked through
  text = text.replace(/https?:\/\/[^\s)]+/g, '')

  // Remove any remaining HTML-like tags
  text = text.replace(/<[^>]+>/g, '')

  // Replace special Unicode characters that might cause issues
  text = text.replace(/[""]/g, '"') // Smart quotes
  text = text.replace(/['']/g, "'") // Smart apostrophes
  text = text.replace(/[—–]/g, '-') // Em/en dashes
  text = text.replace(/…/g, '...') // Ellipsis
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[^\x00-\x7F]/g, ' ') // Remove non-ASCII characters

  // Normalize whitespace
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.replace(/[ \t]+/g, ' ')
  text = text.trim()

  parts.push(text)

  return parts.join('\n\n')
}

// Get all blog posts
async function getBlogPosts(): Promise<BlogPost[]> {
  const entries = await readdir(BLOG_DIR, { withFileTypes: true })
  const posts: BlogPost[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const postDir = join(BLOG_DIR, entry.name)
    const files = await readdir(postDir)

    // Find index.mdx or index.md
    const indexFile = files.find((f) => f === 'index.mdx' || f === 'index.md')
    if (!indexFile) continue

    // Check if audio already exists
    const hasAudio = files.some((f) => f === 'audio.wav' || f === 'audio.mp3')

    const content = await readFile(join(postDir, indexFile), 'utf-8')
    const frontmatter = parseFrontmatter(content)

    if (!frontmatter) continue

    posts.push({
      slug: entry.name,
      dir: postDir,
      hasAudio,
      ...frontmatter,
    })
  }

  return posts
}

function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    slugs: [],
    force: false,
    help: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (!arg.startsWith('--')) continue

    const [rawKey, valueFromSame] = arg.slice(2).split('=', 2)

    if (!rawKey) continue

    if (rawKey === 'h' || rawKey === 'help') {
      options.help = true
      continue
    }

    if (rawKey === 'force' || rawKey === 'all') {
      options.force = true
      continue
    }

    if (rawKey === 'slug' || rawKey === 'slugs') {
      let value = valueFromSame
      if (!value && args[index + 1] && !args[index + 1].startsWith('--')) {
        value = args[++index]
      }
      if (value) {
        const slugs = value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        options.slugs.push(...slugs)
      }
    }
  }

  return options
}

function filterPostsForGeneration(
  posts: BlogPost[],
  options: CliOptions,
): BlogPost[] {
  if (options.slugs.length > 0) {
    const slugSet = new Set(options.slugs)
    const selected = posts.filter((post) => slugSet.has(post.slug))

    const missing = options.slugs.filter(
      (slug) => !selected.some((post) => post.slug === slug),
    )

    if (missing.length > 0) {
      throw new Error(
        `Unknown blog post slug${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
      )
    }

    return selected
  }

  return posts.filter((post) => {
    if (post.draft === 'true') return false
    if (!options.force && post.hasAudio) return false
    return true
  })
}

/**
 * Generate audio for a single post using Modal TTS.
 */
async function generateAudioForPost(post: BlogPost): Promise<void> {
  const indexFile = (await readdir(post.dir)).find(
    (f) => f === 'index.mdx' || f === 'index.md',
  )
  if (!indexFile) {
    throw new Error(`No index file found for ${post.slug}`)
  }

  const content = await readFile(join(post.dir, indexFile), 'utf-8')
  const frontmatter = parseFrontmatter(content) || {}
  const text = extractTextFromMdx(content, frontmatter)

  // Limit text length for TTS (Chatterbox has limits with long text)
  // Tested: 3000 works, 4000 fails. Using 3000 as safe limit.
  const maxChars = 3000
  const truncatedText =
    text.length > maxChars ? text.slice(0, maxChars) + '...' : text

  console.log(
    `  Extracted ${text.length} chars (${truncatedText.length} for TTS)`,
  )

  const outputPath = join(post.dir, 'audio.wav')

  // Call Modal TTS via subprocess
  const ttsScript = join(__dirname, 'tts/chatterbox_tts.py')

  return new Promise((resolve, reject) => {
    const proc = spawn(
      'uv',
      [
        'run',
        '--with',
        'modal',
        'modal',
        'run',
        ttsScript,
        '--text',
        truncatedText,
        '--output',
        outputPath,
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`  ✓ Generated: ${outputPath}`)
        resolve()
      } else {
        reject(new Error(`Modal TTS failed: ${stderr || stdout}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn Modal: ${err.message}`))
    })
  })
}

function printUsage(): void {
  console.log(`Usage: npm run generate-audio -- [options]

Options:
  --slug slug-one,slug-two   Generate audio for specific blog post slugs
  --force                    Regenerate audio even if it already exists
  --help                     Show this message

Examples:
  npm run generate-audio                         # Generate missing audio
  npm run generate-audio -- --slug my-post       # Generate for specific post
  npm run generate-audio -- --force              # Regenerate all posts
`)
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2))

  if (options.help) {
    printUsage()
    return
  }

  console.log('🎙️  Generating audio for blog posts...\n')

  const posts = await getBlogPosts()
  const postsToGenerate = filterPostsForGeneration(posts, options)

  if (postsToGenerate.length === 0) {
    if (options.slugs.length > 0) {
      console.log('✨ No matching posts found for the provided slugs.')
    } else {
      console.log('✨ All posts already have audio!')
    }
    return
  }

  console.log(`Found ${postsToGenerate.length} posts to process:\n`)

  for (const post of postsToGenerate) {
    console.log(`📝 ${post.title || post.slug}`)
    try {
      await generateAudioForPost(post)
    } catch (error) {
      console.error(`  ✗ Failed: ${(error as Error).message}`)
    }
  }

  console.log('\n✅ Done!')
}

// Run main
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
