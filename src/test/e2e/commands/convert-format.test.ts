import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import * as fs from "fs";
import { InputBox } from "vscode-extension-tester";
import chai from "chai";
import chaiFs from "chai-fs";
import chaiString from "chai-string";
import assert from "assert";

chai.use(chaiFs);
chai.use(chaiString);

const tempOutput = LiquibaseGUITestUtils.generateTemporaryFolder();

/**
 * Tests the converting from one format to another format.
 */
suite("convert format", () => {
  const formats = ["SQL", "YAML", "XML", "JSON"];

  /**
   * Opens the workspace before the tests
   */
  suiteSetup(async () => {
    await LiquibaseGUITestUtils.openWorkspace();
  });

  /**
   * Removes the temporary output folder after all tests.
   */
  suiteTeardown("remove temporary folder", () => {
    fs.rmSync(tempOutput, { recursive: true });
  });

  formats.forEach((pFormat) => {
    /**
     * Tests the converting of a folder to a new format.
     */
    test(`should convert folder to format ${pFormat}`, async () => {
      await assertConverting(
        "Convert a folder and its subfolders from one liquibase format to another...",
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
        "Convert a file from one liquibase format to another...",
        LiquibaseGUITestUtils.CHANGELOG_FILE,
        pFormat,
        `Converting the changelogs to ${pFormat} was executed successfully. Please check the files for correctness.`
      );
    });
  });

  formats.forEach((pFormat) => {
    LiquibaseGUITestUtils.createRmbArguments("Convert a file from one liquibase format to another...").forEach(
      (pArgument) => {
        /**
         * Tests that the converting via RMB does work.
         */
        test(`should execute converting of changelog to ${pFormat} from ${pArgument.description}`, async function () {
          const input = await pArgument.command(this);

          await assertConvertingWithNoChangelogSelection(
            input,
            pFormat,
            `Converting the changelogs to ${pFormat} was executed successfully. Please check the files for correctness.`
          );
        });
      }
    );
  });
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
  const input = await LiquibaseGUITestUtils.startCommandExecution({
    command: convertCommand,
  });

  // the input
  if (fs.statSync(toConvert).isDirectory()) {
    await LiquibaseGUITestUtils.selectFolder(input, toConvert);
  } else {
    await input.setText(toConvert);
    await input.selectQuickPick("changelog.xml");
  }

  // the output
  await assertConvertingWithNoChangelogSelection(input, format, expectedCommandEndMessage);
}

/**
 * Asserts that the converting does work.
 * This method does not do any changelog input. This should be done before (either by RMB or setting the input).
 *
 * @param input - the input where all inputs should be taken
 * @param format - the format that should be converted to
 * @param expectedCommandEndMessage - the expected message that should be given when the command was executed
 */
async function assertConvertingWithNoChangelogSelection(
  input: InputBox,
  format: string,
  expectedCommandEndMessage: string
): Promise<void> {
  LiquibaseGUITestUtils.removeContentOfFolder(tempOutput);

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

  await LiquibaseGUITestUtils.waitUntil(
    () => fs.readdirSync(tempOutput).length !== 0,
    `waiting for file to be there in ${tempOutput}`
  );

  const files = fs.readdirSync(tempOutput);
  for (const file of files) {
    chai.expect(file).to.endWith(format.toLowerCase());
  }
}
