import * as path from "path";
import * as vscode from "vscode";
import { spawn, spawnSync } from "child_process";
import { Logger } from "@aditosoftware/vscode-logging";
import * as fs from "fs";
import { cacheHandler, libFolder, resourcePath } from "./extension";
import { getClasspathSeparator } from "./utilities/osUtilities";
import {
  getClearOutputChannelOnStartSetting,
  getLiquibaseFolder,
  getOpenOutputChannelOnCommandStartSetting,
} from "./handleLiquibaseSettings";

/**
 * The error that was given during the process execution.
 */
class CustomError extends Error {
  /**
   * The message from the stdout.
   */
  stdout?: string;

  /**
   * The message from the stderr.
   */
  stderr?: string;
}

/**
 * Execute a JAR file with specified operation and arguments.
 *
 * @param rootPath - The root path for the JAR file and other resources.
 * @param operation - The operation to perform using Liquibase.
 * @param propertyPath - the path to the property file
 * @param args - Additional arguments for the Liquibase command.
 * @returns A Promise that resolves when the process completes successfully or rejects on error.
 * This promise has the code of the command. 0 = successful, 1 = not successful.
 */
export function executeJar(
  rootPath: string,
  operation: string,
  propertyPath: string,
  args: string[] = []
): Thenable<number> {
  // classpath elements needed for execution of the jar
  // the classpath is built from the root path and the workspace folder
  const cp = [path.join(rootPath, "*"), getLiquibaseFolder()].join(getClasspathSeparator());

  const argsArray: string[] = [
    "-cp",
    cp,
    "liquibase.integration.commandline.LiquibaseCommandLine",
    operation,
    `--defaults-file=${propertyPath}`,
    ...args,
  ];

  return executeJarAsync(`Executing Liquibase '${operation}'`, `Liquibase command '${operation}'`, argsArray, [0, 1]);
}

/**
 * Executes a jar async.
 *
 * This will write any text that was written by the called program from `system.out` or `system.err` to the logs.
 *
 * @param progressTitle - the title for the progress
 * @param whatToExecute - what is executed. This will be shown in the logs  as `${whatToExecute} will be executed`
 * @param argsArray - the arguments that need to be added for this command
 * @param allowedCodes - the allowed error codes. If any of this codes were given by the program call, then it was successful, otherwise not
 * @returns the error code of the program. this will be any of the `allowedCodes`
 */
export function executeJarAsync<ErrorCode extends number>(
  progressTitle: string,
  whatToExecute: string,
  argsArray: string[],
  allowedCodes: ErrorCode[]
): Thenable<ErrorCode> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      cancellable: false,
      title: progressTitle,
    },
    async (progress) => {
      return new Promise<ErrorCode>((resolve, reject) => {
        const javaExecutable = getJavaExecutable(reject);
        if (!javaExecutable) {
          return;
        }

        const commandArguments = [
          // force liquibase to use english locale, because other I18N are not good
          "-Duser.language=en",
          // set encoding to utf-8, because otherwise special characters will not be displayed correctly
          "-Dfile.encoding=UTF-8",
          ...argsArray,
        ];

        const childProcess = spawn(javaExecutable, commandArguments);
        const startTime = new Date().getTime();

        if (getClearOutputChannelOnStartSetting()) {
          Logger.getLogger().clear();
        }

        if (getOpenOutputChannelOnCommandStartSetting()) {
          Logger.getLogger().showOutputChannel();
        }

        Logger.getLogger().info({ message: `${whatToExecute} will be executed` });
        Logger.getLogger().info({ message: `${javaExecutable} ${commandArguments.join(" ")}` });

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
          if (code !== null && allowedCodes.includes(code as ErrorCode)) {
            resolve(code as ErrorCode);
          } else {
            const error = new CustomError(`Child process exited with code ${code}`);
            error.stdout = stdoutData;
            error.stderr = stderrData;
            Logger.getLogger().error({ message: "error while executing liquibase", error });
            reject(error);
          }
        });

        childProcess.on("error", (error: Error) => {
          Logger.getLogger().error({ message: "Child process encountered an error", error });
          reject(error);
        });

        childProcess.on("exit", () => {
          const duration = new Date().getTime() - startTime;
          const minutes = Math.floor(duration / 60000);
          const seconds = Math.floor((duration % 60000) / 1000);
          const milliseconds = duration % 1000;
          const formattedDuration = `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}:${milliseconds.toString().padStart(3, "0")}`;
          Logger.getLogger().info({ message: `${whatToExecute} finished in ${formattedDuration} min` });
        });
      });
    }
  );
}

/**
 * Loads all contexts from a changelog file.
 *
 * @param changelogFile - the absolute path to the changelog file
 * @param liquibasePropertiesPath - the path to the liquibase properties file
 * @returns the quick pick items containing all changelogs
 */
export async function loadContextsFromChangelogFile(
  changelogFile: string,
  liquibasePropertiesPath: string
): Promise<vscode.QuickPickItem[]> {
  if (!fs.existsSync(changelogFile)) {
    Logger.getLogger().debug({ message: `File ${changelogFile} does not exist for context search` });
    return [];
  }

  const loadingMessage = `Loading possible contexts for ${changelogFile}`;
  Logger.getLogger().debug({ message: loadingMessage });
  return new Promise<vscode.QuickPickItem[]>((resolve, reject) => {
    // get the java executable
    const javaExecutable = getJavaExecutable(reject);
    if (!javaExecutable) {
      return [];
    }

    // all arguments for the jar execution
    const args = [
      // set encoding to utf-8, because otherwise special characters will not be displayed correctly from liquibase
      "-Dfile.encoding=UTF-8",
      ...createBasicArgsForLiquibaseCLI(),
      "context",
      changelogFile,
    ];

    Logger.getLogger().info({ message: `Trying to load contexts for ${changelogFile}` });
    Logger.getLogger().info({ message: `${javaExecutable} ${args.join(" ")}` });

    try {
      const result = spawnSync(javaExecutable, args, { encoding: "utf-8" });

      Logger.getLogger().info({ message: `Fetching of contexts finished with ${result.status}` });
      // Log every output (stdout, stderr) from the command for later information.
      if (result.output) {
        Logger.getLogger().debug({ message: result.output.toString() });
      }

      if (result.status === 0) {
        // command execution was successful, trim the result and transform it to the array
        const output = result.stdout.trim();
        const contexts = JSON.parse(output.toString()) as string[];

        Logger.getLogger().info({ message: `Loaded contexts: ${contexts.toString()}` });

        if (contexts.length === 0) {
          Logger.getLogger().info({ message: "No contexts found. You can continue normal", notifyUser: true });
        }

        // save the loaded context into the cache
        cacheHandler.saveContexts(liquibasePropertiesPath, changelogFile, {
          loadedContexts: contexts,
        });

        // transform the elements to an quick pick array
        const contextValues: vscode.QuickPickItem[] = contexts.map((pContext: string) => {
          return {
            label: pContext,
          };
        });

        resolve(contextValues);
      } else {
        // any error happened
        Logger.getLogger().error({
          message: `Error while fetching contexts`,
          // adding the whole stderr as stack. This will put everything in the error log
          error: { stack: result.stderr },
          notifyUser: true,
        });
        reject(new Error(`Error ${result.status}, ${result.error?.message}\n ${result.stderr}`));
      }
    } catch (error) {
      Logger.getLogger().error({ message: "Error loading contexts", error, notifyUser: true });
      reject(error as Error);
    }
  });
}

/**
 * Creates the basic arguments for any call to the LiquibaseExtendedCli
 *
 * You need to give after the arguments the command name and the command arguments.
 *
 * @example
 * Creating arguments for command `convert`:
 * ```ts
 * [...createBasicArgsForLiquibaseCLI(), "convert", "--format", format, input, output],
 * ```
 * @returns the basic args
 */
export function createBasicArgsForLiquibaseCLI(): string[] {
  const cp = [path.join(resourcePath, "*"), path.join(libFolder, "*"), getLiquibaseFolder()].join(
    getClasspathSeparator()
  );
  return ["-cp", cp, "de.adito.LiquibaseExtendedCli"];
}

/**
 * Returns the path to the java executable, if the environment variable was set.
 *
 * @param reject - the reject of any promise
 * @returns the path to `JAVA_HOME/bin/java`, when a java home was given
 */
function getJavaExecutable(reject: (reason?: unknown) => void): string | undefined {
  const javaHome = process.env["JAVA_HOME"];

  if (!javaHome) {
    const error = new CustomError("JAVA_HOME environment variable is not set.");
    reject(error);
    return;
  }

  return path.join(javaHome, "bin", "java");
}

/**
 * Writes any messages from stdout and stderr to the output.
 *
 * @param data - the data that should be written to any output
 * @param progress - the progress where some messages should be written
 */
function addToOutput(data: unknown, progress: vscode.Progress<{ message: string | undefined }>): void {
  const line: string = `${data}`;

  // append any message to the output stream.
  // These messages should ignore any format
  Logger.getLogger().info({ message: line, ignoreFormatForOutputChannel: true });

  if (!line.includes("WARNING: License service not loaded") && !line.includes("#####")) {
    // Filter out lines with warnings of liquibase service and ####.
    // Everything else, print to the progress
    progress.report({ message: line });
  }
}
