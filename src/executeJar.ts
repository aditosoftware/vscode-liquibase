import * as path from "path";
import { spawn } from "child_process";

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
export function executeJar(rootPath: string, operation: string, args: string[] = [], propertyPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const javaHome = process.env['JAVA_HOME'];

    if (!javaHome) {
      const error = new CustomError('JAVA_HOME environment variable is not set.');
      reject(error); //TODO: let the user set a JRE to execute the extension?
      return;
    }

    const javaExecutable = path.join(javaHome, 'bin', 'java');
    const liquibasePath = path.join(rootPath, "liquibase-core-4.24.0.jar"); //TODO: Find version that isn't fucked
    const picocliPath = path.join(rootPath, "picocli-4.7.5.jar");
    const propertyFile = propertyPath; //TODO: get selected System //path.join(rootPath, ".liquibase", "liquibase.properties");

    const cp = `${liquibasePath};${picocliPath}`;
    const argsArray = [
      '-cp',
      cp,
      'liquibase.integration.commandline.LiquibaseCommandLine',
      operation,
      `--defaults-file=${propertyFile}`,
      ...args,
    ];

    const childProcess = spawn(javaExecutable, argsArray);

    let stdoutData = "";
    let stderrData = "";
    
    //TODO: bring stream of output to the users vscode output
    childProcess.stdout.on('data', (data) => {
      stdoutData += data;
      console.log(`${data}`);
    });

    childProcess.stderr.on('data', (data) => {
      stderrData += data;
      console.log(`${data}`); //TODO: fix this to console.error -> maybe never
    });

    childProcess.on('close', (code) => {
      if (code === 0 || code === 1) {
        resolve();
      } else {
        const error = new CustomError(`Child process exited with code ${code}`);
        error.stdout = stdoutData;
        error.stderr = stderrData;
        reject(error);
      }
    });

    childProcess.on('error', (error) => {
      console.error("Child process encountered an error:", error);
      reject(error);
    });
  });
}
