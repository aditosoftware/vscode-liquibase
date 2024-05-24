import { InputBox, Notification, NotificationType, StatusBar, VSBrowser, Workbench } from "vscode-extension-tester";
import { CommandUtils, wait } from "./CommandUtils";
import assert from "assert";
import { randomUUID } from "crypto";
import { WebviewTestUtils } from "./webview/WebviewTestUtils";
import { DockerTestUtils } from "../suite/DockerTestUtils";

/**
 * General Util methods for e2e / GUI tests with Liquibase.
 */
export class LiquibaseGUITestUtils {
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
      return await VSBrowser.instance.driver.wait(async () => {
        try {
          const notifications = await LiquibaseGUITestUtils.notificationExists(text);
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
      }, 10_000);
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

  /**
   * Starts the execution of an command
   * @param pCommand - the command that should be executed
   * @returns the input box for the commands
   */
  static async startCommandExecution(pCommand: string): Promise<InputBox> {
    if (CommandUtils.outputPanel && (await CommandUtils.outputPanel.isDisplayed())) {
      await CommandUtils.outputPanel.clearText(); //TODO maybe not needed anymore with the new clear output channel setting
    }
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
    await wait(2_000);
    await prompt.confirm();

    // then wait until the Activating Extensions from the status bar disappears
    for (let i = 0; i < 10; i++) {
      const activateProgress = await new StatusBar().getItem("Activating Extensions...");
      if (activateProgress) {
        await wait(1_000);
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
  static async setSetting(settingId: string, value: string | boolean): Promise<void> {
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
