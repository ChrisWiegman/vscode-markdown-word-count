import * as vscode from 'vscode';
import { ParsedMarkdown, parseMarkdown } from './parser';

function buildDetails(parsed: ParsedMarkdown): string[] {
  const lines: string[] = [];
  lines.push(`Content: ${parsed.contentWords} words, ${parsed.contentChars} chars`);

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

    const config = vscode.workspace.getConfiguration('markdownWordCount');
    const minWords = config.get<number>('minWordCount', 0);
    const maxWords = config.get<number>('maxWordCount', 0);
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
    statusBarItem.text = `$(book) ${arrow}${wordCount} Words`;
    statusBarItem.tooltip = buildDetails(parsed).join('\n');
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

      vscode.window.showInformationMessage(buildDetails(parsed).join('\n'));
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
