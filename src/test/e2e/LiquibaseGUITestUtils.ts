import { InputBox, Notification, NotificationType, StatusBar, VSBrowser, Workbench } from "vscode-extension-tester";
import { CommandUtils, wait } from "./CommandUtils";
import assert from "assert";
import { randomUUID } from "crypto";
import { WebviewTestUtils } from "./webview/WebviewTestUtils";
import { DockerTestUtils } from "../suite/DockerTestUtils";

/**
 *
 */
export class LiquibaseGUITestUtils {
  /**
   * Example wait condition for WebDriver. Wait for a notification with given text to appear.
   * Wait conditions resolve when the first truthy value is returned.
   * In this case we choose to return the first matching notification object we find,
   * or undefined if no such notification is found.
   */
  static async waitForCommandExecution(text: string): Promise<boolean> {
    await wait();
    try {
      return await VSBrowser.instance.driver.wait(async () => {
        return typeof (await LiquibaseGUITestUtils.notificationExists(text)) !== "undefined";
      }, 5000);
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  /**
   * Checks if a notification exits.
   * @param text - the text that should be contained in the message
   * @returns the notification, if one was there with the text, or `undefined`, if no message was found
   */
  static async notificationExists(text: string): Promise<Notification | undefined> {
    const notifications = await new Workbench().getNotifications();
    for (const notification of notifications) {
      const message = await notification.getMessage();
      if (message.includes(text)) {
        return notification;
      }
    }
  }

  /**
   *
   * @returns
   */
  static async getResultingNotifications(): Promise<string[]> {
    // get all notifications
    const center = await new Workbench().getNotifications();
    const messages: string[] = [];
    for (const notification of center) {
      messages.push(await notification.getMessage());
    }

    await new Workbench().clear();

    return messages;
  }

  /**
   *
   * @param pCommand
   * @returns
   */
  static async startCommandExecution(pCommand: string): Promise<InputBox> {
    await CommandUtils.outputPanel.clearText();
    const center = await LiquibaseGUITestUtils.clearNotifications();

    // we need an input box to open
    // extensions usually open inputs as part of their commands
    // the built-in input box we can use is the command prompt/palette
    const prompt = await center.openCommandPrompt();

    // openCommandPrompt returns an InputBox, but if you need to wait for an arbitrary input to appear
    // note this does not open the input, it simply waits for it to open and constructs the page object
    const input = await InputBox.create();

    // execute our command
    await prompt.setText(">Liquibase: " + pCommand);
    await new Promise((r) => setTimeout(r, 2_000));
    await prompt.confirm();

    // then wait until the Activating Extensions from the status bar disappears
    for (let i = 0; i < 10; i++) {
      const activateProgress = await new StatusBar().getItem("Activating Extensions...");
      if (activateProgress) {
        await new Promise((r) => setTimeout(r, 1_000));
      } else {
        break;
      }
    }

    return input;
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
   * Sets a setting to the given value.
   *
   * @param settingId - the id of the setting
   * @param value - the value that should be set for the setting
   */
  static async setSetting(settingId: string, value: string): Promise<void> {
    const settingsEditor = await new Workbench().openSettings();

    // wait a bit for the settings to initialize
    await wait();

    // get the setting and set the new value
    const setting = await settingsEditor.findSettingByID(settingId);
    await setting.setValue(value);

    //double check, was the setting correctly updated
    assert.strictEqual(value, await setting.getValue());
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
}
