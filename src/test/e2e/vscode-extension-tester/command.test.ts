import { EditorView, InputBox, NotificationType, StatusBar, VSBrowser, Workbench } from "vscode-extension-tester";
import assert from "assert";
import path from "path";

/**
 * Tests some commands.
 */
suite("Command tests", () => {
  /**
   * Opens a temp workspace and closes all editors.
   */
  suiteSetup(async function () {
    this.timeout(40_000);

    await VSBrowser.instance.openResources(path.join(process.cwd(), "out", "temp", "workspace"));

    await new EditorView().closeAllEditors();
  });

  /**
   * Executes the `liquibase.addExistingConfiguration` command.
   */
  test("should execute command", async function () {
    this.timeout(40_000);

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
    await new Promise((r) => setTimeout(r, 1_000));

    // then wait until the Activating Extensions from the status bar disappears
    for (let i = 0; i < 10; i++) {
      const activateProgress = await new StatusBar().getItem("Activating Extensions...");
      if (activateProgress) {
        await new Promise((r) => setTimeout(r, 1_000));
      } else {
        break;
      }
    }

    // Input the name
    await input.setText("dummy");
    await input.confirm();

    // select the folder
    await input.setText(
      path.join(process.cwd(), "src", "test", "e2e", "vscode-extension-tester", "dummy.liquibase.properties")
    );
    // and the file
    await input.selectQuickPick("dummy.liquibase.properties");

    // get all notifications
    const center = await new Workbench().openNotificationsCenter();
    const notifications = await center.getNotifications(NotificationType.Info);
    const messages: string[] = [];
    for (const notification of notifications) {
      messages.push(await notification.getMessage());
    }

    // check that info for successfully adding the dummy config is there
    assert.ok(messages.includes("Configuration for dummy was successfully saved."), messages.join(", "));
  });
});
