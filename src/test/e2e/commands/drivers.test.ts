import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import path from "path";
import fs from "fs";
import { InputBox } from "vscode-extension-tester";

/**
 * Test suite for the 'Drivers ...' command.
 */
suite("Drivers ...", function () {
  /**
   * Sets up the test suite before running any tests.
   */
  suiteSetup(async function () {
    await LiquibaseGUITestUtils.openWorkspaceAndInitializeExtension();
    //create a dummy jar file
    fs.writeFileSync(path.join(LiquibaseGUITestUtils.WORKSPACE_PATH, "dummy.jar"), "");
  });

  /**
   * Test case for adding a new driver with all input validations.
   */
  test("should open the 'Drivers ...' command and add a new driver with all input validations", async function () {
    const input = await LiquibaseGUITestUtils.startCommandExecution({ command: "drivers..." });

    await input.selectQuickPick("Add New Driver");
    await input.confirm();

    await LiquibaseGUITestUtils.selectFolder(input, LiquibaseGUITestUtils.WORKSPACE_PATH);

    await assertEnclosingElementContainsText(input, "Select the driver file you want to add (Step 1 of 6)");
    await assertEnclosingElementContainsText(input, "Please select a file.");

    await writeInput(input, path.join(LiquibaseGUITestUtils.WORKSPACE_PATH, "dummy.jar"));
    await input.confirm();

    // visualName

    await writeInput(input, " ");

    await assertEnclosingElementContainsText(input, "Enter the visual name of the driver (Step 2 of 6)");
    await assertEnclosingElementContainsText(input, "Driver name must not be empty");

    await writeInput(input, "visualName");

    // jdbcName

    await writeInput(input, " ");

    await assertEnclosingElementContainsText(input, "Enter the jdbc name of the driver (Step 3 of 6)");
    await assertEnclosingElementContainsText(input, "JDBC name must not be empty");

    await writeInput(input, "jdbcName");

    // driverClass

    await writeInput(input, " ");

    await assertEnclosingElementContainsText(input, "Enter the driver class of the driver (Step 4 of 6)");
    await assertEnclosingElementContainsText(input, "Driver class must not be empty");

    await writeInput(input, "driverClass");

    // defaultPort

    await writeInput(input, " ");

    await assertEnclosingElementContainsText(input, "Enter the default port of the driver (Step 5 of 6)");
    await assertEnclosingElementContainsText(input, "Port must not be empty");

    await writeInput(input, "a");

    // check for NaN

    await assertEnclosingElementContainsText(input, "Enter the default port of the driver (Step 5 of 6)");
    await assertEnclosingElementContainsText(input, "Port must be a number");

    await writeInput(input, "1");

    // separator

    await writeInput(input, " ");

    await assertEnclosingElementContainsText(input, "Enter the separator of the driver (Step 6 of 6)");
    await assertEnclosingElementContainsText(input, "Separator must not be empty");

    await writeInput(input, "separator");

    // check if the driver was added

    await LiquibaseGUITestUtils.startCommandExecution({ command: "Drivers ..." });

    const allDrivers: string[] = [];
    const quickPickItems = await input.getQuickPicks();

    for (const driver of quickPickItems) {
      allDrivers.push(await driver.getLabel());
    }

    assert.ok(allDrivers.includes("visualName"), "Custom driver was not added");

    await input.cancel();
  });
});

/**
 * Writes a text to an input box and confirms it.
 *
 * @param input - the input box
 * @param text - the text that should be written
 */
async function writeInput(input: InputBox, text: string): Promise<void> {
  await input.setText(text);
  await input.confirm();
}

/**
 * Asserts that the enclosing element of an input box contains a specific text.
 *
 * @param input - the input box
 * @param text - the text that should be contained in the enclosing element
 */
async function assertEnclosingElementContainsText(input: InputBox, text: string): Promise<void> {
  assert.ok(
    (await input.getEnclosingElement().getText()).includes(text),
    "Enclosing element does not contain the text '" + text + "'"
  );
}
