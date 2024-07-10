import assert from "assert";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("update: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Setup function that runs before the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  LiquibaseGUITestUtils.createRmbArguments("Update", ContextOptions.LOAD_ALL_CONTEXT).forEach((pArgument) => {
    /**
     * Test case to execute the 'update' command from RMB.
     */
    test(`should execute 'update' command from ${pArgument.description}`, async function () {
      await pArgument.command(this, configurationName);
      // toggle the contexts
      await LiquibaseGUITestUtils.selectContext({ toggleAll: true });

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully."),
        "Notification did NOT show"
      );
      assert.ok(
        (await DockerTestUtils.executeMariaDBSQL("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'person'"))
          ?.length >= 1,
        "Table 'person' DOES NOT exist, while it should"
      );
    });
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
