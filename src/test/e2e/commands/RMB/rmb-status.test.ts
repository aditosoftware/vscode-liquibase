import assert from "assert";
import { InputBox } from "vscode-extension-tester";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";
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
    test("should execute 'status' command", async function () {
        this.timeout(50_000);
        await CommandUtils.resetDB(CommandUtils.pool);

        await openAndSelectRMBItem("Status");

        const input = await InputBox.create(50000);

        await wait();

        await input.setText("dummy");
        await input.confirm();

        await input.setText(CommandUtils.noContext);
        await input.confirm();

        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'status' was executed successfully."), "Notification did NOT show");
    });

    suiteTeardown(async () => {
        await DockerTestUtils.stopAndRemoveContainer();
    });
});