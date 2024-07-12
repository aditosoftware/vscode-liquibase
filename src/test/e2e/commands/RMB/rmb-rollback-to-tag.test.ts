import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import assert from "assert";
import { randomUUID } from "crypto";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the "Rollback to Tag" command in the Right Click Menu.
 */
suite("rollback-to-tag: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Setup function that runs before all tests in the suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Test case for executing the "rollback-to-tag" command from RMB.
   */
  LiquibaseGUITestUtils.createRmbArguments("Rollback to Tag...", ContextOptions.LOAD_ALL_CONTEXT).forEach(
    (pArgument) => {
      test(`should execute 'rollback-to-tag' command from ${pArgument.description}`, async function () {
        const tagName = randomUUID();

        // update one dataset
        await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT, "foo");

        // Set tag
        await LiquibaseGUITestUtils.executeCreateTag(configurationName, tagName);

        // Update all datasets
        await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.USE_RECENTLY_LOADED);

        const input = await pArgument.command(this, configurationName);

        // toggle the contexts
        await LiquibaseGUITestUtils.selectContext({ toggleAll: true });

        // set the tag name
        await input.setText(tagName);
        await input.confirm();

        // Check if the message is popping up
        assert.ok(
          await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'rollback' was executed successfully.")
        );
        assert.ok(
          (
            await DockerTestUtils.executeMariaDBSQL(
              "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'company'"
            )
          )?.length === 0,
          "Rollback did not remove values from DB"
        );
      });
    }
  );

  /**
   * Teardown function that runs after all tests in the suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
