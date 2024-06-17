import { InputBox } from "vscode-extension-tester";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import assert from "assert";
import path from "path";
import * as fs from "fs";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import { CHOOSE_CHANGELOG_OPTION, ContextOptions } from "../../../constants";

suite("changelog-selection", () => {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  const secondChangelogFile = "second_changelog.xml";
  const secondChangelogPath = path.join(LiquibaseGUITestUtils.LIQUIBASE_FOLDER, secondChangelogFile);

  /**
   * Sets up the test suite before running the tests.
   */
  suiteSetup(async function () {
    // create a dummy file
    fs.copyFileSync(LiquibaseGUITestUtils.CHANGELOG_FILE, secondChangelogPath);

    configurationName = await LiquibaseGUITestUtils.setupTests({ addChangelog: true });
  });

  /**
   * Stop and remove the container after the test.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });

  /**
   * Tests that the changelog can be selected correctly.
   *
   * For this, the validate command is executed three times:
   * 1. With the changelog from the liquibase.properties file
   * 2. With the changelog from the file chooser
   * 2. With the changelog from the recently selected elements
   */
  test("should select changelog correctly", async () => {
    // first, remove everything from the cache to have a clean project
    await LiquibaseGUITestUtils.removeWholeCache(true);

    const savedChangelog = path.join(".liquibase", "changelog.xml");
    const secondChangelog = path.join(".liquibase", secondChangelogFile);

    //// First command execution: changelog from configuration is selected

    let input = await startValidateExecution([savedChangelog, CHOOSE_CHANGELOG_OPTION], configurationName);

    // select the first element
    await input.selectQuickPick(savedChangelog);

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully.")
    );

    //// Second command execution: Changelog is chosen

    // now start again, we should have the currently selected changelog in the selection as well
    input = await startValidateExecution([savedChangelog, CHOOSE_CHANGELOG_OPTION, savedChangelog], configurationName);

    // let the file be chosen
    await input.selectQuickPick(CHOOSE_CHANGELOG_OPTION);

    // and select the second changelog
    await input.setText(secondChangelogPath);
    await input.selectQuickPick(secondChangelogFile);

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully.")
    );

    //// Third command execution: recently used changelog is used

    // now start again, we should have the second changelog there as well
    input = await startValidateExecution(
      [savedChangelog, CHOOSE_CHANGELOG_OPTION, secondChangelog, savedChangelog],
      configurationName
    );
    // select the second changelog again in order to run the command
    await input.selectQuickPick(secondChangelog);

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'validate' was executed successfully.")
    );
  });
});

/**
 * Starts the execution of the validate command.
 *
 * @param expectedLabels - the expected labels from the changelog selection dialog
 * @param configurationName - the configuration name that should be selected
 * @returns the input box where other inputs can be done
 */
async function startValidateExecution(expectedLabels: string[], configurationName: string): Promise<InputBox> {
  const input = await LiquibaseGUITestUtils.startCommandExecution({
    command: "validate",
    configurationName,
  });

  const labels: string[] = [];
  for (const quickPickItem of await input.getQuickPicks()) {
    const label = await quickPickItem.getLabel();
    labels.push(label);
  }
  assert.deepStrictEqual(labels, expectedLabels, "initial labels should include changelogs label and choose label");
  return input;
}
