import * as path from "path";
import * as vscode from "vscode";
import { spawn, spawnSync } from "child_process";
import { Logger } from "./logging/Logger";
import { buildClasspath, gson, liquibaseCore, picocli, snakeYaml } from "./prerequisites";
import * as fs from "fs";
import { libFolder, resourcePath } from "./extension";
import { getClasspathSeparator } from "./utilities/osUtilities";
import { saveContexts } from "./cache/handleCache";

class CustomError extends Error {
  stdout?: string;
  stderr?: string;
}

/**
 * Execute a JAR file with specified operation and arguments.
 * @param rootPath - The root path for the JAR file and other resources.
 * @param operation - The operation to perform using Liquibase.
 * @param args - Additional arguments for the Liquibase command.
 * @returns A Promise that resolves when the process completes successfully or rejects on error.
 *  This promise has the code of the command. 0 = successful, 1 = not successful.
 */
export function executeJar(
  rootPath: string,
  operation: string,
  propertyPath: string,
  args: string[] = []
): Thenable<number> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      cancellable: false,
      title: `Executing Liquibase '${operation}'`,
    },
    async (progress) => {
      return new Promise<number>((resolve, reject) => {
        const javaExecutable = getJavaExecutable(reject);
        if (!javaExecutable) {
          return;
        }

        const cp = buildClasspath(rootPath, liquibaseCore, picocli, snakeYaml).join(getClasspathSeparator());

        const argsArray: string[] = [
          // force liquibase to use english locale, because other I18N are not good
          "-Duser.language=en",
          // set encoding to utf-8, because otherwise special characters will not be displayed correctly
          "-Dfile.encoding=UTF-8",
          "-cp",
          cp,
          "liquibase.integration.commandline.LiquibaseCommandLine",
          operation,
          `--defaults-file=${propertyPath}`,
          ...args,
        ];

        const childProcess = spawn(javaExecutable, argsArray);

        Logger.getLogger().info(`Liquibase command '${operation}' will be executed`);
        Logger.getLogger().info(`${javaExecutable} ${argsArray.join(" ")}`);

        let stdoutData = "";
        let stderrData = "";

        childProcess.stdout.on("data", (data) => {
          stdoutData += data;
          addToOutput(data, progress);
        });

        childProcess.stderr.on("data", (data) => {
          stderrData += data;
          addToOutput(data, progress);
        });

        childProcess.on("close", (code) => {
          if (code === 0 || code === 1) {
            resolve(code);
          } else {
            const error = new CustomError(`Child process exited with code ${code}`);
            error.stdout = stdoutData;
            error.stderr = stderrData;
            Logger.getLogger().error("error while executing liquibase", error);
            reject(error);
          }
        });

        childProcess.on("error", (error) => {
          Logger.getLogger().error("Child process encountered an error", error);
          reject(error);
        });
      });
    }
  );
}

/**
 * Loads all contexts from a changelog file.
 * @param changelogFile - the absolute path to the changelog file
 * @param liquibasePropertiesPath  - the path to the liquibase properties file
 * @returns the quick pick items containing all changelogs
 */
export async function loadContextsFromChangelogFile(
  changelogFile: string,
  liquibasePropertiesPath: string
): Promise<vscode.QuickPickItem[]> {
  if (!fs.existsSync(changelogFile)) {
    Logger.getLogger().debug(`File ${changelogFile} does not exist for context search`);
    return [];
  }

  const loadingMessage = `Loading possible contexts for ${changelogFile}`;
  Logger.getLogger().debug(loadingMessage);
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      cancellable: false,
      title: loadingMessage,
    },
    (progress) => {
      return new Promise<vscode.QuickPickItem[]>((resolve, reject) => {
        // get the java executable
        const javaExecutable = getJavaExecutable(reject);
        if (!javaExecutable) {
          return [];
        }

        // jar from lib directory
        const extendedJar = path.join(libFolder, "liquibase-extended-cli.jar");

        // classpath elements needed for execution of the jar
        const cp = [extendedJar, ...buildClasspath(resourcePath, picocli, liquibaseCore, snakeYaml, gson)];

        // all arguments for the jar execution
        const args = [
          // set encoding to utf-8, because otherwise special characters will not be displayed correctly from liquibase
          "-Dfile.encoding=UTF-8",
          "-cp",
          cp.join(getClasspathSeparator()),
          "de.adito.context.ContextResolver",
          changelogFile,
        ];

        Logger.getLogger().info(`Trying to load contexts for ${changelogFile}`);
        Logger.getLogger().info(`${javaExecutable} ${args.join(" ")}`);

        try {
          progress.report({ message: "Started loading... This might take a while" });
          const result = spawnSync(javaExecutable, args, { encoding: "utf-8" });

          Logger.getLogger().info(`Fetching of contexts finished with ${result.status}`);
          // Log every output (stdout, stderr) from the command for later information.
          Logger.getLogger().debug(`${sanitizeOutput(result.output.toString())}`);

          if (result.status === 0) {
            // command execution was successful, trim the result and transform it to the array
            const output = result.stdout.trim();
            const contexts = JSON.parse(output.toString()) as string[];

            Logger.getLogger().info(`Loaded contexts: ${contexts.toString()}`);

            // save the loaded context into the cache
            saveContexts(liquibasePropertiesPath, contexts);

            // transform the elements to an quick pick array
            const contextValues: vscode.QuickPickItem[] = contexts.map((pContext: string) => {
              return {
                label: pContext,
              };
            });

            resolve(contextValues);
          } else {
            // any error happened
            Logger.getLogger().error(
              `Error while fetching contexts`,
              // adding the whole stderr as stack. This will put everything in the error log
              { stack: sanitizeOutput(result.stderr) },
              true
            );
            reject(`Error ${result.status}, ${result.error?.message}\n ${result.stderr}`);
          }
        } catch (error) {
          Logger.getLogger().error("Error loading contexts", error, true);
          reject(error);
        }
      });
    }
  );
}

/**
 * Returns the path to the java executable, if the environment variable was set.
 * @param reject - the reject of any promise
 * @returns the path to `JAVA_HOME/bin/java`, when a java home was given
 */
function getJavaExecutable(reject: (reason?: unknown) => void) {
  const javaHome = process.env["JAVA_HOME"];

  if (!javaHome) {
    const error = new CustomError("JAVA_HOME environment variable is not set.");
    reject(error);
    return;
  }

  return path.join(javaHome, "bin", "java");
}

/**
 * Sanitizes any output that can include ANSI Escape Codes. These codes can do in some consoles color formats.
 * In the VSCode output panel or any log file, these escape codes can not be interpreted correctly.
 * Because of these two outputs, we are removing these elements.
 *
 * @param output - the output given that has potentially unsanitized elements
 * @returns the sanitized output
 */
function sanitizeOutput(output: string): string {
  // eslint-disable-next-line no-control-regex
  return output.replace(/\x1b\[[0-9;]*[mG]/g, "");
}

/**
 * Writes any messages from stdout and stderr to the output.
 * @param data - the data that should be written to any output
 * @param progress - the progress where some messages should be written
 */
function addToOutput(data: unknown, progress: vscode.Progress<{ message: string | undefined }>) {
  const line: string = `${data}`;

  // append any message to the output stream
  Logger.getLogger().info(line);

  if (!line.includes("WARNING: License service not loaded") && !line.includes("#####")) {
    // Filter out lines with warnings of liquibase service and ####.
    // Everything else, print to the progress
    progress.report({ message: line });
  }
}
