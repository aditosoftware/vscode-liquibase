import path from "path";
import assert from "assert";
import fs from "fs";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "./commandUtils";

/**
  * This suite of tests is designed to validate the functionality of the 'db-doc' command in a Liquibase extension for Visual Studio Code.
  */
suite("db-doc", function () {

    suiteSetup(async function () {
        await CommandUtils.setupTests();
    });
    /**
     * This test verifies that the 'db-doc' command is executed successfully.
     * It sets up a temporary database, generates documentation using Liquibase, and checks for the existence of the generated documentation file.
     */
    test("should execute 'db-doc' command", async function () {
      // Extend the timeout to accommodate potentially long-running Liquibase operations.
      this.timeout(80_000);

      // Reset the temporary database to ensure a clean state.
      await CommandUtils.resetDB(CommandUtils.pool);

      // Prepare input for the command execution.
      const input = await LiquibaseGUITestUtils.preCommandExecution("Generate database documentation (db-doc)");

      await input.setText('dummy');
      await input.confirm();
      await wait();

      // Set the path to the Liquibase changelog file.
      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
      await input.selectQuickPick(1);
      await wait();

      // Set the output directory for the generated documentation.
      await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "db-doc"));

      // Confirm the output directory. (Note: Due to an issue, double confirmation is required)
      await input.confirm();
      await input.confirm(); // Double confirmation workaround

      await wait();
      await wait();

      // Assert that the 'db-doc' command was executed successfully.
      assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'db-doc' was executed successfully."));

      // Assert that a file of the generated documentation exists.
      assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "db-doc", "index.html")));
    });
  });