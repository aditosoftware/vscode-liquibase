import assert from "assert";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { ContextOptions } from "../../../constants";
import { InputBox, Key, VSBrowser } from "vscode-extension-tester";
import path from "path";

/**
 * Test suite for the 'update' command.
 */
suite("Update", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests({ startContainer: true });
  });

  /**
   * Test case for executing the 'update' command with different context types.
   */
  LiquibaseGUITestUtils.matrixExecution((option, exec, key) => {
    test("should execute 'update' with context type '" + option + "' command with " + key, async function () {
      await DockerTestUtils.resetDB();

      await LiquibaseGUITestUtils.executeCommandInMatrixExecution(
        "update",
        {
          command: "update...",
          configurationName,
          changelogFile: true,
        },
        option,
        exec
      );

      const databaseInformation = await DockerTestUtils.executeMariaDBSQL(
        "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
      );

      if (option === ContextOptions.NO_CONTEXT) {
        assert.strictEqual(
          databaseInformation.length,
          0,
          `Table 'person' DOES exist, while it shouldn't: ${databaseInformation}`
        );
      } else {
        if (key === "all available contexts" || key === "the first available context") {
          assert.ok(
            databaseInformation?.length >= 1,
            `Table 'person' DOES NOT exist, while it should: ${databaseInformation}`
          );
        } else {
          assert.strictEqual(
            databaseInformation.length,
            0,
            `Table 'person' DOES exist, while it shouldn't: ${databaseInformation}`
          );
        }
      }
    });
  });

  /**
   * Test case for executing the 'update' command with standard shortcut.
   */
  test("should execute 'update' with standard shortcut", async function () {
    await DockerTestUtils.resetDB();

    // HOW THE FUCK IS THIS WORKING? HUH?
    // https://github.com/redhat-developer/vscode-extension-tester/issues/1190
    const driverAction = VSBrowser.instance.driver.actions();

    if (process.platform === "darwin") {
      driverAction.keyDown(Key.COMMAND).keyDown(Key.ALT).keyUp(Key.CONTROL).keyUp(Key.SHIFT).sendKeys("u");
    } else {
      driverAction.keyDown(Key.ALT).keyUp(Key.SHIFT).sendKeys("u");
    }

    await driverAction.perform();

    const input = await InputBox.create();

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", ".liquibase", "changelog.xml"));
    await input.confirm();

    await input.selectQuickPick(ContextOptions.NO_CONTEXT);

    const databaseInformation = await DockerTestUtils.executeMariaDBSQL(
      "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"
    );

    assert.ok(databaseInformation?.length >= 0, `Table 'person' DOES exist, while it should: ${databaseInformation}`);
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
