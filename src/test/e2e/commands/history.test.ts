import path from "path";
import fs from "fs";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

/**
 *
 */
suite("History", async function () {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  suiteSetup(async function () {
    this.timeout(50_000);
    configurationName = await CommandUtils.setupTests();
  });

  /**
   *
   */
  test("should execute 'history' command as TABULAR", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("history");

    await input.setText(configurationName);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(process.cwd(), "out", "temp", "workspace", "liquibase"));

    await input.setText("Test2.txt");
    await input.confirm();

    await input.setText("TABULAR");
    await input.confirm();

    await wait();

    assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "Test2.txt")));
  });

  // FIXME diese beiden Methoden in eine zusammenlegen

  /**
   *
   */
  test("should execute 'history' command as TEXT", async function () {
    this.timeout(40_000);
    await wait();

    const input = await LiquibaseGUITestUtils.startCommandExecution("history");

    await input.setText(configurationName);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(process.cwd(), "out", "temp", "workspace", "liquibase"));

    await input.setText("Test.txt");
    await input.confirm();

    await input.setText("TEXT");
    await input.confirm();

    await wait();

    assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "Test.txt")));
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
