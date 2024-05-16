import path from "path";
import fs from "fs";
import assert from "assert";
import { CommandUtils, wait } from "../CommandUtils";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { By, InputBox, StatusBar, Workbench } from "vscode-extension-tester";
import { randomUUID } from "crypto";

suite("Add existing liquibase.properties to the configuration", function () {
  suiteSetup(async function () {
    this.timeout(50_000);
    await CommandUtils.openWorkspace();
  });

  test("should add a liquibase.properties file to the config", async function () {
    this.timeout(50_000);

    const configName = randomUUID();
    const propertiesFileName = "dummy.liquibase.properties";

    // we need an input box to open
    // extensions usually open inputs as part of their commands
    // the built-in input box we can use is the command prompt/palette
    const prompt = await new Workbench().openCommandPrompt();

    // openCommandPrompt returns an InputBox, but if you need to wait for an arbitrary input to appear
    // note this does not open the input, it simply waits for it to open and constructs the page object
    const input = await InputBox.create();

    // execute our command
    await prompt.setText(">liquibase.addExistingConfiguration");
    await prompt.confirm();

    // wait a bit initially
    await wait(1000);

    // then wait until the Activating Extensions from the status bar disappears
    for (let i = 0; i < 10; i++) {
      const activateProgress = await new StatusBar().getItem("Activating Extensions...");
      if (activateProgress) {
        await wait(1000);
      } else {
        break;
      }
    }

    // Input the name
    await input.setText(configName);
    await input.confirm();

    await CommandUtils.selectFolder(input, path.join(process.cwd(), "out", "temp", "workspace"));

    // select the folder
    await input.findElement(By.linkText(propertiesFileName)).click();

    await wait();

    const settingsFile = path.join(process.cwd(), "out", "temp", "workspace", "data", "liquibase", "settings.json");
    assert.ok(fs.existsSync(settingsFile));

    // get the content of the setting file
    const data = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    const dataForName = data[configName];

    // and check that there is the config inside
    assert.ok(dataForName);
    assert.strictEqual(
      dataForName.toLowerCase(),
      path.join(process.cwd(), "out", "temp", "workspace", propertiesFileName).toLowerCase()
    );
  });

  suiteTeardown(async function () {
    await DockerTestUtils.stopAndRemoveContainer();
  });
});
