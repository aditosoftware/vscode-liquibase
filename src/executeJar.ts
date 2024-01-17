import * as path from "path";
import * as vscode from "vscode";
import { spawn } from "child_process";
import { outputStream } from "./extension";

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
 */
export function executeJar(
  rootPath: string,
  operation: string,
  args: string[] = [],
  propertyPath: string
): Thenable<void> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      cancellable: false,
      title: `Liquibase ${operation}`,
    },
    async (progress) => {
      return new Promise<void>((resolve, reject) => {
        const javaHome = process.env["JAVA_HOME"];

        if (!javaHome) {
          const error = new CustomError("JAVA_HOME environment variable is not set.");
          reject(error);
          return;
        }

        const javaExecutable = path.join(javaHome, "bin", "java");
        const liquibasePath = path.join(rootPath, "liquibase-core-4.24.0.jar");
        const picocliPath = path.join(rootPath, "picocli-4.7.5.jar");

        const cp = `${liquibasePath};${picocliPath}`;
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

        outputStream.show(true);
        outputStream.appendLine(`Liquibase command '${operation}' will be executed`);
        outputStream.appendLine(`${javaExecutable} ${argsArray.join(" ")}`);
        outputStream.appendLine("");

        let stdoutData = "";
        let stderrData = "";

        childProcess.stdout.on("data", (data) => {
          stdoutData += data;
          outputStream.appendLine(`${data}`);
        });

        childProcess.stderr.on("data", (data) => {
          stderrData += data;
          outputStream.appendLine(`${data}`);
        });

        childProcess.on("close", (code) => {
          if (code === 0 || code === 1) {
            resolve();
          } else {
            const error = new CustomError(`Child process exited with code ${code}`);
            error.stdout = stdoutData;
            error.stderr = stderrData;
            outputStream.appendLine(`${error}`);
            reject(error);
          }
        });

        childProcess.on("error", (error) => {
          outputStream.appendLine(`Child process encountered an error: ${error}`);
          reject(error);
        });

        outputStream.appendLine("");
      });
    }
  );
}
