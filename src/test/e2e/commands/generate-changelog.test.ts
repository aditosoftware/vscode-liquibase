import path from "path";
import assert from "assert";
import fs from "fs";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils, wait } from "../CommandUtils";

suite("generate changelog", function () {
  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
   *
   */
  test("should execute 'generate changelog' command", async function () {
    this.timeout(80_000);
    await CommandUtils.resetDB(CommandUtils.pool);

    await DockerTestUtils.executeMariaDBSQL(
      CommandUtils.createPool("data"),
      "CREATE TABLE test_table (column1 char(36), column2 varchar(255))"
    );

    const input = await LiquibaseGUITestUtils.startCommandExecution("generate changelog");

    await input.setText("dummy");
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));
    await input.confirm();
    await input.confirm();

    await input.confirm();

    await wait();
    await wait();

    assert.ok(
      fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "changelog.xml")),
      "File does NOT exist"
    );
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
