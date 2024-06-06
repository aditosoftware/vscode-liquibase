import { By, EditorView, Key, TextEditor, WebView, Workbench } from "vscode-extension-tester";
import { WebviewTestUtils } from "./WebviewTestUtils";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";

/**
 * Tests the editing of an existing liquibase configuration.
 */
suite("editExistingLiquibaseConfiguration", () => {
  /**
   * The name of the configuration that was created before each test.
   */
  let configurationName: string;

  /**
   * The name of the properties file that was created before each test.
   */
  let propertiesFile: string;

  /**
   * Opens the workspace before all tests.
   */
  suiteSetup(async () => {
    await LiquibaseGUITestUtils.openWorkspace();
  });

  /**
   * Creates the configuration and closes every editor before each test.
   */
  setup(async function () {
    configurationName = await LiquibaseGUITestUtils.createConfiguration();
    propertiesFile = `${configurationName}.liquibase.properties`;

    await new EditorView().closeAllEditors();
  });

  /**
   * Tests that the configuration can be edited by RMB in the file.
   */
  test("should be able to edit existing configuration via RMB from file", async () => {
    // open the file of the configuration
    const prompt = await new Workbench().openCommandPrompt();
    await prompt.setText(propertiesFile);
    await prompt.confirm();
    await LiquibaseGUITestUtils.openAndSelectRMBItemFromAlreadyOpenedFile("Edit existing Liquibase Configuration");

    await shouldEditExistingConfiguration();
  });

  /**
   * Tests that the configuration can be edited by RMB in the file explorer.
   */
  test("should be able to edit existing configuration via RMB from file explorer", async () => {
    await LiquibaseGUITestUtils.openAndSelectRMBItemFromExplorer(
      "Edit existing Liquibase Configuration",
      "data",
      "liquibase",
      propertiesFile
    );

    await shouldEditExistingConfiguration();
  });

  /**
   * Tests that the configuration can be edited by using the command.
   */
  test("should be able to edit existing configuration via command", async () => {
    await new EditorView().closeAllEditors();

    await LiquibaseGUITestUtils.startCommandExecution({
      command: "Edit existing Liquibase Configuration",
      configurationName,
    });

    await shouldEditExistingConfiguration();
  });
});

/**
 * Checks that the editing of an existing properties file works.
 * The command for editing need to be called before calling this method.
 *
 * This method will check that the webview was opened and changes one value and checks that the changed value can be saved correctly.
 */
async function shouldEditExistingConfiguration(): Promise<void> {
  assert.ok(await WebviewTestUtils.checkForOpenedWebview());

  // init the WebView page object
  const webView = new WebView();

  await webView.switchToFrame();

  try {
    // just change the server address
    const serverAddress = await webView.findWebElement(By.id("dbConfig_serverAddress"));
    await serverAddress.sendKeys("127.0.0.1", Key.TAB);

    const saveButton = await webView.findWebElement(By.id("saveButton"));
    await saveButton.click();
  } finally {
    await webView.switchBack();
  }

  // check that the text was changed
  const text = await new TextEditor().getText();
  assert.match(text, /url = jdbc:mariadb:\/\/127.0.0.1:3310\/data/);
}
