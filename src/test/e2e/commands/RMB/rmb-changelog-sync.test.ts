import assert from "assert";
import { CommandUtils, wait, openAndSelectRMBItem } from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { MariaDbDockerTestUtils } from "../../../suite/MariaDbDockerTestUtils";
import { InputBox } from "vscode-extension-tester";


suite("Right Click Menu", function () {

    suiteSetup(async function () {
        this.timeout(50_000);
        await CommandUtils.setupTests();
    });

    /**
     * 
     */
    test("should execute 'changelog sync' command", async function () {
        this.timeout(50_000);
        await CommandUtils.resetDB(CommandUtils.pool);

        await wait();
        await openAndSelectRMBItem("Changelog Sync");
        await wait();

        const input = await InputBox.create(50000);

        await input.setText("dummy");
        await input.confirm();

        await input.setText(CommandUtils.noContext);
        await input.confirm();

        await wait();

        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'changelog-sync' was executed successfully."));
    });

    suiteTeardown(async () => {
        await MariaDbDockerTestUtils.stopAndRemoveContainer();
    });
});