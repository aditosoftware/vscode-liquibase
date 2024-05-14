import assert from "assert";
import { InputBox } from "vscode-extension-tester";
import { MariaDbDockerTestUtils } from "../../../suite/MariaDbDockerTestUtils";
import { CommandUtils, openAndSelectRMBItem, wait } from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";


suite("Right Click Menu", function () {

    suiteSetup(async function () {
        this.timeout(50_000);
        await CommandUtils.setupTests();
    });

    /**
     * 
     */
    test("should execute 'update' command", async function () {
        this.timeout(50_000);
        await CommandUtils.resetDB(CommandUtils.pool);

        await openAndSelectRMBItem("Update");

        const input = await InputBox.create(50000);

        await wait();

        await input.setText("dummy");
        await input.confirm();

        await input.setText(CommandUtils.loadAllContext);
        await input.confirm();

        await wait();

        await input.toggleAllQuickPicks(true);
        await input.confirm();

        await wait();

        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update' was executed successfully."), "Notification did NOT show");
    });

    suiteTeardown(async () => {
        await MariaDbDockerTestUtils.stopAndRemoveContainer();
    });
});