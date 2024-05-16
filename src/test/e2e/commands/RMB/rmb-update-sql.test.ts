import path from "path";
import fs from "fs";
import assert from "assert";
import { CommandUtils, wait, openAndSelectRMBItem } from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";

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
   * Test case to execute the 'update-sql' command.
   */
  test("should execute 'update-sql' command", async function () {
    this.timeout(80_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    const input = await LiquibaseGUITestUtils.startCommandExecution("update");

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.setText("foo");
    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await wait();

    await openAndSelectRMBItem("Generate SQL File for incoming changes");
    await wait();

    await input.setText(configurationName);
    await input.confirm();

    await input.setText(CommandUtils.loadAllContext);
    await input.confirm();

    await wait();

    await input.toggleAllQuickPicks(true);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));

    await input.setText("update.sql");
    await input.confirm();

    await wait();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update-sql' was executed successfully."),
      "Notification did NOT show up"
    );
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "update.sql")),
      "Did NOT create a SQL File"
    );
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
