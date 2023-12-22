import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import download from "download";

/**
 * Check and perform one-time setup tasks if it's the first activation of the extension.
 * @param context - The context object provided by VSCode to the extension.
 * @param resourcePath - The path to the resources folder within the extension.
 */
export async function prerequisites(
  context: vscode.ExtensionContext,
  resourcePath: string
) {
  // Check if it's the first activation
  if (!context.globalState.get("liquibase-first-activation")) {
    // Perform one-time setup tasks (e.g., download files)
    console.log("Liquibase was executed for the first time");
    downloadLiquibaseFiles(resourcePath);

    // Mark first activation as completed
    context.globalState.update("liquibase-first-activation", true);
  }

  // Check beforehand if action is ready to be used
  // Check if JAVA_HOME is set
  const javaHome = process.env["JAVA_HOME"]; //TODO: maybe let the user set the executable path
  if (!javaHome) {
    vscode.window.showErrorMessage(
      "JAVA_HOME environment variable is not set. Please set JAVA_HOME accordingly and restart VSCode."
    );
    return;
  }

  // Check if necessary files are installed
  const requiredFiles = ["liquibase-core-4.24.0.jar", "picocli-4.7.5.jar"];

  for (const file of requiredFiles) {
    const filePath = path.join(resourcePath, file);
    if (!fs.existsSync(filePath)) {
      vscode.window.showErrorMessage(
        `Required file ${filePath} is missing. Trying to download the missing files. Try again`
      );
      downloadLiquibaseFiles(resourcePath); 
      return;
    }
  }
}

/**
 * Download Liquibase files if they are not already present in the resources folder.
 * @param pathToResources - The path to the resources folder within the extension.
 */
export async function downloadLiquibaseFiles(pathToResources: string) {
  return new Promise<void>((resolve, reject) => {
    try {
      Promise.all(
        [
          "https://repo1.maven.org/maven2/org/liquibase/liquibase-core/4.24.0/liquibase-core-4.24.0.jar",
          "https://repo1.maven.org/maven2/info/picocli/picocli/4.7.5/picocli-4.7.5.jar",
        ].map((url) => download(url, path.join(pathToResources)))
      );
      resolve();
    } catch (error) {
      console.error(`downloadLiquibaseFiles threw an error: ${error}`);
      reject(error);
    }
  });
}
