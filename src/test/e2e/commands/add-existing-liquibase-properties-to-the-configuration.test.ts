import path from "node:path";
import fs from "node:fs";
import assert from "node:assert";
import { By } from "vscode-extension-tester";
import { randomUUID } from "node:crypto";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

/**
 * Test suite for adding an existing liquibase.properties file to the configuration.
 */
suite("Add existing liquibase.properties to the configuration", function () {
  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    await LiquibaseGUITestUtils.openWorkspace();
  });

  /**
   * Test case for adding a liquibase.properties file to the config.
   */
  test("should add a liquibase.properties file to the config", async function () {
    const configurationName = randomUUID();
    const propertiesFileName = "dummy.liquibase.properties";

    // Execute the command
    const input = await LiquibaseGUITestUtils.startCommandExecution({
      command: "Add existing liquibase.properties to the configuration...",
      configurationName,
    });

    // Select the folder
    await LiquibaseGUITestUtils.selectFolder(input, LiquibaseGUITestUtils.WORKSPACE_PATH);

    // Select the properties file
    await input.findElement(By.linkText(propertiesFileName)).click();

    const settingsFile = path.join(LiquibaseGUITestUtils.WORKSPACE_PATH, "data", "liquibase", "settings.json");

    // wait until there is a settings file with the content
    await LiquibaseGUITestUtils.waitUntil(() => {
      if (fs.existsSync(settingsFile)) {
        const data = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
        return data[configurationName];
      }
    }, `waiting for ${settingsFile} to exist`);

    chai.assert.pathExists(settingsFile);

    // Get the content of the settings file
    const data = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    const dataForName = data[configurationName];

    // Check that the config is inside the settings file
    assert.ok(dataForName, JSON.stringify(data));
    assert.strictEqual(
      dataForName.toLowerCase(),
      path.join(LiquibaseGUITestUtils.WORKSPACE_PATH, propertiesFileName).toLowerCase()
    );
  });
});
