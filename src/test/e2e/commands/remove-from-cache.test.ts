import assert from "node:assert";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";
import { ContextOptions, RemoveCacheOptions } from "../../../constants";
import { ModalDialog } from "vscode-extension-tester";
import { DockerTestUtils } from "../../suite/DockerTestUtils";
import chai from "chai";
import chaiString from "chai-string";

chai.use(chaiString);

/**
 * Tests the removing of the cache values.
 */
suite("Remove any values from the recently loaded elements", () => {
  /**
   * The name of the configuration that was created during the setup.
   */
  let configurationName: string;

  /**
   * Set up the test suite.
   */
  suiteSetup(async function () {
    configurationName = await LiquibaseGUITestUtils.setupTests();
  });

  /**
   * Teardown function that runs after the test suite.
   */
  suiteTeardown(async () => {
    await DockerTestUtils.stopAndRemoveContainer();
  });

  /**
   * Trying to close the modal dialog after each test, if it remains open.
   */
  teardown(async () => {
    try {
      const modalDialog = new ModalDialog();
      await modalDialog.close();
    } catch (e) {
      console.error(`error while trying to close the dialog ${e}`);
    }
  });

  /**
   * Tests that there are no elements to remove when there are no cached values.
   */
  test("should not remove anything when no elements are there", async () => {
    // first, remove the whole cache
    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT);
    await LiquibaseGUITestUtils.removeWholeCache();

    // then try to execute the command a second time
    await LiquibaseGUITestUtils.startCommandExecution({
      command: "Cache: Remove any values from the recently loaded elements...",
    });

    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("There are no elements stored to remove"));
  });

  /**
   * Tests that the whole cache can be removed successfully.
   */
  test("should remove recently loaded values", async () => {
    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT);
    await LiquibaseGUITestUtils.removeWholeCache();

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Successfully removed all recently loaded elements.")
    );
  });

  /**
   * Tests that the selected connections can be removed successfully.
   */
  test("should remove connections", async () => {
    await LiquibaseGUITestUtils.executeUpdate(configurationName, ContextOptions.LOAD_ALL_CONTEXT);

    const input = await LiquibaseGUITestUtils.startCommandExecution({
      command: "Cache: Remove any values from the recently loaded elements...",
    });

    await input.setText(RemoveCacheOptions.REMOVE_CONNECTION);
    await input.confirm();

    // select all connections
    await input.toggleAllQuickPicks(true);
    await input.confirm();

    const modalDialog = new ModalDialog();
    await modalDialog.pushButton("Delete");

    const successMessage = /Successfully removed .* from the recently loaded elements./;
    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution(successMessage));
    // find a notification for successful removing an element
    const notification = await LiquibaseGUITestUtils.assertIfNotificationExists(successMessage);
    assert.ok(notification, "notification does exist");
    chai.expect(await notification.getText()).to.contain(configurationName);
  });
});
