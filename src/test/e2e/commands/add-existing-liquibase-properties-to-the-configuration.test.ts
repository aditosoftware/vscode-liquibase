import path from "path";
import fs from "fs";
import assert from "assert";
import { ActivityBar, By, InputBox, VSBrowser, Workbench } from "vscode-extension-tester";
import { randomUUID } from "crypto";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";

/**
 * Test suite for adding an existing liquibase.properties file to the configuration.
 */
suite("Add existing liquibase.properties to the configuration", function () {
  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    console.log(`workspace path: ${LiquibaseGUITestUtils.WORKSPACE_PATH}`);
    await LiquibaseGUITestUtils.openWorkspace();
    await VSBrowser.instance.takeScreenshot("workspace opened");

    // to open a specific view and look it up
    const control = await new ActivityBar().getViewControl("Explorer");
    console.log(control);
    if (control) {
      await control.openView();
    }
    await VSBrowser.instance.takeScreenshot("explorer opened");
  });

  /**
   * Test case for adding a liquibase.properties file to the config.
   */
  test("should add a liquibase.properties file to the config", async function () {
    const configName = randomUUID();
    const propertiesFileName = "dummy.liquibase.properties";

    // Open the command prompt/palette
    const prompt = await new Workbench().openCommandPrompt();

    // Wait for the input box to appear
    const input = await InputBox.create();

    // Execute the command
    await prompt.setText(">liquibase.addExistingConfiguration");
    await prompt.confirm();

    await LiquibaseGUITestUtils.waitForExtensionToActivate();

    // Input the configuration name
    await input.setText(configName);
    await input.confirm();

    // Select the folder
    await LiquibaseGUITestUtils.selectFolder(input, LiquibaseGUITestUtils.WORKSPACE_PATH);

    // Select the properties file
    await input.findElement(By.linkText(propertiesFileName)).click();

    const settingsFile = path.join(LiquibaseGUITestUtils.WORKSPACE_PATH, "data", "liquibase", "settings.json");

    // wait until there is a settings file with the content
    await LiquibaseGUITestUtils.waitUntil(() => {
      if (fs.existsSync(settingsFile)) {
        const data = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
        return data[configName];
      }
    });

    assert.ok(fs.existsSync(settingsFile), "settings file does exist");

    // Get the content of the settings file
    const data = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    const dataForName = data[configName];

    // Check that the config is inside the settings file
    assert.ok(dataForName, JSON.stringify(data));
    assert.strictEqual(
      dataForName.toLowerCase(),
      path.join(LiquibaseGUITestUtils.WORKSPACE_PATH, propertiesFileName).toLowerCase()
    );
  });
});
