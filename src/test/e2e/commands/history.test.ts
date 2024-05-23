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

  const temporaryFolder = CommandUtils.generateTemporaryFolder();

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   * Test the 'history' command with TABULAR and TEXT output format.
   */
  ["TABULAR", "TEXT"].forEach((pHistoryOption) => {
    test(`should execute 'history' command as ${pHistoryOption}`, async function () {
      this.timeout(40_000);

      const fileName = `history_${pHistoryOption}.txt`;

      const input = await LiquibaseGUITestUtils.startCommandExecution("history");

      await input.setText(configurationName);
      await input.confirm();

      await CommandUtils.selectFolder(input, temporaryFolder);

      await input.setText(fileName);
      await input.confirm();

      await input.setText(pHistoryOption);
      await input.confirm();

      await wait();

      assert.ok(fs.existsSync(path.join(temporaryFolder, fileName)));
    });
  });

  /**
   * Clean up after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
