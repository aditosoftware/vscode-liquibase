import {
  BottomBarPanel,
  EditorView,
  InputBox,
  ModalDialog,
  Notification,
  NotificationType,
  OutputView,
  SideBarView,
  TextEditor,
  VSBrowser,
  Workbench,
  TreeItem,
} from "vscode-extension-tester";
import assert from "assert";
import { randomUUID } from "crypto";
import { WebviewTestUtils } from "./webview/WebviewTestUtils";
import { DockerTestUtils } from "../suite/DockerTestUtils";
import path from "path";
import * as fs from "fs";
import { ContextOptions, RemoveCacheOptions } from "../../constants";

/**
 * General Util methods for e2e / GUI tests with Liquibase.
 */
export class LiquibaseGUITestUtils {
  /**
   * The path to the workspace.
   */
  static readonly WORKSPACE_PATH = path.join(process.cwd(), "out", "temp", "workspace");

  /**
   * The path to the liquibase folder inside the workspace.
   */
  static readonly LIQUIBASE_FOLDER = path.join(this.WORKSPACE_PATH, ".liquibase");

  /**
   * The path to the changelog file inside the liquibase folder inside the workspace.
   */
  static readonly CHANGELOG_FILE = path.join(this.LIQUIBASE_FOLDER, "changelog.xml");

  /**
   * The output panel where all command output is written.
   */
  static outputPanel: OutputView;

  /**
   * Information, if the extension is active.
   */
  static extensionActive: boolean = false;

  //#region setup tests

  /**
   * Opens a temp workspace and closes all editors. Also starts the docker container when needed.
   */
  static async setupTests({
    startContainer = true,
  }: {
    /**
     * If the container should be started.
     */
    startContainer?: boolean;
  } = {}): Promise<string> {
    // start the container
    if (startContainer) {
      await DockerTestUtils.startContainer();
    }

    // open the workspace
    await this.openWorkspace();

    // create a configuration
    const configurationName = await this.createConfiguration();
    // after we have successfully created a config via the webview, the extension is definitely active
    this.extensionActive = true;

    // and close all editors
    await new EditorView().closeAllEditors();

    // open our output panel
    await LiquibaseGUITestUtils.openOutputPanel();

    return configurationName;
  }

  /**
   * Opens the output panel with the channel Liquibase.
   */
  private static async openOutputPanel(): Promise<void> {
    if (!this.outputPanel) {
      await VSBrowser.instance.driver.wait(
        async () => {
          try {
            this.outputPanel = await new BottomBarPanel().openOutputView();
            await this.outputPanel.selectChannel("Liquibase");
            return true;
          } catch (err) {
            console.error("error opening the output channel", err);
            return false;
          }
        },
        10_000,
        "showing the output channel"
      );
    }
  }

  /**
   * Opens the workspace.
   */
  static async openWorkspace(): Promise<void> {
    await VSBrowser.instance.openResources(this.WORKSPACE_PATH);
  }

  // #endregion

  //#region command start
  /**
   * Starts the execution of an command
   * @param pCommand - the command that should be executed
   * @param configurationName - the name of the configuration that should be automatically put into
   * @param changelogFile - if the changelog file should be automatically selected
   * @returns the input box for the commands
   */
  static async startCommandExecution({
    pCommand: command,
    configurationName,
    changelogFile,
  }: {
    pCommand: string;
    configurationName?: string;
    changelogFile?: boolean;
  }): Promise<InputBox> {
    const center = await this.clearNotifications();

    // we need an input box to open
    // extensions usually open inputs as part of their commands
    // the built-in input box we can use is the command prompt/palette
    const prompt = await center.openCommandPrompt();

    // openCommandPrompt returns an InputBox, but if you need to wait for an arbitrary input to appear
    // note this does not open the input, it simply waits for it to open and constructs the page object
    const input = await InputBox.create();

    // execute our command
    await prompt.setText(">Liquibase: " + command);
    await prompt.confirm();

    // then wait until the Activating Extensions from the status bar disappears
    await LiquibaseGUITestUtils.waitForExtensionToActivate();

    // input the configuration name
    if (configurationName) {
      await input.setText(configurationName);
      await input.confirm();
    }

    // Set the path to the Liquibase changelog file.
    if (changelogFile) {
      await input.setText(LiquibaseGUITestUtils.CHANGELOG_FILE);
      await input.selectQuickPick(1);
    }

    return input;
  }

  /**
   * Waits until the extension was activated.
   */
  static async waitForExtensionToActivate(): Promise<void> {
    if (this.extensionActive) {
      return;
    }

    await this.openOutputPanel();

    await VSBrowser.instance.driver.wait(
      async () => {
        const text = await this.outputPanel.getText();

        return text.includes("Liquibase extension was initialized correctly");
      },
      5000,
      "waiting for initialize message to occur"
    );

    this.extensionActive = true;
  }

  /**
   * Clears all notifications from the workbench.
   *
   * @returns the workbench
   */
  static async clearNotifications(): Promise<Workbench> {
    const center = new Workbench();
    const notification = await center.openNotificationsCenter();
    if ((await notification.getNotifications(NotificationType.Any)).length > 0) {
      await notification.clearAllNotifications();
    }

    await notification.close();
    return center;
  }

  /**
   * Creates a configuration.

   * @param databaseType - the type of the database that should be used for the configuration
   * @param port - the port that should be used for creating the configuration
   * @param databaseName - the name of the database 
   * @returns the name that was used for creating the configuration
   */
  static async createConfiguration(
    databaseType: "MariaDB" | "PostgreSQL" = "MariaDB",
    port: number = 3310,
    databaseName: string = DockerTestUtils.dbName
  ): Promise<string> {
    const name = randomUUID();

    // create a configuration
    await WebviewTestUtils.addConfigurationDataToWebview({
      name,
      buttonToClick: "saveButton",
      databaseType,
      port,
      databaseName,
    });

    return name;
  }

  /**
   * Sets a setting to the given value.
   *
   * @param settingId - the id of the setting
   * @param value - the value that should be set for the setting
   */
  static async setSetting(settingId: string, value: string | boolean): Promise<void> {
    const settingsEditor = await new Workbench().openSettings();

    // wait a bit for the settings to initialize
    await this.wait();

    // get the setting and set the new value
    const setting = await settingsEditor.findSettingByID(settingId);
    await setting.setValue(value);

    //double check, was the setting correctly updated
    assert.strictEqual(value, await setting.getValue());
  }

  /**
   * Creates a temporary folder for the tests.
   * @returns - the path to the temporary folder
   */
  static generateTemporaryFolder(): string {
    const tempDir = path.join(LiquibaseGUITestUtils.WORKSPACE_PATH, "output", randomUUID());
    fs.mkdirSync(tempDir, { recursive: true });
    return tempDir;
  }
  //#endregion

  //#region command end
  /**
   * Example wait condition for WebDriver. Wait for a notification with given text to appear.
   * Wait conditions resolve when the first truthy value is returned.
   * @param text - the text that should be in any notification
   * @param failOnWaitExceeded - if the method should fail, when no message with the given text was in the notifications. Default behavior is `true`.
   * @returns `true`, when the text was matched
   * @throws `AssertionError` - when after the wait time of 10.000 ms no notification with the given text was found
   */
  static async waitForCommandExecution(text: string | RegExp, failOnWaitExceeded: boolean = true): Promise<boolean> {
    const messages = new Set<string>();

    try {
      return await VSBrowser.instance.driver.wait(
        async () => {
          try {
            const notifications = await this.notificationExists(text);
            if (notifications.notification) {
              return true;
            } else if (notifications.otherNotification) {
              notifications.otherNotification.forEach((pNotification) => messages.add(pNotification));
            }
            return false;
          } catch (error) {
            console.error(error);
            return false;
          }
        },
        10_000,
        "waiting for the command execution to be done"
      );
    } catch (err) {
      console.error(err);
      if (failOnWaitExceeded) {
        const messageResult = Array.from(messages).join("; ");
        assert.fail(
          `Expected notification "${text}" be among the given notifications, but they were only the following notifications: ${messageResult}`
        );
      } else {
        return false;
      }
    }
  }

  /**
   * Checks if a notification exists.
   * @param text - the text that should be in any notification
   * @returns the found notification, if it exists
   * @throws `AssertionError` - when no notification with the given text was found
   */
  static async assertIfNotificationExists(text: string | RegExp): Promise<Notification | undefined> {
    const notification = await this.notificationExists(text);

    if (notification.notification) {
      return notification.notification;
    } else {
      assert.fail(
        `Expected notification ${text} be among the given notifications, but they were only ${notification.otherNotification}`
      );
    }
  }

  /**
   * Checks if a notification exits.
   *
   * @param text - the text that should be contained in the message
   * @returns the notification, if one was there with the text, or an array of all other notifications, if no notification with the given name was found
   */
  private static async notificationExists(
    text: string | RegExp
  ): Promise<{ notification?: Notification; otherNotification?: string[] }> {
    const messages: string[] = [];

    const center = await new Workbench().openNotificationsCenter();
    const notificationFromCenter = await center.getNotifications(NotificationType.Any);
    const notificationsFromWorkbench = await new Workbench().getNotifications();

    for (const notification of [...notificationFromCenter, ...notificationsFromWorkbench]) {
      const message = await notification.getMessage();
      messages.push(message);

      if (typeof text === "string") {
        if (message.includes(text)) {
          return { notification };
        }
      } else if (message.match(text)) {
        return { notification };
      }
    }

    // if no match, return the other notifications
    return { otherNotification: messages };
  }
  //#endregion

  //#region command execution

  /**
   * Executes a callback function for a matrix of options.
   *
   * @param callback - The function to be executed. It takes three parameters:
   *   - `option`: A string representing the current option.
   *   - `toggleContexts`: A function that toggles the contexts
   *   - `key`: A string representing the key associated with the current option.
   */
  static matrixExecution(callback: (option: string, toggleContexts: () => Promise<void>, key: string) => void): void {
    const options = [ContextOptions.NO_CONTEXT, ContextOptions.LOAD_ALL_CONTEXT, ContextOptions.USE_RECENTLY_LOADED];

    const execFunctions = {
      "all available contexts": () => this.selectContext({ toggleAll: true }),
      "the first available context": () => this.selectContext({ toggleAll: true, filterForInput: "foo" }),
      "no context": () => this.selectContext({ toggleAll: false }),
    };

    options.forEach((option) => {
      Object.entries(execFunctions).forEach(([key, exec]) => {
        callback(option, exec, key);
      });
    });
  }

  /**
   * Selects the what type of context and the contexts itself in the matrixExecution.
   * @param input - the inputBox on which the elements should be put into
   * @param option - the option what type of context should be used
   * @param toggleContexts - the function to toggle the contexts
   */
  static async selectContextsInMatrixExecution(
    input: InputBox,
    option: string,
    toggleContexts: () => Promise<void>
  ): Promise<void> {
    await input.setText(option);
    await input.confirm();

    if (option !== ContextOptions.NO_CONTEXT) {
      await toggleContexts();
    }
  }

  /**
   * Selects the folder and confirms the dialog
   * @param input - the input where the folder should be put into
   * @param folderName - the name of the folder
   * @see https://github.com/redhat-developer/vscode-extension-tester/blob/b283b0f7a1ca451b9decf6b08d76fda24134f897/docs/Home.md?plain=1#L77
   */
  static async selectFolder(input: InputBox, folderName: string): Promise<void> {
    const lastFolderName = path.basename(folderName);

    // set the dialog input to the folder name plus a path separator
    await input.setText(folderName + path.sep);

    // check if the folder name is there in the quick pick
    const optionForFolderName = await input.findQuickPick(lastFolderName);
    if (typeof optionForFolderName !== "undefined") {
      // if it is there, select it
      await input.selectQuickPick(lastFolderName);
    }

    // then confirm normally the dialog
    await input.confirm();
  }

  /**
   * Selects the context based on the provided options.
   *
   * @param options - The options for selecting the context.
   * - `toggleAll` - Flag indicating whether to toggle all contexts.
   * - filterForInput - The filtering that should happen before the toggle all
   * - `input` - The input box on which the filtering and toggling should be executed.
   */
  static async selectContext({
    toggleAll,
    filterForInput,
    input,
  }: {
    toggleAll: boolean;
    filterForInput?: string;
    input?: InputBox;
  }): Promise<void> {
    const inputBox = input || new InputBox();

    // wait until there are checkboxes loaded
    await VSBrowser.instance.driver.wait(
      async () => {
        const checkboxes = await inputBox.getCheckboxes();
        return checkboxes.length !== 0;
      },
      5000,
      "waiting for input checkboxes"
    );

    if (filterForInput) {
      await inputBox.setText(filterForInput);
    }
    await inputBox.toggleAllQuickPicks(toggleAll);

    await inputBox.confirm();
  }

  /**
   * Creates some RMB arguments for the tests.
   * @param name - the name of the command that should be called
   * @param contextOption - the possible context option that should be selected as second element in the dialogs (first element is always configuration)
   * @returns the arguments for this command
   */
  static createRmbArguments(name: string, contextOption?: ContextOptions): RmbArgument[] {
    return [
      {
        command: (configurationName: string) =>
          LiquibaseGUITestUtils.openAndSelectRMBItemFromChangelog(name, configurationName, contextOption),
        description: "RMB in file",
      },
      {
        command: (configurationName: string) =>
          LiquibaseGUITestUtils.openAndSelectRMBItemFromChangelogFromExplorer(name, configurationName, contextOption),
        description: "RMB in file explorer",
      },
    ];
  }

  /**
   * Opens the Liquibase context menu and selects the given action.
   *
   * This method will open an changelog before executing the action.
   *
   * @param action - the action that should be called
   * @param configurationName - the name of the configuration that should be set as first value
   * @param contextOption - the context that should be set as second value
   * @returns the input box that can be used for setting other values in the dialogs
   */
  static async openAndSelectRMBItemFromChangelog(
    action: string,
    configurationName?: string,
    contextOption?: ContextOptions
  ): Promise<InputBox> {
    await VSBrowser.instance.openResources(this.CHANGELOG_FILE);

    await this.openAndSelectRMBItemFromAlreadyOpenedFile(action);

    return LiquibaseGUITestUtils.inputBasicValuesForRMB(configurationName, contextOption);
  }

  /**
   * Opens the Liquibase context menu in the explorer side bar on the changelog file and selects the given action.
   * @param action - the name of the action
   * @param configurationName - the name of the configuration that should be set as first value
   * @param contextOption - the context that should be set as second value
   * @returns the input box that can be used for setting other values in the dialogs
   */
  static async openAndSelectRMBItemFromChangelogFromExplorer(
    action: string,
    configurationName?: string,
    contextOption?: ContextOptions
  ): Promise<InputBox> {
    await this.openAndSelectRMBItemFromExplorer(action, ".liquibase", "changelog.xml");

    return LiquibaseGUITestUtils.inputBasicValuesForRMB(configurationName, contextOption);
  }

  /**
   * Inputs some basic values for the RMB dialogs.
   * @param configurationName - the name of the configuration that should be set as first value
   * @param contextOption - the context that should be set as second value
   * @returns the input box that can be used for setting other values in the dialogs
   */
  private static async inputBasicValuesForRMB(
    configurationName?: string,
    contextOption?: ContextOptions
  ): Promise<InputBox> {
    const input = new InputBox();

    if (configurationName) {
      await input.setText(configurationName);
      await input.confirm();
    }

    if (contextOption) {
      await input.setText(contextOption);
      await input.confirm();
    }

    return input;
  }

  /**
   * Opens the explorer at a specific point and opens the context menu.
   * @param action - the name of the action that should be executed
   * @param topLevelItem - the name of the top level folder in the explorer
   * @param children - all the children folders and the file that should be selected in the specific order
   */
  static async openAndSelectRMBItemFromExplorer(
    action: string,
    topLevelItem: string,
    ...children: string[]
  ): Promise<void> {
    const explorer = await new SideBarView().getContent().getSection("workspace");

    // find the topLevelItem and expand it
    const topLevelNode = (await explorer.findItem(topLevelItem)) as TreeItem;
    assert.ok(topLevelNode);
    await topLevelNode.expand();

    // find all children recursively and expand them
    let lastChild: TreeItem | undefined;
    for (const child of children) {
      if (lastChild) {
        lastChild = (await lastChild.findChildItem(child)) as TreeItem;
      } else {
        lastChild = (await topLevelNode.findChildItem(child)) as TreeItem;
      }
      assert.ok(lastChild);
      await lastChild.expand();
    }

    assert.ok(lastChild);

    // Open context menu on file in explorer
    const menu = await lastChild.openContextMenu();
    // open the liquibase submenu
    const liquibaseContextMenu = await menu.select("Liquibase");
    assert.ok(liquibaseContextMenu);
    // and select the action
    await liquibaseContextMenu.select(action);
  }

  /**
   * Opens the Liquibase context menu and selects the given action.
   *
   * @param action - the action that should be called
   */
  static async openAndSelectRMBItemFromAlreadyOpenedFile(action: string): Promise<void> {
    const editor = new TextEditor();
    const menu = await editor.openContextMenu();
    const liquibaseMenu = await menu.select("Liquibase");
    await liquibaseMenu?.select(action);
  }

  //#endregion

  //#region common used commands
  /**
   * Removes the whole cache.
   */
  static async removeWholeCache(): Promise<void> {
    const input = await LiquibaseGUITestUtils.startCommandExecution({
      pCommand: "Cache: Removes any values from the recently loaded elements",
    });

    await input.setText(RemoveCacheOptions.WHOLE_CACHE);
    await input.confirm();

    const modalDialog = new ModalDialog();
    await modalDialog.pushButton("Delete");
  }

  /**
   * Executes the update command while selecting a number of contexts.
   *
   * @param configurationName - the name of the current configuration
   * @param contextOption - the option how to load the contexts
   * @param filterTextForContexts - the text for which the contexts should be filtered before selecting all of them
   */
  static async executeUpdate(
    configurationName: string,
    contextOption: ContextOptions.LOAD_ALL_CONTEXT | ContextOptions.USE_RECENTLY_LOADED,
    filterTextForContexts?: string
  ): Promise<void> {
    const input = await LiquibaseGUITestUtils.startCommandExecution({
      pCommand: "update",
      configurationName,
      changelogFile: true,
    });

    await input.setText(contextOption);
    await input.confirm();

    await this.selectContext({ toggleAll: true, filterForInput: filterTextForContexts, input });

    assert.ok(
      await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully")
    );
  }

  /**
   * Executes the "Create Tag" command.
   *
   * @param configurationName - the name of the configuration
   * @param tagName - the name of the tag that should be created
   */
  static async executeCreateTag(configurationName: string, tagName: string): Promise<void> {
    const input = await LiquibaseGUITestUtils.startCommandExecution({ pCommand: "create tag", configurationName });

    await input.setText(tagName);
    await input.confirm();

    assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'tag' was executed successfully"));
  }
  //#endregion

  /**
   * Waits a given time in order to have everything there.
   *
   * just wait, pls
   *
   * @param timeout - the number of milliseconds that should be waited.
   */
  private static async wait(timeout: number = 2000): Promise<void> {
    await new Promise((r) => setTimeout(r, timeout));
  }

  /**
   * Waits until a condition was fulfilled.
   * @param waitFunction - the function that should return true and be called as long as the wait takes
   * @param message - the message that should be written when failing the timeout
   * @param timeout - the timeout that should be waited
   * @returns the last result of the wait function
   */
  static async waitUntil(waitFunction: () => boolean, message: string, timeout: number = 4000): Promise<boolean> {
    return await VSBrowser.instance.driver.wait(waitFunction, timeout, message);
  }
}

/**
 * The arguments for any RMB tests.
 */
type RmbArgument = {
  /**
   * The command itself.
   * It returns a InputBox for further configuration.
   */
  command: (configurationName: string) => Promise<InputBox>;

  /**
   * The description of the argument.
   */
  description: string;
};