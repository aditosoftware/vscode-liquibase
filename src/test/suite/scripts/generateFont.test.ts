import path from "path";
import { generateFont, MinimalPackageJson } from "../../../scripts/generateFont";
import { TestUtils } from "../TestUtils";
import * as fs from "node:fs";
import chai, { expect } from "chai";
import chaiFs from "chai-fs";
import assert from "assert";
import Sinon from "sinon";
import * as webfontImport from "webfont";

chai.use(chaiFs);

suite("generateFont", () => {
  const originalCwd = process.cwd();

  let tempDir: string;

  /**
   * Generates the resources for the tests.
   */
  setup("generate resources", () => {
    // generate a temp dir for the fonts and sets it as cwd
    tempDir = TestUtils.createTempFolderForTests("font");
    process.chdir(tempDir);
  });

  /**
   * Changes `process.cwd` back to the original value.
   */
  teardown("change cwd back", () => {
    process.chdir(originalCwd);

    Sinon.restore();
  });

  /**
   * Tests that the font can be created without any problems
   */
  test("should generate font", async () => {
    const expectedPath = path.join(tempDir, "assets", "liquibase_icons.woff");

    createData(tempDir, {
      contributes: {
        icons: {
          "my-logo": {
            default: {
              fontCharacter: "\\E001",
            },
          },
        },
      },
    });

    await generateFont();

    chai.assert.pathExists(expectedPath);
  });

  /**
   * Tests that an error is thrown if no package.json is there.
   */
  test("should throw error if no package.json is there", async () => {
    await assertErrorCase(tempDir, "package.json does not exist");
  });

  /**
   * Tests that an error was thrown, if there are no icons in the package.json
   */
  [{}, { contributes: {} }, { contributes: { icons: {} } }].forEach((pTestCase) => {
    test(`should throw error if no icons are in package.json: ${JSON.stringify(pTestCase)}`, async () => {
      await assertErrorCase(tempDir, "no icons found in package.json", pTestCase);
    });
  });

  /**
   * Tests that an error was thrown, if there is no number given for the icon.
   */
  test("should throw error if no number is there for an icon", async () => {
    await assertErrorCase(tempDir, "Invalid character code X at my-logo", {
      contributes: {
        icons: {
          "my-logo": {
            default: {
              fontCharacter: "X",
            },
          },
        },
      },
    });
  });

  /**
   * Tests that an error was thrown if the icon was not found on the correct path.
   */
  test("should throw error if no icon was found at the expected path", async () => {
    await assertErrorCase(tempDir, "Icon not found", {
      contributes: {
        icons: {
          "not-existing-logo": {
            default: {
              fontCharacter: "\\E001",
            },
          },
        },
      },
    });
  });

  /**
   * Tests that an error was thrown, if the woff was not created
   */
  test("should throw error if no woff was created", async () => {
    const dummyWebfont = Sinon.stub(webfontImport, "webfont");

    dummyWebfont.resolves({});

    await assertErrorCase(tempDir, "woff font was not created", {
      contributes: {
        icons: {
          "my-logo": {
            default: {
              fontCharacter: "\\E001",
            },
          },
        },
      },
    });
  });
});

/**
 * Asserts an error case by checking that the `generateFont` method rejects an call with the given error.
 *
 * @param tempDir - the path to the temporary directory
 * @param expectedErrorMessage - the expected error message
 * @param packageJson - the content that should be written to the `package.json`. If `undefined` was given, then no `package.json` was written.
 */
async function assertErrorCase(
  tempDir: string,
  expectedErrorMessage: string,
  packageJson?: MinimalPackageJson
): Promise<void> {
  createData(tempDir, packageJson);

  await assert.rejects(generateFont, (err: Error) => {
    expect(err.message).to.include(expectedErrorMessage);
    return true;
  });
}

/**
 * Creates the data for the tests.
 *
 * This includes a `media/icons` folder with `my-logo.svg` inside and a `package.json` with the given content.
 *
 * @param tempDir - the path to the temporary directory
 * @param packageJson - the content that should be written to the `package.json`. If `undefined` was given, then no `package.json` was written.
 */
function createData(tempDir: string, packageJson?: MinimalPackageJson): void {
  // create a dummy svg icon
  const iconsFolder = path.join("media", "icons");
  fs.mkdirSync(iconsFolder, { recursive: true });

  fs.writeFileSync(
    path.join(iconsFolder, "my-logo.svg"),
    '<svg height="100" width="100" xmlns="http://www.w3.org/2000/svg"><circle r="45" cx="50" cy="50" fill="red" /></svg>'
  );

  // write a dummy package.json
  if (packageJson) {
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(packageJson));
  }
}
