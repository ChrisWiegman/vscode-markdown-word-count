import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import type { ExtensionApi } from '../../src/extension';

const EXTENSION_ID = 'chriswiegman.cw-markdown-word-count';
const COMMAND_ID = 'markdownWordCount.showDetails';

suite('Extension', () => {
  let ext: vscode.Extension<ExtensionApi>;
  let sandbox: sinon.SinonSandbox;

  suiteSetup(async () => {
    const found = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
    assert.ok(found, `Extension ${EXTENSION_ID} not found`);
    await found.activate();
    ext = found;
  });

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  test('activates', () => {
    assert.strictEqual(ext.isActive, true);
  });

  test('registers the showDetails command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(COMMAND_ID));
  });

  suite('status bar item properties', () => {
    test('is left-aligned', () => {
      assert.strictEqual(ext.exports.statusBarItem.alignment, vscode.StatusBarAlignment.Left);
    });

    test('has lowest left-side priority', () => {
      assert.strictEqual(ext.exports.statusBarItem.priority, 0);
    });

    test('is bound to the showDetails command', () => {
      assert.strictEqual(ext.exports.statusBarItem.command, COMMAND_ID);
    });
  });

  suite('with an active markdown editor', () => {
    let doc: vscode.TextDocument;

    setup(async () => {
      doc = await vscode.workspace.openTextDocument({
        content: 'Hello world foo bar',
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    teardown(async () => {
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('status bar displays word count', () => {
      assert.match(ext.exports.statusBarItem.text, /4 Words/);
    });

    test('status bar tooltip contains word and char counts', () => {
      const tooltip = String(ext.exports.statusBarItem.tooltip);
      assert.ok(tooltip.includes('4 words'), `Tooltip was: ${tooltip}`);
    });

    test('showDetails command shows correct content', async () => {
      const stub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

      await Promise.resolve(vscode.commands.executeCommand(COMMAND_ID));

      assert.strictEqual(stub.callCount, 1);
      const message = String(stub.firstCall.args[0]);
      assert.ok(message.includes('4 words'), `Message was: ${message}`);
    });

    test('status bar displays selection word count after full count', async () => {
      const editor = vscode.window.activeTextEditor;
      assert.ok(editor);
      editor.selection = new vscode.Selection(0, 0, 0, 11);
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.match(ext.exports.statusBarItem.text, /4 \/ 2 Words/);
    });

    test('showDetails command includes selection count', async () => {
      const editor = vscode.window.activeTextEditor;
      assert.ok(editor);
      editor.selection = new vscode.Selection(0, 0, 0, 11);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const stub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

      await Promise.resolve(vscode.commands.executeCommand(COMMAND_ID));

      assert.strictEqual(stub.callCount, 1);
      const message = String(stub.firstCall.args[0]);
      assert.ok(message.includes('Content: 4 words'), `Message was: ${message}`);
      assert.ok(message.includes('Selection: 2 words'), `Message was: ${message}`);
    });
  });

  suite('with an active markdown editor that has frontmatter', () => {
    let doc: vscode.TextDocument;

    setup(async () => {
      doc = await vscode.workspace.openTextDocument({
        content: '---\ntitle: My Post\n---\nHello world',
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    teardown(async () => {
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('status bar shows only content word count, excluding frontmatter', () => {
      assert.match(ext.exports.statusBarItem.text, /2 Words/);
    });

    test('tooltip includes frontmatter field breakdown', () => {
      const tooltip = String(ext.exports.statusBarItem.tooltip);
      assert.ok(tooltip.includes('Frontmatter:'), `Tooltip was: ${tooltip}`);
      assert.ok(tooltip.includes('title:'), `Tooltip was: ${tooltip}`);
    });

    test('showDetails message includes frontmatter section', async () => {
      const stub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

      await Promise.resolve(vscode.commands.executeCommand(COMMAND_ID));

      assert.strictEqual(stub.callCount, 1);
      const message = String(stub.firstCall.args[0]);
      assert.ok(message.includes('Frontmatter:'), `Message was: ${message}`);
      assert.ok(message.includes('title:'), `Message was: ${message}`);
    });
  });

  suite('with frontmatter word count limits', () => {
    teardown(async () => {
      const config = vscode.workspace.getConfiguration('markdownWordCount');
      await config.update('minWordCount', undefined, vscode.ConfigurationTarget.Global);
      await config.update('maxWordCount', undefined, vscode.ConfigurationTarget.Global);
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('uses min-word-count frontmatter for below-min highlighting', async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: '---\nmin-word-count: 10\n---\nHello world foo bar',
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc);
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.strictEqual(ext.exports.statusBarItem.color, '#f44747');
    });

    test('frontmatter limits override workspace settings', async () => {
      const config = vscode.workspace.getConfiguration('markdownWordCount');
      await config.update('minWordCount', 10, vscode.ConfigurationTarget.Global);
      await config.update('maxWordCount', 20, vscode.ConfigurationTarget.Global);
      const doc = await vscode.workspace.openTextDocument({
        content: '---\nmin-word-count: 3\nmax-word-count: 10\n---\nHello world foo bar',
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc);
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.strictEqual(ext.exports.statusBarItem.color, '#89d185');
    });
  });

  suite('with a non-markdown editor', () => {
    setup(async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: 'Hello world',
        language: 'plaintext',
      });
      await vscode.window.showTextDocument(doc);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    teardown(async () => {
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('showDetails command does not show a message', async () => {
      const stub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

      await Promise.resolve(vscode.commands.executeCommand(COMMAND_ID));

      assert.strictEqual(stub.callCount, 0);
    });
  });

  suite('word count color and arrow indicators', () => {
    // 4-word document used across all sub-suites
    setup(async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: 'Hello world foo bar',
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    teardown(async () => {
      const config = vscode.workspace.getConfiguration('markdownWordCount');
      await config.update('minWordCount', undefined, vscode.ConfigurationTarget.Global);
      await config.update('maxWordCount', undefined, vscode.ConfigurationTarget.Global);
      await config.update('colorBelowMin', undefined, vscode.ConfigurationTarget.Global);
      await config.update('colorAboveMax', undefined, vscode.ConfigurationTarget.Global);
      await config.update('colorInRange', undefined, vscode.ConfigurationTarget.Global);
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('no color when no limits are configured', () => {
      assert.strictEqual(ext.exports.statusBarItem.color, undefined);
    });

    test('no arrow when no limits are configured', () => {
      assert.match(ext.exports.statusBarItem.text, /4 Words$/);
    });

    suite('only minWordCount set, count below minimum', () => {
      setup(async () => {
        await vscode.workspace
          .getConfiguration('markdownWordCount')
          .update('minWordCount', 10, vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      test('uses below-min color', () => {
        assert.strictEqual(ext.exports.statusBarItem.color, '#f44747');
      });

      test('shows no arrow (only one limit set)', () => {
        assert.match(ext.exports.statusBarItem.text, /4 Words$/);
      });
    });

    suite('only minWordCount set, count at or above minimum', () => {
      setup(async () => {
        await vscode.workspace
          .getConfiguration('markdownWordCount')
          .update('minWordCount', 3, vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      test('uses in-range color', () => {
        assert.strictEqual(ext.exports.statusBarItem.color, '#89d185');
      });

      test('shows no arrow (only one limit set)', () => {
        assert.match(ext.exports.statusBarItem.text, /4 Words$/);
      });
    });

    suite('only maxWordCount set, count at or below maximum', () => {
      setup(async () => {
        await vscode.workspace
          .getConfiguration('markdownWordCount')
          .update('maxWordCount', 10, vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      test('uses in-range color', () => {
        assert.strictEqual(ext.exports.statusBarItem.color, '#89d185');
      });

      test('shows no arrow (only one limit set)', () => {
        assert.match(ext.exports.statusBarItem.text, /4 Words$/);
      });
    });

    suite('only maxWordCount set, count above maximum', () => {
      setup(async () => {
        await vscode.workspace
          .getConfiguration('markdownWordCount')
          .update('maxWordCount', 3, vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      test('uses above-max color', () => {
        assert.strictEqual(ext.exports.statusBarItem.color, '#f44747');
      });

      test('shows no arrow (only one limit set)', () => {
        assert.match(ext.exports.statusBarItem.text, /4 Words$/);
      });
    });

    suite('both limits set, count below minimum', () => {
      setup(async () => {
        const config = vscode.workspace.getConfiguration('markdownWordCount');
        await config.update('minWordCount', 10, vscode.ConfigurationTarget.Global);
        await config.update('maxWordCount', 20, vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      test('uses below-min color', () => {
        assert.strictEqual(ext.exports.statusBarItem.color, '#f44747');
      });

      test('shows down arrow', () => {
        assert.match(ext.exports.statusBarItem.text, /↓ 4 Words$/);
      });
    });

    suite('both limits set, count in range', () => {
      setup(async () => {
        const config = vscode.workspace.getConfiguration('markdownWordCount');
        await config.update('minWordCount', 3, vscode.ConfigurationTarget.Global);
        await config.update('maxWordCount', 10, vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      test('uses in-range color', () => {
        assert.strictEqual(ext.exports.statusBarItem.color, '#89d185');
      });

      test('shows no arrow', () => {
        assert.match(ext.exports.statusBarItem.text, /4 Words$/);
      });
    });

    suite('both limits set, count above maximum', () => {
      setup(async () => {
        const config = vscode.workspace.getConfiguration('markdownWordCount');
        await config.update('minWordCount', 1, vscode.ConfigurationTarget.Global);
        await config.update('maxWordCount', 3, vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      test('uses above-max color', () => {
        assert.strictEqual(ext.exports.statusBarItem.color, '#f44747');
      });

      test('shows up arrow', () => {
        assert.match(ext.exports.statusBarItem.text, /↑ 4 Words$/);
      });
    });

    suite('custom colors', () => {
      setup(async () => {
        const config = vscode.workspace.getConfiguration('markdownWordCount');
        await config.update('minWordCount', 10, vscode.ConfigurationTarget.Global);
        await config.update('maxWordCount', 20, vscode.ConfigurationTarget.Global);
        await config.update('colorBelowMin', '#aabbcc', vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      test('applies custom below-min color', () => {
        assert.strictEqual(ext.exports.statusBarItem.color, '#aabbcc');
      });
    });

    suite('custom in-range color', () => {
      setup(async () => {
        const config = vscode.workspace.getConfiguration('markdownWordCount');
        await config.update('minWordCount', 3, vscode.ConfigurationTarget.Global);
        await config.update('colorInRange', '#00ff00', vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      test('applies custom in-range color', () => {
        assert.strictEqual(ext.exports.statusBarItem.color, '#00ff00');
      });
    });

    suite('custom above-max color', () => {
      setup(async () => {
        const config = vscode.workspace.getConfiguration('markdownWordCount');
        await config.update('maxWordCount', 3, vscode.ConfigurationTarget.Global);
        await config.update('colorAboveMax', '#ff00ff', vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      test('applies custom above-max color', () => {
        assert.strictEqual(ext.exports.statusBarItem.color, '#ff00ff');
      });
    });
  });
});
