import { By, TextEditor } from "vscode-extension-tester";
import { WebviewTestUtils } from "./WebviewTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import assert from "assert";
import { randomUUID } from "crypto";
import path from "path";

/**
 * Tests the saving of the configuration.
 */
suite("save configuration", () => {
  /**
   * Opens the workspace before all tests.
   */
  suiteSetup("open workspace", async () => {
    await LiquibaseGUITestUtils.openWorkspace();
  });

  /**
   * Tests that an error was given, when no name was written.
   */
  test("should give error when no name was given", async function () {
    await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
      const saveButton = await webView.findWebElement(By.id("saveButton"));

      await saveButton.click();
    });

    assert.ok(
      await LiquibaseGUITestUtils.assertIfNotificationExists("Required value 'name of configuration' is missing")
    );
  });

  /**
   * Tests that the connection can be saved when a name was given.
   */
  test("should save correctly when a name was given", async function () {
    const name = randomUUID();

    await saveSimpleConnection(name);

    assert.ok(
      await LiquibaseGUITestUtils.assertIfNotificationExists(`Configuration for ${name} was successfully saved.`)
    );

    // get the text editor and check the file path
    const textEditor = new TextEditor();
    const filePath = await textEditor.getFilePath();
    assert.match(
      filePath,
      new RegExp(path.join("data", "liquibase", `${name}.liquibase.properties`).replaceAll("\\", "\\\\"))
    );
  });

  /**
   * Tests that an existing connection can be successfully overwritten.
   */
  test("should overwrite existing configuration", async function () {
    const name = randomUUID();

    // first, save successfully a simple connection
    await saveSimpleConnection(name);

    assert.ok(
      await LiquibaseGUITestUtils.assertIfNotificationExists(`Configuration for ${name} was successfully saved.`)
    );

    // then try to save it again
    await saveSimpleConnection(name);

    const notification = await LiquibaseGUITestUtils.assertIfNotificationExists(
      `There is already a configuration named ${name}. Do you want to replace it?`
    );
    assert.ok(notification, "notification should be there");

    const actions = await notification.getActions();

    assert.strictEqual(actions.length, 2);

    // confirm the replacing of the connection
    const yesAction = await actions[0].getTitle();
    assert.strictEqual(yesAction, "Yes");
    await notification.takeAction(yesAction);

    // and check that it was successfully saved
    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution(`Configuration for ${name} was successfully saved.`));
  });

  /**
   * Tests that the saving cancellation works, when a second configuration with the same name should be saved.
   */
  test("should cancel overwriting of existing configuration", async function () {
    const name = randomUUID();

    // first, save successfully a simple connection
    await saveSimpleConnection(name);

    assert.ok(
      await LiquibaseGUITestUtils.assertIfNotificationExists(`Configuration for ${name} was successfully saved.`)
    );

    // then try to save it again
    await saveSimpleConnection(name);

    const notification = await LiquibaseGUITestUtils.assertIfNotificationExists(
      `There is already a configuration named ${name}. Do you want to replace it?`
    );
    assert.ok(notification, "notification should be there");

    const actions = await notification.getActions();

    assert.strictEqual(actions.length, 2);

    // cancel the replacing of the connection
    const noAction = await actions[1].getTitle();
    assert.strictEqual(noAction, "No");
    await notification.takeAction(noAction);

    // and check that it was cancelled
    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution(`Saving cancelled`));
  });
});

/**
 * Saves a simple connection with just the name.
 *
 * @param name - the name with should be used for saving
 */
async function saveSimpleConnection(name: string): Promise<void> {
  await WebviewTestUtils.openAndExecuteOnWebview(async (webView) => {
    const nameInput = await webView.findWebElement(By.id("nameInput"));
    await nameInput.sendKeys(name);

    const saveButton = await webView.findWebElement(By.id("saveButton"));

    await saveButton.click();
  });
}
