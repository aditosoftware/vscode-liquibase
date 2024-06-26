import assert from "assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import * as fs from "fs";
import { VSBrowser } from "vscode-extension-tester";

/**
 * Tests the converting from one format to another format.
 */
suite("convert format", () => {
  const formats = ["SQL", "YAML", "XML", "JSON"];

  /**
   * Opens the workspace before the tests
   */
  suiteSetup(async () => {
    await LiquibaseGUITestUtils.openWorkspaceAndInitializeExtension();
  });

  formats.forEach((pFormat) => {
    /**
     * Tests the converting of a folder to a new format.
     */
    test(`should convert folder to format ${pFormat}`, async () => {
      await assertConverting(
        "Converts a folder and its subfolders from one liquibase format to another",
        LiquibaseGUITestUtils.LIQUIBASE_FOLDER,
        pFormat,
        `Converting the changelogs to ${pFormat} was executed successfully. Please check the files for correctness.`
      );
    });
  });

  formats.forEach((pFormat) => {
    /**
     * Tests the converting of a file to a new format.
     */
    test(`should convert file to format ${pFormat}`, async () => {
      await assertConverting(
        "Converts a file from one liquibase format to another",
        LiquibaseGUITestUtils.CHANGELOG_FILE,
        pFormat,
        `Converting the changelogs to ${pFormat} was executed successfully. Please check the files for correctness.`
      );
    });
  });

  // FIXME RMB e2e tests!
  // LiquibaseGUITestUtils.createRmbArguments(   "Converts a file from one liquibase format to another").forEach((pArgument) => {
  //   /**
  //    * Test case for executing the 'Unexpected Changesets' command from RMB.
  //    */
  //   test(`should execute 'Unexpected Changesets' command from ${pArgument.description}`, async function () {
  //     await pArgument.command(configurationName);

  //     assert.ok(
  //       await LiquibaseGUITestUtils.waitForCommandExecution(
  //         "Liquibase command 'unexpected-changesets' was executed successfully."
  //       ),
  //       "Notification did NOT show"
  //     );
  //   });
  // });

  // TODO fail-Fälle auch?
});

/**
 * Asserts that the converting does work.
 *
 * @param convertCommand - the command that should be called
 * @param toConvert - the file or folder that should be converted
 * @param format - the format that should be converted to
 * @param expectedCommandEndMessage - the expected message that should be given when the command was executed
 */
async function assertConverting(
  convertCommand: string,
  toConvert: string,
  format: string,
  expectedCommandEndMessage: string
): Promise<void> {
  const tempOutput = LiquibaseGUITestUtils.generateTemporaryFolder();

  const input = await LiquibaseGUITestUtils.startCommandExecution({
    command: convertCommand,
  });

  // the input
  if (fs.statSync(toConvert).isDirectory()) {
    await LiquibaseGUITestUtils.selectFolder(input, toConvert);
    await VSBrowser.instance.takeScreenshot("04.png");
  } else {
    await input.setText(toConvert);
    await input.selectQuickPick("changelog.xml");
  }

  await VSBrowser.instance.takeScreenshot("05.png");

  // the output
  await LiquibaseGUITestUtils.selectFolder(input, tempOutput);

  // the format
  await input.setText(format);
  await input.confirm();

  // for sql formats, we need the database type
  if (format === "SQL") {
    await input.setText("mariadb");
    await input.confirm();
  }

  assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution(expectedCommandEndMessage));

  const files = fs.readdirSync(tempOutput);

  assert.ok(files.length === 1, "one file should be there" + files);
  assert.ok(files[0].endsWith(format.toLowerCase()), `file ${files[0]} should have new extension`);
}
