import Sinon from "sinon";
import { TestUtils } from "../../TestUtils";
import { testLiquibaseConnection } from "../../../../configuration/handle/testConfiguration";
import * as vscode from "vscode";
import assert from "node:assert";
import { TransferDataForCommand } from "../../../../registerLiquibaseCommand";
import { PROPERTY_FILE } from "../../../../input/ConnectionType";
import * as fs from "node:fs";
import chai from "chai";
import chaiFs from "chai-fs";

chai.use(chaiFs);

/**
 * Tests the testing of the liquibase configuration.
 */
suite("testConfiguration", () => {
  /**
   * Restore all stubs after the tests.
   */
  teardown("restore stubs", () => {
    Sinon.restore();
  });

  /**
   * Tests that the testing of the liquibase connection works correctly.
   */
  test("should testLiquibaseConnection correctly", (done) => {
    const fileContent = "Lorem ipsum dolor sit amet";

    const liquibaseConfigurationData = TestUtils.createDummyLiquibaseConfigurationData();

    Sinon.stub(liquibaseConfigurationData, "generateProperties").returns(fileContent);

    const executeCommandStub = Sinon.stub(vscode.commands, "executeCommand").resolves();

    testLiquibaseConnection(liquibaseConfigurationData)
      .then(() => {
        Sinon.assert.calledOnce(executeCommandStub);

        const firstArguments = executeCommandStub.firstCall.args;

        assert.strictEqual(firstArguments.length, 3, "three args should be passed");

        assert.strictEqual(firstArguments[0], "liquibase.validate", "first arg should be the command");

        // get the other two args
        const transferData: TransferDataForCommand = firstArguments[1];
        const deleteTemporaryFiles = firstArguments[2];

        assert.strictEqual(transferData.name, PROPERTY_FILE, "transfer data should have the name set correctly");

        const data = transferData.data;
        assert.ok(typeof data === "string", "data should be a string");

        assert.strictEqual(
          data,
          deleteTemporaryFiles.temporaryFilePath,
          "the data and the temporaryFilePath from the third argument should be the same"
        );

        chai.assert.pathExists(deleteTemporaryFiles.temporaryFolder);
        chai.assert.pathExists(deleteTemporaryFiles.temporaryFilePath);

        assert.deepStrictEqual(
          fs.readFileSync(data, "utf8"),
          fileContent,
          "the content of the file should be the expected one"
        );

        // execute the after command action manually
        deleteTemporaryFiles.executeAfterCommandAction();

        chai.assert.notPathExists(deleteTemporaryFiles.temporaryFolder);
        chai.assert.notPathExists(deleteTemporaryFiles.temporaryFilePath);

        done();
      })
      .catch(done);
  });
});
