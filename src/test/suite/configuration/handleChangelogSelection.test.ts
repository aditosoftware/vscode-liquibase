import assert from "assert";
import {
  ConfigurationStatus,
  LiquibaseConfigurationData,
} from "../../../configuration/data/LiquibaseConfigurationData";
import Sinon from "sinon";
import * as vscode from "vscode";
import { TestUtils } from "../TestUtils";
import path from "path";
import { chooseFileForChangelog } from "../../../configuration/handleChangelogSelection";
import { LiquibaseConfigurationPanel } from "../../../panels/LiquibaseConfigurationPanel";
import { MessageType } from "../../../configuration/transfer";

/**
 * Tests the changelog selection.
 */
suite("handleChangelogSelection", () => {
  let changelogFile: string;
  let openDialog: Sinon.SinonStub;
  let transferMessage: Sinon.SinonStub;

  let data: LiquibaseConfigurationData;

  /**
   * Creates a temp dir for the tests and builds a path for a dummy changelog file.
   */
  suiteSetup("create temp directory", () => {
    const tempDir = TestUtils.createTempFolderForTests("changelogSelection");
    changelogFile = path.join(tempDir, "changelog.xml");
  });

  /**
   * Create the stubs before each test. Also creates some initial `LiquibaseConfigurationData` data.
   */
  setup("create stubs", () => {
    openDialog = Sinon.stub(vscode.window, "showOpenDialog");
    transferMessage = Sinon.stub(LiquibaseConfigurationPanel, "transferMessage");

    data = LiquibaseConfigurationData.createDefaultData(
      {
        defaultDatabaseForConfiguration: "MariaDB",
        liquibaseDirectoryInProject: "",
      },
      ConfigurationStatus.NEW,
      ";"
    );
  });

  /**
   * Restore all stubs after the tests.
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

  /**
   * Tests the method `chooseFileForChangelog`.
   */
  suite("chooseFileForChangelog", () => {
    /**
     * Tests that the method itself should work, when nothing was selected.
     */
    [undefined, []].forEach((pArgument) => {
      test(`should work with nothing selected (${pArgument})`, (done) => {
        openDialog.resolves(pArgument);

        chooseFileForChangelog(data)
          .then(() => {
            Sinon.assert.neverCalledWith(transferMessage);

            done();
          })
          .catch(done);
      });
    });

    /**
     * Tests that the selection of an changelog does work.
     */
    test("should handle changelog selection", (done) => {
      openDialog.resolves([vscode.Uri.file(changelogFile)]);

      chooseFileForChangelog(data)
        .then(() => {
          Sinon.assert.calledOnce(transferMessage);

          assert.deepStrictEqual(MessageType.CHOOSE_CHANGELOG_RESULT, transferMessage.firstCall.args[0]);

          const transferredData: LiquibaseConfigurationData = transferMessage.firstCall.args[1];

          assert.ok(transferredData.changelogFile.includes("changelog.xml"), transferredData.changelogFile);
          assert.ok(!transferredData.classpath, `Classpath ${transferredData.classpath} should be empty`);

          done();
        })
        .catch(done);
    });

    /**
     * Tests that the selection of an changelog for a different relative path should work.
     */
    test("should handle changelog selection with different relative path", (done) => {
      data.liquibaseSettings = {
        defaultDatabaseForConfiguration: "MariaDB",
        liquibaseDirectoryInProject: "D:\\",
      };

      openDialog.resolves([vscode.Uri.file(changelogFile)]);

      chooseFileForChangelog(data)
        .then(() => {
          Sinon.assert.calledOnce(transferMessage);

          const transferredData: LiquibaseConfigurationData = transferMessage.firstCall.args[1];

          // only test that classpath has some value. Other tests happens in the method above
          assert.ok(transferredData.classpath, `Classpath ${transferredData.classpath} should have some value`);

          done();
        })
        .catch(done);
    });
  });
});
