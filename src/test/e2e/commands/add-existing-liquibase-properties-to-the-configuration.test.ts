import path from "path";
import fs from "fs";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import assert from "assert";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";

suite("Add existing liquibase.properties to the configuration", function () {
  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.setupTests();
  });

  test("should add a liquibase.properties file to the config", async function () {
    this.timeout(50_000);
    await DockerTestUtils.stopAndRemoveContainer();
    await LiquibaseGUITestUtils.addConfiguration(
      "dummy2",
      path.join(process.cwd(), "out", "temp", "workspace"),
      "dummy2.liquibase.properties"
    );

    await wait();
    await wait();
    await wait();

    assert.ok(
      fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "data", "liquibase", "settings.json"))
    );
    //TODO: better assertion
  });

  suiteTeardown(async function () {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
