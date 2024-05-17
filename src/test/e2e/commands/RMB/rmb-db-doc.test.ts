import path from "path";
import assert from "assert";
import fs from "fs";
import { InputBox } from "vscode-extension-tester";
import { CommandUtils, openAndSelectRMBItemFromChangelog, wait } from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
import { randomUUID } from "crypto";

/**
 * Test suite for the Right Click Menu functionality.
 */
suite("Right Click Menu", function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Setup function that runs before the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test case to execute the 'db-doc' command.
   */
  test("should execute 'db-doc' command", async function () {
    this.timeout(50_000);

    const directoryForDbDoc = path.join(process.cwd(), "out", "temp", "workspace", "output", randomUUID());
    fs.mkdirSync(directoryForDbDoc);

    await CommandUtils.resetDB(CommandUtils.pool);

    await openAndSelectRMBItemFromChangelog("Generate database documentation (db-doc)");
    await wait();

    const input = await InputBox.create();

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.noContext);
    await input.confirm();

    // Set the output directory for the generated documentation.
    await CommandUtils.selectFolder(input, directoryForDbDoc);

    await wait();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'db-doc' was executed successfully.")
    );
    assert.ok(fs.existsSync(path.join(directoryForDbDoc, "index.html")), "Did NOT create a DB-DOC Files");
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
