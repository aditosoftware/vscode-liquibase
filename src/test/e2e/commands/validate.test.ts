import path from "path";
import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { CommandUtils } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

suite("Validate", function () {
  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  /**
   *
   */
  test("should execute 'validate' command", async function () {
    this.timeout(40_000);

    const input = await LiquibaseGUITestUtils.startCommandExecution("validate");

    await input.setText("dummy");
    await input.confirm();

    await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
    await input.selectQuickPick(1);

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully.")
    );
  });

  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
