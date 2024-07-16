import assert from "assert";
import { expect } from "chai";
import { InputBox, StatusBar, WebElement } from "vscode-extension-tester";

/**
 * Tests the general item in the status bar.
 */
suite("general item in statusbar", () => {
  /**
   * Tests that the status bar item exists and is clickable
   */
  test("should have status bar and clicks it", async () => {
    const statusBar = new StatusBar();

    const items = await statusBar.getItems();

    // item can not be found via getItem(), therefore find the item this way
    let liquibaseItem: undefined | WebElement;
    for (const item of items) {
      const text = await item.getText();

      if (text.includes("Liquibase")) {
        liquibaseItem = item;
        break;
      }
    }
    assert.ok(liquibaseItem, "item was found in status bar");

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
