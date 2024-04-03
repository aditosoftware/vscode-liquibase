import Sinon from "sinon";
import * as vscode from "vscode";

/**
 * Initialize the extension before each test.
 */
suiteSetup(function (done) {
  vscode.commands.executeCommand("liquibase.initialize").then(done);
});

/**
 * Restore after each test everything from sinon.
 */
teardown(function () {
  Sinon.restore();
});
