import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import download from "download";
import { ALL_DRIVERS } from "./configuration/drivers";
import { Logger } from "./logging/Logger";
/**
 * Check and perform one-time setup tasks if it's the first activation of the extension.
 * @param context - The context object provided by VSCode to the extension.
 * @param resourcePath - The path to the resources folder within the extension.
 */
export async function prerequisites(context: vscode.ExtensionContext, resourcePath: string) {
  const requiredFiles = getRequiredFiles();

  // Check if it's the first activation
  if (!context.globalState.get("liquibase-first-activation")) {
    // Perform one-time setup tasks (e.g., download files)
    Logger.getLogger().info("Liquibase was executed for the first time");
    downloadLiquibaseFiles(resourcePath, Array.from(requiredFiles.values()));

    // Mark first activation as completed
    context.globalState.update("liquibase-first-activation", true);
  }

  // Check beforehand if action is ready to be used
  // Check if JAVA_HOME is set
  const javaHome = process.env["JAVA_HOME"];
  if (!javaHome) {
    Logger.getLogger().error(
      "JAVA_HOME environment variable is not set. Please set JAVA_HOME accordingly and restart VSCode.",
      true
    );
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
    Logger.getLogger().info(
      `Required file(s) ${missingFiles.join(", ")} are missing. Trying to download the missing files.`,
      true
    );
    downloadLiquibaseFiles(resourcePath, missingUrls).then(() => {
      Logger.getLogger().info(`Successfully downloaded all the missing files to ${resourcePath}`, true);
    });
  }
}

/**
 * Download Liquibase files if they are not already present in the resources folder.
 * @param pathToResources - The path to the resources folder within the extension.
 * @param downloadUrls - all the urls where the files needed to be downloaded
 */
async function downloadLiquibaseFiles(pathToResources: string, downloadUrls: string[]) {
  return new Promise<void>((resolve, reject) => {
    try {
      Promise.all(downloadUrls.map((url) => download(url, path.join(pathToResources))));
      resolve();
    } catch (error) {
      Logger.getLogger().error("downloadLiquibaseFiles threw an error", error);
      reject(error);
    }
  });
}

/**
 * Gets all the required jar files that are needed for the execution of the extension.
 * @returns - the required files with filename and url to download
 */
function getRequiredFiles() {
  const requiredFiles = new Map<string, string>();
  requiredFiles.set(
    "liquibase-core-4.24.0.jar",
    "https://repo1.maven.org/maven2/org/liquibase/liquibase-core/4.24.0/liquibase-core-4.24.0.jar"
  );
  // picocli for using the CLI commands
  requiredFiles.set("picocli-4.7.5.jar", "https://repo1.maven.org/maven2/info/picocli/picocli/4.7.5/picocli-4.7.5.jar");
  // snakeyaml for handling yaml changelogs
  requiredFiles.set("snakeyaml-2.2.jar", "https://repo1.maven.org/maven2/org/yaml/snakeyaml/2.2/snakeyaml-2.2.jar");
  ALL_DRIVERS.forEach((value) => {
    requiredFiles.set(value.getFileName(), value.urlForDownload);
  });
  return requiredFiles;
}
