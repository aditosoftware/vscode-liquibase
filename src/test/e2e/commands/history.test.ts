import path from "path";
import fs from "fs";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 * Test suite for the 'history' command.
 */
suite("History", async function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test the 'history' command with TABULAR output format.
   */
  test("should execute 'history' command as TABULAR", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("history");

    await input.setText(configurationName);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(CommandUtils.WORKSPACE_PATH, "myFolder")); // TODO dynamischer output

    await input.setText("Test2.txt");
    await input.confirm();

    await input.setText("TABULAR");
    await input.confirm();

    await wait();

    assert.ok(fs.existsSync(path.join(CommandUtils.WORKSPACE_PATH, "myFolder", "Test2.txt")));
  });

  // todo beide methoden zusammenlegen?

  /**
   * Test the 'history' command with TEXT output format.
   */
  test("should execute 'history' command as TEXT", async function () {
    this.timeout(40_000);
    await wait();

    const input = await LiquibaseGUITestUtils.startCommandExecution("history");

    await input.setText(configurationName);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(CommandUtils.WORKSPACE_PATH, "myFolder")); // TODO dynamischer output

    await input.setText("Test.txt");
    await input.confirm();

    await input.setText("TEXT");
    await input.confirm();

    await wait();

    assert.ok(fs.existsSync(path.join(CommandUtils.WORKSPACE_PATH, "myFolder", "Test.txt")));
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
