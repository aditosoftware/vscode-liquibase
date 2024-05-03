import { By, InputBox, NotificationType, StatusBar, VSBrowser, Workbench } from "vscode-extension-tester";

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
        try {
            return await VSBrowser.instance.driver.wait(async () => { return await LiquibaseGUITestUtils.notificationExists(text); }, 2000);
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }

    /**
     * 
     * @param text 
     * @returns 
     */
    static async notificationExists(text: string): Promise<boolean> {
        const notifications = await new Workbench().getNotifications();
        for (const notification of notifications) {
            const message = await notification.getMessage();
            if (message.includes(text)) {
                return true;
            }
        }
        return false;
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
    static async preCommandExecution(pCommand: string): Promise<InputBox> {

        const center = new Workbench();
        const notification = await center.openNotificationsCenter();
        if ((await notification.getNotifications(NotificationType.Any)).length > 0) {
            await notification.clearAllNotifications();
        }

        await notification.close();

        // we need an input box to open
        // extensions usually open inputs as part of their commands
        // the built-in input box we can use is the command prompt/palette
        const prompt = await center.openCommandPrompt();

        // openCommandPrompt returns an InputBox, but if you need to wait for an arbitrary input to appear
        // note this does not open the input, it simply waits for it to open and constructs the page object
        const input = await InputBox.create();

        // execute our command
        await prompt.setText(">liquibase." + pCommand);
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
     * 
     */
    static async addConfiguration(configName: string, configPath: string, configPropertyName: string): Promise<void> {
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
        await input.setText(configName);
        await input.confirm();
        
        await input.setText(configPath + "\\");
        await input.confirm();
        
        // select the folder
        await input.findElement(By.linkText(configPropertyName)).click();
    }
}