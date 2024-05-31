import path from "path";
import assert from "assert";
import fs from "fs";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { ContextOptions } from "../../../../constants";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("db-doc: Right Click Menu", function () {
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

  LiquibaseGUITestUtils.createRmbArguments(
    "Generate database documentation (db-doc)",
    ContextOptions.NO_CONTEXT
  ).forEach((pArgument) => {
    /**
     * Test case to execute the 'db-doc' command from RMB.
     */
    test(`should execute 'db-doc' command from ${pArgument.description}`, async function () {
      const directoryForDbDoc = LiquibaseGUITestUtils.generateTemporaryFolder();

      const input = await pArgument.command(configurationName);

      // Set the output directory for the generated documentation.
      await LiquibaseGUITestUtils.selectFolder(input, directoryForDbDoc);

      assert.ok(
        await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'db-doc' was executed successfully.")
      );

      const indexFile = path.join(directoryForDbDoc, "index.html");
      assert.ok(
        await LiquibaseGUITestUtils.waitUntil(() => fs.existsSync(indexFile), `wait for ${indexFile} to exist`),
        "Did NOT create a DB-DOC Files"
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
