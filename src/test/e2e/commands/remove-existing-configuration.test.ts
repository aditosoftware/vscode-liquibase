import path from "path";
import fs from "fs";
import assert from "assert";
import { ModalDialog, TextEditor } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { ContextOptions, RemoveConfigurationOptions } from "../../../constants";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for adding an removing an existing liquibase.properties file from the configuration.
 */
suite("Remove existing liquibase.properties from the configuration", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Set up the test suite.
   */
  setup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Teardown function that runs after the test suite.
   */
  teardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });

  /**
   * Test case for removing a liquibase.properties file with various remove options.
   */
  [
    { removeOption: RemoveConfigurationOptions.CACHE, settingsThere: true, propertiesFileThere: true },
    { removeOption: RemoveConfigurationOptions.SETTING, settingsThere: false, propertiesFileThere: true },
    { removeOption: RemoveConfigurationOptions.DELETE_ALL, settingsThere: false, propertiesFileThere: false },
  ].forEach((pArgument) => {
    test(`should remove a liquibase.properties with remove option ${pArgument.removeOption}`, async function () {
      await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT);

      const input = await LiquibaseGUITestUtils.startCommandExecution({
        command: "Remove existing liquibase.properties from the configuration...",
        configurationName,
      });

      await input.setText(pArgument.removeOption);
      await input.confirm();

      const modalDialog = new ModalDialog();
      await modalDialog.pushButton("Delete");

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution(
          `Configuration was successfully removed with the option "${pArgument.removeOption}".`
        )
      );

      await LiquibaseGUITestUtils.startCommandExecution({
        command: "Cache: Open the file with the recently loaded elements",
      });
      const text = await new TextEditor().getText();
      const cache = JSON.parse(text);

      // get the key with our configuration name
      const keys = Object.keys(cache).filter((pKey) => pKey.includes(configurationName));
      assert.strictEqual(keys.length, 0, `there should be no element in ${keys}`);

      // check settings file
      const settings = JSON.parse(
        fs.readFileSync(path.join(LiquibaseGUITestUtils.WORKSPACE_PATH, "data", "liquibase", "settings.json"), "utf-8")
      );
      assert.strictEqual(
        Object.keys(settings).includes(configurationName),
        pArgument.settingsThere,
        `key for configuration is inside the settings ${settings}`
      );

      // check liquibase properties file
      assert.strictEqual(
        fs.existsSync(
          path.join(
            process.cwd(),
            "out",
            "temp",
            "workspace",
            "data",
            "liquibase",
            `${configurationName}.liquibase.properties`
          )
        ),
        pArgument.propertiesFileThere,
        "liquibase.properties files does exist"
      );
    });
  });
});
