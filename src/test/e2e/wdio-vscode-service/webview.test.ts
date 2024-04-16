import { browser } from "@wdio/globals";

/**
 * Tests the webview
 */
suite("WebView Test", () => {
  /**
   * Opens the webview and adds some text to the classpath input
   */
  suiteSetup(async () => {
    const workbench = await browser.getWorkbench();
    await workbench.executeCommand("liquibase.createLiquibaseConfiguration");

    await browser.waitUntil(async () => (await workbench.getAllWebviews()).length > 0);
    const webviews = await workbench.getAllWebviews();
    await expect(webviews).toHaveLength(1);
    await webviews[0].open();

    const classpathInput = await $("#classpathInput");
    await classpathInput.addValue("a\nb");
  });

  /**
   * Tests that the title should be correct.
   */
  test("should title be correct", async () => {
    const title = "Liquibase Configuration";

    expect(await browser.getPageSource()).toContain(title);
    await expect($("h1")).toHaveText(title);
  });

  /**
   * Tests that the classpath was written correctly to the preview.
   */
  [
    {
      title: "Linux/Mac",
      expected: /classpath = a:b/,
      selection: "classpathSeparatorUnix",
    },
    {
      title: "Windows",
      expected: /classpath = a;b/,
      selection: "classpathSeparatorWindows",
    },
  ].forEach((pArgument) => {
    test(`should have correct classpath for ${pArgument.title}`, async function () {
      const classpathSeparator = await $(`#${pArgument.selection}`);
      await classpathSeparator.click();

      const preview = await $("#preview");

      await expect(preview).toHaveText(pArgument.expected);
    });
  });
});
