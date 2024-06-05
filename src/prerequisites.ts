import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import download from "download";
import { ALL_DRIVERS } from "./configuration/drivers";
import { Logger } from "@aditosoftware/vscode-logging";

/**
 * The name + version of the liquibase-core jar.
 */
export const liquibaseCore = "liquibase-core-4.24.0.jar";

/**
 * The name + version of the picocli jar.
 */
export const picocli = "picocli-4.7.5.jar";

/**
 * The name + version of the snakeyaml jar.
 */
export const snakeYaml = "snakeyaml-2.2.jar";

/**
 * The name + version of the gson jar.
 */
export const gson = "gson-2.10.1.jar";

/**
 * Check and perform one-time setup tasks if it's the first activation of the extension.
 *
 * @param context - The context object provided by VSCode to the extension.
 * @param resourcePath - The path to the resources folder within the extension.
 */
export async function prerequisites(context: vscode.ExtensionContext, resourcePath: string): Promise<void> {
  const requiredFiles = getRequiredFiles();

  // Check if it's the first activation
  if (!context.globalState.get("liquibase-first-activation")) {
    // Perform one-time setup tasks (e.g., download files)
    Logger.getLogger().info({ message: "Liquibase was executed for the first time" });
    await downloadLiquibaseFiles(resourcePath, Array.from(requiredFiles.values()));

    // Mark first activation as completed
    await context.globalState.update("liquibase-first-activation", true);
  }

  // Check beforehand if action is ready to be used
  // Check if JAVA_HOME is set
  const javaHome = process.env["JAVA_HOME"];
  if (!javaHome) {
    Logger.getLogger().error({
      message: "JAVA_HOME environment variable is not set. Please set JAVA_HOME accordingly and restart VSCode.",
      notifyUser: true,
    });
    return;
  }

  // Check if necessary files are installed
  const missingFiles: string[] = [];
  const missingUrls: string[] = [];

  for (const [fileName, url] of requiredFiles) {
    const filePath = path.join(resourcePath, fileName);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(fileName);
      missingUrls.push(url);
    }
  }

  if (missingFiles && missingFiles.length !== 0) {
    Logger.getLogger().info({
      message: `Required file(s) ${missingFiles.join(", ")} are missing. Trying to download the missing files.`,
      notifyUser: true,
    });
    downloadLiquibaseFiles(resourcePath, missingUrls)
      .then(() => {
        Logger.getLogger().info({
          message: `Successfully downloaded all the missing files to ${resourcePath}`,
          notifyUser: true,
        });
      })
      .catch((error) => Logger.getLogger().error({ message: "error downloading any liquibase file", error }));
  }

  // log a message after all prerequisites to show that the activate was done correctly
  Logger.getLogger().info({ message: "Liquibase extension was initialized correctly" });
}

/**
 * Download Liquibase files if they are not already present in the resources folder.
 *
 * @param pathToResources - The path to the resources folder within the extension.
 * @param downloadUrls - all the urls where the files needed to be downloaded
 */
async function downloadLiquibaseFiles(pathToResources: string, downloadUrls: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    Promise.all(downloadUrls.map((url) => download(url, path.join(pathToResources))))
      .then(() => resolve())
      .catch((error) => {
        Logger.getLogger().error({ message: "downloadLiquibaseFiles threw an error", error });
        reject(error);
      });
  });
}

/**
 * Gets all the required jar files that are needed for the execution of the extension.
 *
 * @returns - the required files with filename and url to download
 */
function getRequiredFiles(): Map<string, string> {
  const requiredFiles = new Map<string, string>();
  requiredFiles.set(
    liquibaseCore,
    "https://repo1.maven.org/maven2/org/liquibase/liquibase-core/4.24.0/liquibase-core-4.24.0.jar"
  );
  // picocli for using the CLI commands
  requiredFiles.set(picocli, "https://repo1.maven.org/maven2/info/picocli/picocli/4.7.5/picocli-4.7.5.jar");
  // snakeyaml for handling yaml changelogs
  requiredFiles.set(snakeYaml, "https://repo1.maven.org/maven2/org/yaml/snakeyaml/2.2/snakeyaml-2.2.jar");
  // Gson for executing the extended CLI file
  requiredFiles.set(gson, "https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar");
  ALL_DRIVERS.forEach((value) => {
    requiredFiles.set(value.getFileName(), value.urlForDownload);
  });
  return requiredFiles;
}
