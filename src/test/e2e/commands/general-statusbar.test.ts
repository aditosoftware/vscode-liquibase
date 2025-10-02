import assert from "node:assert";
import { InputBox, StatusBar } from "vscode-extension-tester";
import chai, { expect } from "chai";
import chaiString from "chai-string";

chai.use(chaiString);

/**
 * Tests the general item in the status bar.
 */
suite("general item in statusbar", () => {
  /**
   * Tests that the status bar item exists and is clickable
   */
  test("should have status bar and clicks it", async () => {
    const statusBar = new StatusBar();

    const liquibaseItem = await statusBar.getItem("liquibase-logo  Liquibase, Execute any Liquibase command");
    assert.ok(liquibaseItem, "no item was found in status bar");

    await liquibaseItem.click();

    // check that command prompt was opened with the given elements
    const inputBox = new InputBox();
    expect(await inputBox.isDisplayed()).to.be.true;
    expect(await inputBox.getText()).to.include(">Liquibase: ");

    const quickPicks = await inputBox.getQuickPicks();

    // check that we have a number of liquibase items
    for (const quickPick of quickPicks) {
      const text = await quickPick.getText();
      expect(text).to.startWith("Liquibase: ");
    }
  });
});
