import path from "path";
import fs from "fs";
import assert from "assert";
import { CommandUtils, wait, openAndSelectRMBItem } from "../../CommandUtils";
import { LiquibaseGUITestUtils } from "../../LiquibaseGUITestUtils";
import { DockerTestUtils } from "../../../suite/DockerTestUtils";


suite("Right Click Menu", function () {

    suiteSetup(async function () {
        this.timeout(50_000);
        await CommandUtils.setupTests();
    });

    /**
     * 
     */
    test("should execute 'update-sql' command", async function () {
        this.timeout(80_000);
        await CommandUtils.resetDB(CommandUtils.pool);

        const input = await LiquibaseGUITestUtils.startCommandExecution("update");

        await input.setText('dummy');
        await input.confirm();

        await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "liquibase", "changelog.xml"));
        await input.selectQuickPick(1);

        await input.setText(CommandUtils.loadAllContext);
        await input.confirm();

        await wait();

        await input.setText("foo");
        await input.toggleAllQuickPicks(true);
        await input.confirm();

        await wait();

        await openAndSelectRMBItem("Generate SQL File for incoming changes");
        await wait();

        await input.setText("dummy");
        await input.confirm();

        await input.setText(CommandUtils.loadAllContext);
        await input.confirm();

        await wait();

        await input.toggleAllQuickPicks(true);
        await input.confirm();

        await input.setText(path.join(process.cwd(), "out", "temp", "workspace", "myFolder"));
        await input.confirm();
        await input.confirm();

        await input.setText("update.sql");
        await input.confirm();

        await wait();

        assert.ok(await LiquibaseGUITestUtils.waitForCommandExecution("Liquibase command 'update-sql' was executed successfully."), "Notification did NOT show up");
        assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "myFolder", "update.sql")), "Did NOT create a SQL File");

    });

    suiteTeardown(async () => {
        await DockerTestUtils.stopAndRemoveContainer();
    });
});