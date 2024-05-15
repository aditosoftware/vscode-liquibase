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

  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
   * 
   */
  test("should execute 'history' command as TABULAR", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("history");

    await input.setText('dummy');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase"));
    await input.confirm(); //this dumb shit only works if you DOUBLE CONFIRM IT -> https://github.com/redhat-developer/vscode-extension-tester/blob/b283b0f7a1ca451b9decf6b08d76fda24134f897/docs/Home.md?plain=1#L77
    await input.confirm();

    await input.setText("Test2.txt");
    await input.confirm();

    await input.setText('TABULAR');
    await input.confirm();

    await wait();

    assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "Test2.txt")));
  });

  /**
   * 
   */
  test("should execute 'history' command as TEXT", async function () {
    this.timeout(40_000);
    await wait();

    const input = await LiquibaseGUITestUtils.startCommandExecution("history");

    await input.setText('dummy');
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase"));
    await input.confirm(); //this dumb shit only works if you DOUBLE CONFIRM IT -> https://github.com/redhat-developer/vscode-extension-tester/blob/b283b0f7a1ca451b9decf6b08d76fda24134f897/docs/Home.md?plain=1#L77
    await input.confirm();

    await input.setText("Test.txt");
    await input.confirm();

    await input.setText('TEXT');
    await input.confirm();

    await wait();

    assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "Test.txt")));
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
