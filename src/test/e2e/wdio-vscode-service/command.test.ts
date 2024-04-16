import { randomUUID } from "crypto";
import path from "path";
import { browser } from "@wdio/globals";

suite("Command tests", () => {
  test("should execute command", async () => {
    const configName = randomUUID();

    const workbench = await browser.getWorkbench();

    // initialize liquibase
    await workbench.executeCommand("liquibase.initialize");
    // and wait until the message for initialization was logged as expected
    await browser.waitUntil(async () => {
      const notifications = await workbench.getNotifications();
      const messages = await Promise.all(notifications.map((pNotification) => pNotification.getMessage()));

      return (
        messages.filter((pMessage) => pMessage.includes("Successfully downloaded all the missing files to")).length !==
        0
      );
    });

    // execute our command
    const command = await workbench.executeCommand("liquibase.addExistingConfiguration");

    // Input the name
    await command.setText(configName);
    await command.confirm();

    // select the folder
    await command.setText(
      path.join(process.cwd(), "src", "test", "e2e", "wdio-vscode-service", "dummy.liquibase.properties")
    );
    // das darf hier nicht sein
    // await command.selectQuickPick("dummy.liquibase.properties");
    await command.confirm();

    // wait until the notification was sent
    await browser.waitUntil(async () => {
      const notifications = await workbench.getNotifications();
      const messages = await Promise.all(notifications.map((pNotification) => pNotification.getMessage()));
      return messages.includes(`Configuration for ${configName} was successfully saved.`);
    });
  });
});
