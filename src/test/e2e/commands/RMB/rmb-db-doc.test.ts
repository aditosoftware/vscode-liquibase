import path from "node:path";
import assert from "node:assert";
import fs from "node:fs";
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

  const directoryForDbDoc = LiquibaseGUITestUtils.generateTemporaryFolder();

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

    fs.rmSync(directoryForDbDoc, { recursive: true });
  });

  for (const pArgument of LiquibaseGUITestUtils.createRmbArguments(
    "Generate database documentation (db-doc)...",
    ContextOptions.NO_CONTEXT
  )) {
    /**
     * Test case to execute the 'db-doc' command from RMB.
     */
    test(`should execute 'db-doc' command from ${pArgument.description}`, async function () {
      LiquibaseGUITestUtils.removeContentOfFolder(directoryForDbDoc);

      const input = await pArgument.command(this, configurationName);

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
  }
});
