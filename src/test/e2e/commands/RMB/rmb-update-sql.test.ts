import path from "node:path";
import fs from "node:fs";
import assert from "node:assert";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { ContextOptions } from "../../../../constants";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("update-sql: Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  const temporaryFolder = LiquibaseGUITestUtils.generateTemporaryFolder();

  /**
   * Setup function that runs before the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();

    fs.rmSync(temporaryFolder, { recursive: true });
  });

  for (const pArgument of LiquibaseGUITestUtils.createRmbArguments(
    "Generate SQL File for incoming changes...",
    ContextOptions.LOAD_ALL_CONTEXT
  )) {
    /**
     * Test case to execute the 'update-sql' command from RMB.
     */
    test(`should execute 'update-sql' command from ${pArgument.description}`, async function () {
      LiquibaseGUITestUtils.removeContentOfFolder(temporaryFolder);

      // first, update the database
      await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT, "foo");

      // then generate the changelog
      const input = await pArgument.command(this, configurationName);
      await LiquibaseGUITestUtils.selectContext({ toggleAll: true });

      // select the folder where the data should be written
      await LiquibaseGUITestUtils.selectFolder(input, temporaryFolder);

      await input.setText("update.sql");
      await input.confirm();

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution(
          "Liquibase command 'update-sql' was executed successfully."
        ),
        "Notification did NOT show up"
      );
      const updateFile = path.join(temporaryFolder, "update.sql");
      await LiquibaseGUITestUtils.waitUntil(
        () => fs.existsSync(updateFile),
        `Update file should exist under ${updateFile}`
      );
      chai.assert.pathExists(updateFile);
    });
  }
});
