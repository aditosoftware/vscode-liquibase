import path from "path";
import assert from "assert";
import fs from "fs";
import { InputBox } from "vscode-extension-tester";
import { CommandUtils, openAndSelectRMBItem, wait } from "../../CommandUtils";
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
        assert.ok(fs.existsSync(path.join(process.cwd(), "out", "temp", "workspace", "dbdoc", "index.html")), "Did NOT create a DB-DOC Files");
    });

    suiteTeardown(async () => {
        await DockerTestUtils.stopAndRemoveContainer();
    });
});