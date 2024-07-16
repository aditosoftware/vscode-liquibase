import * as fs from "node:fs";
import * as path from "node:path";
import { webfont } from "webfont";

const TARGET_FILENAME = "liquibase_icons.woff";

/**
 * Generates the font files for the custom product icons.
 * This will happen during the building.
 *
 * How does it work?
 *
 * You can add in the `package.json` to the `icons` contribution point any new icon:
 *
 * ```json
 * "icons": {
 *   "liquibase-logo": {
 *     "description": "The Liquibase icon",
 *     "default": {
 *       "fontPath": "./assets/liquibase_icons.woff",
 *       "fontCharacter": "\\E001"
 *     }
 *   }
 * }
 * ```
 *
 * The name of the icon is the file name of the svg that should be located in `media/icons`.
 * This is also the key for any icon reference like `$(liquibase-logo)`.
 *
 * This method will create the `woff` file in the `assets` folder for all those icons (this path is referenced in the `fontPath`).
 *
 * @see https://code.visualstudio.com/api/references/icons-in-labels#icon-contribution-point
 */
export async function generateFont(): Promise<void> {
  const ICONS_PATH = path.resolve(process.cwd(), "media", "icons");
  const TARGET_PATH = path.resolve(process.cwd(), "assets");

  const packageJson = path.resolve(process.cwd(), "package.json");
  if (!fs.existsSync(packageJson)) {
    throw new Error(`package.json does not exist: ${packageJson}`);
  }

  const packageJsonContent = JSON.parse(fs.readFileSync(packageJson, { encoding: "utf-8" })) as MinimalPackageJson;

  const icons = packageJsonContent?.contributes?.icons;
  if (!icons || Object.entries(icons).length === 0) {
    throw new Error("no icons found in package.json");
  }

  fs.mkdirSync(TARGET_PATH, { recursive: true });
  const resolvedFontPath = path.join(TARGET_PATH, TARGET_FILENAME);

  const iconEntries = Object.entries(icons);

  const iconMap = Object.fromEntries(
    iconEntries.map(([iconName, configEntry]) => {
      const character = parseInt(configEntry.default.fontCharacter.replace(/^\\/, ""), 16);

      if (Number.isNaN(character)) {
        throw new Error(`Invalid character code ${configEntry.default.fontCharacter} at ${iconName}`);
      }

      const unicodeCharacter = String.fromCodePoint(character);

      return [iconName, unicodeCharacter];
    })
  );

  const iconFiles = iconEntries.map(([iconName]) => {
    const iconFile = `${iconName}.svg`;
    const iconPath = path.join(ICONS_PATH, iconFile);
    if (!fs.existsSync(iconPath)) {
      throw new Error(`Icon not found: ${iconPath}`);
    }
    // The latest version of webfont depends on an older version of globby, which does not support
    // backslashes in input paths and causes no webfonts to be generated when developing on Windows.
    return iconPath.replace(/\\/g, "/");
  });

  const generatedFont = await webfont({
    files: iconFiles,
    formats: ["woff"],
    fontHeight: 1000,
    normalize: true,
    fixedWidth: true,
    centerHorizontally: true,
    glyphTransformFn: (obj) => ({
      ...obj,
      unicode: [iconMap[obj.name]],
    }),
  });

  if (generatedFont.woff) {
    fs.writeFileSync(resolvedFontPath, generatedFont.woff);
    console.log(`woff for font created at ${resolvedFontPath}`);
  } else {
    throw new Error("woff font was not created");
  }
}

/**
 * The minimal package json that should be read.
 */
export type MinimalPackageJson = {
  /**
   * The contributes point where anything for vscode is contributed.
   */
  contributes?: {
    /**
     * The icons that are contributed.
     */
    icons?: {
      /**
       * The key of the icon.
       */
      [key: string]: {
        default: {
          /**
           * The character that is used to identify the font.
           */
          fontCharacter: string;
        };
      };
    };
  };
};
