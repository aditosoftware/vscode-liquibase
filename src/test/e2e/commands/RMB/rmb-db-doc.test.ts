import path from "path";
import assert from "assert";
import { InputBox } from "vscode-extension-tester";
import { CommandUtils, openAndSelectRMBItem, wait } from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { MariaDbDockerTestUtils } from "../../../suite/MariaDbDockerTestUtils";

suite("Right Click Menu", function () {

    suiteSetup(async function () {
        this.timeout(50_000);
        await CommandUtils.setupTests();
    });

    /**
     * 
     */
    test("should execute 'db-doc' command", async function () {
        this.timeout(50_000);
        await CommandUtils.resetDB(CommandUtils.pool);

        await openAndSelectRMBItem("Generate database documentation (db-doc)");
        await wait();

        const input = await InputBox.create();

        await input.setText("dummy");
        await input.confirm();

        await input.setText(CommandUtils.noContext);
        await input.confirm();

        // Set the output directory for the generated documentation.
        await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "db-doc"));
        await input.confirm();
        await input.confirm();

        await wait();

        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'db-doc' was executed successfully."));
    });

    suiteTeardown(async () => {
        await MariaDbDockerTestUtils.stopAndRemoveContainer();
    });
});