import * as assert from 'assert';
import { countWords, parseMarkdown } from '../src/parser';

describe('countWords', () => {
  it('returns 0 for an empty string', () => {
    assert.strictEqual(countWords(''), 0);
  });

  it('returns 0 for whitespace-only string', () => {
    assert.strictEqual(countWords('   '), 0);
    assert.strictEqual(countWords('\t\n'), 0);
  });

  it('returns 1 for a single word', () => {
    assert.strictEqual(countWords('hello'), 1);
  });

  it('counts multiple space-separated words', () => {
    assert.strictEqual(countWords('one two three'), 3);
  });

  it('counts words separated by tabs and newlines', () => {
    assert.strictEqual(countWords('one\ttwo\nthree'), 3);
  });

  it('ignores leading and trailing whitespace', () => {
    assert.strictEqual(countWords('  hello world  '), 2);
  });

  it('handles multiple consecutive spaces', () => {
    assert.strictEqual(countWords('one   two'), 2);
  });
});

describe('parseMarkdown', () => {
  describe('plain content (no frontmatter)', () => {
    it('counts words in plain text', () => {
      const result = parseMarkdown('Hello world foo bar');
      assert.strictEqual(result.contentWords, 4);
      assert.strictEqual(result.hasFrontmatter, false);
      assert.deepStrictEqual(result.frontmatterFields, []);
    });

    it('returns 0 words for empty document', () => {
      const result = parseMarkdown('');
      assert.strictEqual(result.contentWords, 0);
      assert.strictEqual(result.hasFrontmatter, false);
    });

    it('strips fenced code blocks', () => {
      const result = parseMarkdown('Before\n```\nconst x = 1;\n```\nAfter');
      assert.strictEqual(result.contentWords, 2); // "Before" and "After"
    });

    it('strips inline code', () => {
      const result = parseMarkdown('Use `npm install` to install');
      assert.strictEqual(result.contentWords, 3); // "Use", "to", "install"
    });

    it('strips images but keeps surrounding text', () => {
      const result = parseMarkdown('See ![alt text](image.png) here');
      assert.strictEqual(result.contentWords, 2); // "See", "here"
    });

    it('keeps link text, strips URL', () => {
      const result = parseMarkdown('Visit [my site](https://example.com) now');
      assert.strictEqual(result.contentWords, 4); // "Visit", "my", "site", "now"
    });

    it('strips HTML tags', () => {
      const result = parseMarkdown('Hello <br/> world <em>there</em>');
      assert.strictEqual(result.contentWords, 3); // "Hello", "world", "there"
    });

    it('strips heading markers', () => {
      const result = parseMarkdown('# Title\n## Section\nParagraph text');
      assert.strictEqual(result.contentWords, 4); // "Title", "Section", "Paragraph", "text"
    });

    it('strips bold markers', () => {
      const result = parseMarkdown('This is **very important** text');
      assert.strictEqual(result.contentWords, 5);
    });

    it('strips italic markers', () => {
      const result = parseMarkdown('This is *emphasized* text');
      assert.strictEqual(result.contentWords, 4);
    });

    it('strips strikethrough markers', () => {
      const result = parseMarkdown('This is ~~deleted~~ text');
      assert.strictEqual(result.contentWords, 4);
    });

    it('strips unordered list markers', () => {
      const result = parseMarkdown('- item one\n* item two\n+ item three');
      assert.strictEqual(result.contentWords, 6);
    });

    it('strips ordered list markers', () => {
      const result = parseMarkdown('1. first item\n2. second item');
      assert.strictEqual(result.contentWords, 4);
    });

    it('strips blockquote markers', () => {
      const result = parseMarkdown('> This is a quote');
      assert.strictEqual(result.contentWords, 4);
    });

    it('reports correct contentChars', () => {
      const result = parseMarkdown('Hello world');
      assert.strictEqual(result.contentChars, 11);
    });

    it('counts the whole document when word count boundary tags are not defined', () => {
      const doc = `Intro words
<!-- START-COUNT -->
Middle words here
<!-- END-COUNT -->
Outro words`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.contentWords, 7);
    });
  });

  describe('frontmatter parsing', () => {
    it('detects frontmatter and separates content', () => {
      const doc = `---\ntitle: My Post\n---\nContent here`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.hasFrontmatter, true);
      assert.strictEqual(result.frontmatterFields.length, 1);
      assert.strictEqual(result.frontmatterFields[0].key, 'title');
      assert.strictEqual(result.frontmatterFields[0].value, 'My Post');
    });

    it('counts words in frontmatter values', () => {
      const doc = `---\ntitle: Hello World\n---\n`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.frontmatterFields[0].words, 2);
      assert.strictEqual(result.frontmatterFields[0].chars, 11);
    });

    it('parses multiple frontmatter fields', () => {
      const doc = `---\ntitle: My Post\nauthor: Jane Doe\ndate: 2024-01-01\n---\nBody text`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.frontmatterFields.length, 3);
      assert.strictEqual(result.frontmatterFields[0].key, 'title');
      assert.strictEqual(result.frontmatterFields[1].key, 'author');
      assert.strictEqual(result.frontmatterFields[2].key, 'date');
    });

    it('strips quotes from frontmatter values', () => {
      const doc = `---\ntitle: "Quoted Title"\n---\n`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.frontmatterFields[0].value, 'Quoted Title');
    });

    it('strips single quotes from frontmatter values', () => {
      const doc = `---\ntitle: 'Single Quoted'\n---\n`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.frontmatterFields[0].value, 'Single Quoted');
    });

    it('does not count frontmatter content in contentWords', () => {
      const doc = `---\ntitle: Many Words Here\n---\nJust one`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.contentWords, 2); // "Just one"
    });

    it('handles empty frontmatter value', () => {
      const doc = `---\ntitle:\n---\nContent`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.frontmatterFields[0].value, '');
      assert.strictEqual(result.frontmatterFields[0].words, 0);
      assert.strictEqual(result.frontmatterFields[0].chars, 0);
    });

    it('handles multi-line frontmatter value', () => {
      const doc = `---\ndescription: First line\n  continued here\n---\nContent`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.frontmatterFields[0].words, 4);
    });

    it('handles CRLF line endings in frontmatter', () => {
      const doc = `---\r\ntitle: My Post\r\n---\r\nContent`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.hasFrontmatter, true);
      assert.strictEqual(result.frontmatterFields[0].value, 'My Post');
    });

    it('does not treat non-leading --- as frontmatter', () => {
      const doc = `Some text\n---\ntitle: Not frontmatter\n---\n`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.hasFrontmatter, false);
    });

    it('counts only content between configured word count boundary tags', () => {
      const doc = `---
begin-word-count: <!-- START-COUNT -->
end-word-count: <!-- END-COUNT -->
---
Ignored intro words
<!-- START-COUNT -->
Count these five words only
<!-- END-COUNT -->
Ignored outro words`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.contentWords, 5);
    });

    it('counts from the begin tag onward when only begin-word-count is defined', () => {
      const doc = `---
begin-word-count: <!-- START-COUNT -->
---
Ignored intro words
<!-- START-COUNT -->
Count these words
<!-- END-COUNT -->`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.contentWords, 3);
    });

    it('counts up to the end tag when only end-word-count is defined', () => {
      const doc = `---
end-word-count: <!-- END-COUNT -->
---
Count these words
<!-- END-COUNT -->
Ignored outro words`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.contentWords, 3);
    });

    it('counts the whole document when a defined marker is not found in the body', () => {
      const doc = `---
begin-word-count: <!-- MISSING-MARKER -->
---
Count all five words here`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.contentWords, 5);
    });

    it('ignores end marker when it appears before the begin marker in the document', () => {
      const doc = `---
begin-word-count: <!-- START-COUNT -->
end-word-count: <!-- END-COUNT -->
---
<!-- END-COUNT -->
Ignored before start
<!-- START-COUNT -->
Count these three words`;
      const result = parseMarkdown(doc);
      assert.strictEqual(result.contentWords, 4);
    });
  });
});
