export interface FrontmatterField {
  key: string;
  value: string;
  words: number;
  chars: number;
}

export interface ParsedMarkdown {
  frontmatterFields: FrontmatterField[];
  contentText: string;
  contentWords: number;
  contentChars: number;
  hasFrontmatter: boolean;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

export function parseMarkdown(text: string): ParsedMarkdown {
  const frontmatterFields: FrontmatterField[] = [];
  let contentText = text;
  let hasFrontmatter = false;

  // Match YAML frontmatter delimited by --- at start of file
  const frontmatterMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (frontmatterMatch) {
    hasFrontmatter = true;
    const yamlBlock = frontmatterMatch[1];
    contentText = frontmatterMatch[2];

    // Parse each key: value line from YAML frontmatter
    // Handles simple scalar values and quoted strings; skips arrays/objects
    const lines = yamlBlock.split(/\r?\n/);
    let currentKey: string | null = null;
    let currentValue = '';

    for (const line of lines) {
      // Top-level key: value pair (not indented)
      const keyValueMatch = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (keyValueMatch) {
        // Save previous key if any
        if (currentKey !== null) {
          const value = currentValue.trim().replace(/^["']|["']$/g, '');
          frontmatterFields.push({
            key: currentKey,
            value,
            words: countWords(value),
            chars: value.length,
          });
        }
        currentKey = keyValueMatch[1];
        currentValue = keyValueMatch[2];
      } else if (currentKey !== null && line.match(/^\s+/)) {
        // Multi-line value continuation — append with space
        currentValue += ' ' + line.trim();
      }
    }

    // Flush last key
    if (currentKey !== null) {
      const value = currentValue.trim().replace(/^["']|["']$/g, '');
      frontmatterFields.push({
        key: currentKey,
        value,
        words: countWords(value),
        chars: value.length,
      });
    }
  }

  // Strip Markdown syntax from content for accurate word count:
  // Remove code fences, inline code, images, links (keep link text), HTML tags
  const stripped = contentText
    .replace(/```[\s\S]*?```/g, '')       // fenced code blocks
    .replace(/`[^`]*`/g, '')              // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → keep text
    .replace(/<[^>]+>/g, '')              // HTML tags
    .replace(/^#{1,6}\s+/gm, '')          // headings
    .replace(/(\*\*|__)(.*?)\1/g, '$2')  // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')     // italic
    .replace(/~~(.*?)~~/g, '$1')         // strikethrough
    .replace(/^\s*[-*+>]\s+/gm, '')      // list markers / blockquotes
    .replace(/^\s*\d+\.\s+/gm, '');      // ordered list markers

  const contentWords = countWords(stripped);
  const contentChars = stripped.trim().length;

  return { frontmatterFields, contentText, contentWords, contentChars, hasFrontmatter };
}
