import * as vscode from 'vscode';
import { ParsedMarkdown, parseMarkdown } from './parser';

interface WordCountLimits {
  minWords: number;
  maxWords: number;
}

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getFrontmatterWordCountLimit(parsed: ParsedMarkdown, key: string): number {
  const field = parsed.frontmatterFields.find((item) => item.key === key);
  return field ? parsePositiveInteger(field.value) : 0;
}

function getWordCountLimits(parsed: ParsedMarkdown): WordCountLimits {
  const config = vscode.workspace.getConfiguration('markdownWordCount');
  const configuredMinWords = config.get<number>('minWordCount', 0);
  const configuredMaxWords = config.get<number>('maxWordCount', 0);
  const frontmatterMinWords = getFrontmatterWordCountLimit(parsed, 'min-word-count');
  const frontmatterMaxWords = getFrontmatterWordCountLimit(parsed, 'max-word-count');

  return {
    minWords: frontmatterMinWords || configuredMinWords,
    maxWords: frontmatterMaxWords || configuredMaxWords,
  };
}

function getSelectedText(editor: vscode.TextEditor): string {
  return editor.selections
    .filter((selection) => !selection.isEmpty)
    .map((selection) => editor.document.getText(selection))
    .join('\n');
}

function buildDetails(parsed: ParsedMarkdown, selectedParsed?: ParsedMarkdown): string[] {
  const lines: string[] = [];
  lines.push(`Content: ${parsed.contentWords} words, ${parsed.contentChars} chars`);

  if (selectedParsed) {
    lines.push(`Selection: ${selectedParsed.contentWords} words, ${selectedParsed.contentChars} chars`);
  }

  if (parsed.hasFrontmatter && parsed.frontmatterFields.length > 0) {
    lines.push('');
    lines.push('Frontmatter:');
    for (const field of parsed.frontmatterFields) {
      lines.push(`  ${field.key}: ${field.words} words, ${field.chars} chars`);
    }
  }

  return lines;
}

export interface ExtensionApi {
  readonly statusBarItem: vscode.StatusBarItem;
}

export function activate(context: vscode.ExtensionContext): ExtensionApi {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0
  );
  statusBarItem.command = 'markdownWordCount.showDetails';
  context.subscriptions.push(statusBarItem);

  function updateStatusBar(editor: vscode.TextEditor | undefined): void {
    if (!editor || editor.document.languageId !== 'markdown') {
      statusBarItem.hide();
      return;
    }

    const text = editor.document.getText();
    const parsed = parseMarkdown(text);
    const wordCount = parsed.contentWords;
    const selectedText = getSelectedText(editor);
    const selectedParsed = selectedText ? parseMarkdown(selectedText, false) : undefined;

    const { minWords, maxWords } = getWordCountLimits(parsed);
    const config = vscode.workspace.getConfiguration('markdownWordCount');
    const colorBelowMin = config.get<string>('colorBelowMin', '#f44747');
    const colorAboveMax = config.get<string>('colorAboveMax', '#f44747');
    const colorInRange = config.get<string>('colorInRange', '#89d185');

    const hasMin = minWords > 0;
    const hasMax = maxWords > 0;

    let color: string | undefined;
    let arrow = '';

    if (hasMin || hasMax) {
      const belowMin = hasMin && wordCount < minWords;
      const aboveMax = hasMax && wordCount > maxWords;

      if (belowMin) {
        color = colorBelowMin;
        if (hasMax) arrow = '↓ ';
      } else if (aboveMax) {
        color = colorAboveMax;
        if (hasMin) arrow = '↑ ';
      } else {
        color = colorInRange;
      }
    }

    statusBarItem.color = color;
    const countText = selectedParsed
      ? `${wordCount} / ${selectedParsed.contentWords}`
      : `${wordCount}`;
    statusBarItem.text = `$(book) ${arrow}${countText} Words`;
    statusBarItem.tooltip = buildDetails(parsed, selectedParsed).join('\n');
    statusBarItem.show();
  }

  // Register command to show a detail panel in an information message
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownWordCount.showDetails', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        return;
      }

      const text = editor.document.getText();
      const parsed = parseMarkdown(text);
      const selectedText = getSelectedText(editor);
      const selectedParsed = selectedText ? parseMarkdown(selectedText, false) : undefined;

      vscode.window.showInformationMessage(buildDetails(parsed, selectedParsed).join('\n'));
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar)
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        vscode.window.activeTextEditor &&
        event.document === vscode.window.activeTextEditor.document
      ) {
        updateStatusBar(vscode.window.activeTextEditor);
      }
    })
  );

  let selectionDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push({
    dispose: () => {
      if (selectionDebounceTimer !== undefined) {
        clearTimeout(selectionDebounceTimer);
      }
    },
  });
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor === vscode.window.activeTextEditor) {
        if (selectionDebounceTimer !== undefined) {
          clearTimeout(selectionDebounceTimer);
        }
        selectionDebounceTimer = setTimeout(() => {
          selectionDebounceTimer = undefined;
          updateStatusBar(event.textEditor);
        }, 50);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
      if (event.affectsConfiguration('markdownWordCount')) {
        updateStatusBar(vscode.window.activeTextEditor);
      }
    })
  );

  // Initialize for currently open editor
  updateStatusBar(vscode.window.activeTextEditor);

  return { statusBarItem };
}

export function deactivate(): void {
  // intentionally empty
}
