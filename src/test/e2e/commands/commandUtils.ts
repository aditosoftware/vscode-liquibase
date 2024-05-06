import { BottomBarPanel, EditorView, InputBox, OutputView, VSBrowser } from "vscode-extension-tester";
import { MariaDbDockerTestUtils } from "../../suite/MariaDbDockerTestUtils";
import mariadb from 'mariadb';
import path from "path";
import { LiquibaseGUITestUtils } from "../LiquibaseGUITestUtils";

export class CommandUtils {

    static readonly noContext = "Do not use any contexts";
    static readonly loadAllContext: string = "Load all contexts from the changelog file";
    static readonly recentContext: string = "Use any of the recently loaded contexts";
    static pool: mariadb.Pool;
    static outputPanel: OutputView;
    static readonly contextOptions = [CommandUtils.noContext, CommandUtils.loadAllContext, CommandUtils.recentContext];
    static readonly contextFunctions = {
        'all available contexts': CommandUtils.getAllContext,
        'the first available context': CommandUtils.getFirstContext,
        'no context': CommandUtils.getNoneContext
    };


    /**
     * Opens a temp workspace and closes all editors.
     */
    static async setupTests(): Promise<void> {
        await MariaDbDockerTestUtils.stopAndRemoveContainer();
        await VSBrowser.instance.openResources(path.join(process.cwd(), "out", "temp", "workspace"));
        await new EditorView().closeAllEditors();
        await MariaDbDockerTestUtils.startContainer();

        CommandUtils.pool = mariadb.createPool({ host: "localhost", user: MariaDbDockerTestUtils.username, password: MariaDbDockerTestUtils.password, connectionLimit: 5000, port: MariaDbDockerTestUtils.port });


        CommandUtils.outputPanel = (await new BottomBarPanel().openOutputView());

        await LiquibaseGUITestUtils.addConfiguration("dummy", path.join(process.cwd(), "out", "temp", "workspace"), "dummy.liquibase.properties");

        await CommandUtils.outputPanel.selectChannel('Liquibase');
    }

    /**
     * When called, will select everything in the InputBox and simply continue the process
     */
    static async getAllContext(): Promise<void> {
        const input = await InputBox.create();
        await input.toggleAllQuickPicks(true);
        await input.confirm();
        await wait();
    }

    /**
     * When called, will select the first possible value in the InputBox and simply continue the process
     */
    static async getFirstContext(): Promise<void> {
        const input = await InputBox.create();
        await input.setText("foo");
        await input.toggleAllQuickPicks(true);
        await input.confirm();
        await wait();
    }

    /**
     * When called, will not input anything in the InputBox and simply continue the process
     */
    static async getNoneContext(): Promise<void> {
        const input = await InputBox.create();
        await input.confirm();
        await wait();
    }


    /**
     * Cartesian Product thingy
     * 
     */
    static matrixExecution(options: string[], execFunctions: object, callback: (option: string, exec: () => Promise<void>, key: string) => void): void {
        options.forEach(option => {
            Object.entries(execFunctions).forEach(([key, exec]) => {
                callback(option, exec, key);
            });
        });
    }

    /**
     * 
     * 
     */
    static async resetDB(pool: mariadb.Pool): Promise<void> {
        await MariaDbDockerTestUtils.executeSQL(pool, "DROP SCHEMA data");
        await MariaDbDockerTestUtils.executeSQL(pool, "CREATE SCHEMA data");
    }
}

/**
 * just wait, pls
 */
export async function wait(): Promise<void> {
    await new Promise((r) => setTimeout(r, 2000));
}