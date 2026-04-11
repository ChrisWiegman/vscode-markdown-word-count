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
});
