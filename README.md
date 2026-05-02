# VS Code Markdown Word Count

A Visual Studio Code extension that shows word and character counts for Markdown files, with per-field breakdowns for YAML frontmatter.

## Features

### Status bar Word Count

When a Markdown file is active, the current word count appears in the status bar:

```
 123 Words
```

The count updates live as you type and excludes Markdown syntax — heading markers, bold/italic markers, code blocks, inline code, images, HTML tags, and list markers are all stripped before counting, so only prose words are counted.

### Selection Word Count

When you select text, the status bar shows both the full document word count and the selection word count:

```
 123 / 14 Words
```

The selection count updates as you adjust the selection and disappears when the selection is cleared. Multiple non-contiguous selections (multi-cursor) are counted together. The hover tooltip also gains a `Selection: N words, N chars` line when text is selected.

### Word Count Targets

You can set a minimum and/or maximum word count target. When a limit is configured, the status bar text changes color to indicate whether you are within your target:

- **Below minimum** — shown in red (default `#f44747`) until the minimum is reached.
- **In range** — shown in green (default `#89d185`) once the minimum is met and the maximum has not been exceeded.
- **Above maximum** — shown in red (default `#f44747`) once the maximum is exceeded.

When **both** a minimum and maximum are set, a directional arrow also appears after the count:

```
 ↓ 87 Words   (below minimum — write more)
 123 Words    (in range — no arrow)
 ↑ 201 Words  (above maximum — trim it down)
```

All three colors are fully configurable to match your theme. See [Extension Settings](#extension-settings) below.

#### Per-Document Limits via Frontmatter

You can also set word count limits on a per-document basis by adding `min-word-count` or `max-word-count` to the file's YAML frontmatter:

```yaml
---
min-word-count: 500
max-word-count: 1000
---
```

Frontmatter limits take priority over the workspace settings for that file. This is useful when different documents in the same workspace have different length targets.

### Hover Tooltip with Details

Hovering over the status bar item shows a detailed breakdown:

```
Content: 123 words, 842 chars

Frontmatter:
  title: 3 words, 18 chars
  description: 12 words, 74 chars
```

### Show Details Command

Run **Markdown Word Count: Show Details** from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) to see the same breakdown as a notification message.

## Frontmatter Support

The extension parses YAML frontmatter delimited by `---` at the start of the file. Each scalar field is counted separately, making it easy to track word counts for titles, descriptions, and other metadata fields alongside your content.

Multi-line scalar values and quoted strings are handled correctly. Array and object fields are parsed as keys but their word counts will reflect the raw YAML, not nested structure.

## Requirements

VS Code 1.115.0 or newer.

## Extension Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `markdownWordCount.minWordCount` | number | `0` | Minimum word count target. Set above `0` to enable. The status bar turns red below this count and green once it is reached. |
| `markdownWordCount.maxWordCount` | number | `0` | Maximum word count limit. Set above `0` to enable. The status bar turns red once this count is exceeded. |
| `markdownWordCount.colorBelowMin` | string | `#f44747` | Status bar text color when the word count is below the minimum. |
| `markdownWordCount.colorInRange` | string | `#89d185` | Status bar text color when the word count is within the configured range. |
| `markdownWordCount.colorAboveMax` | string | `#f44747` | Status bar text color when the word count exceeds the maximum. |

Color settings accept hex color values (e.g. `#f44747`). Setting a limit to `0` disables it; when no limits are set the status bar uses the default theme color with no arrows.

## Known Issues

None.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for the full release history.
