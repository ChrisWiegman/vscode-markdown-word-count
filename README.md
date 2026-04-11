# VS Code Markdown Word Count

A Visual Studio Code extension that shows word and character counts for Markdown files, with per-field breakdowns for YAML frontmatter.

## Features

### Status bar Word Count

When a Markdown file is active, the current word count appears in the status bar:

```
 123 Words
```

The count updates live as you type and excludes Markdown syntax — heading markers, bold/italic markers, code blocks, inline code, images, HTML tags, and list markers are all stripped before counting, so only prose words are counted.

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

This extension does not add any settings.

## Known Issues

None.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for the full release history.
