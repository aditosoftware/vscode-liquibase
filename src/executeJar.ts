import * as path from "path";
import * as vscode from "vscode";
import { spawn } from "child_process";
import { isWindows } from "./utilities/osUtilities";
import { Logger } from "./logging/Logger";

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
        const javaHome = process.env["JAVA_HOME"];

        if (!javaHome) {
          const error = new CustomError("JAVA_HOME environment variable is not set.");
          reject(error);
          return;
        }

        const javaExecutable = path.join(javaHome, "bin", "java");
        const liquibasePath = path.join(rootPath, "liquibase-core-4.24.0.jar");
        const picocliPath = path.join(rootPath, "picocli-4.7.5.jar");

        const cp = `${liquibasePath}${isWindows() ? ";" : ":"}${picocliPath}`;
        const argsArray = [
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
