import path from "path";
import fs from "fs";
import assert from "assert";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { By, InputBox, StatusBar, Workbench } from "vscode-extension-tester";
import { randomUUID } from "crypto";

/**
 * Test suite for adding an existing liquibase.properties file to the configuration.
 */
suite("Add existing liquibase.properties to the configuration", function () {
  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.openWorkspace();
  });

  /**
   * Test case for adding a liquibase.properties file to the config.
   */
  test("should add a liquibase.properties file to the config", async function () {
    this.timeout(50_000);

    const configName = randomUUID();
    const propertiesFileName = "dummy.liquibase.properties";

    // Open the command prompt/palette
    const prompt = await new Workbench().openCommandPrompt();

    // Wait for the input box to appear
    const input = await InputBox.create();

    // Execute the command
    await prompt.setText(">liquibase.addExistingConfiguration");
    await prompt.confirm();

    // Wait for a bit initially
    await wait(1000);

    // Wait until the "Activating Extensions..." progress disappears from the status bar
    for (let i = 0; i < 10; i++) {
      const activateProgress = await new StatusBar().getItem("Activating Extensions...");
      if (activateProgress) {
        await wait(1000);
      } else {
        break;
      }
    }

    // Input the configuration name
    await input.setText(configName);
    await input.confirm();

    // Select the folder
    await CommandUtils.selectFolder(input, CommandUtils.WORKSPACE_PATH);

    // Select the properties file
    await input.findElement(By.linkText(propertiesFileName)).click();

    await wait();

    const settingsFile = path.join(CommandUtils.WORKSPACE_PATH, "data", "liquibase", "settings.json");
    assert.ok(fs.existsSync(settingsFile));

    // Get the content of the settings file
    const data = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    const dataForName = data[configName];

    // Check that the config is inside the settings file
    assert.ok(dataForName);
    assert.strictEqual(
      dataForName.toLowerCase(),
      path.join(CommandUtils.WORKSPACE_PATH, propertiesFileName).toLowerCase()
    );
  });

  /**
   * Tear down the test suite.
   */
  suiteTeardown(async function () {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
