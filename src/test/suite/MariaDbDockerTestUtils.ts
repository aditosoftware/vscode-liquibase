import { exec } from "child_process";
import { isWindows } from "../../utilities/osUtilities";
import mariadb from 'mariadb';

/**
 * Creates and manages a maria docker container for tests.
 *
 * **Note:** for this tests to work, you need the following prerequisites:
 * * under Windows: you need WSL. In the WSL you need to have docker installed. You can verify it by running `wsl docker -v` in your CMD or PowerShell.
 * * under Linux and mac: you need docker installed. You can verify it by running `docker -v`
 */
export class MariaDbDockerTestUtils {
  /**
   * The username for the created database.
   */
  static readonly username = "root";

  /**
   * The password for the created database.
   */
  static readonly password = "root";

  /**
   * The port that will be exposed for the created database.
   */
  static readonly port: number = 3310;

  /**
   * The name of the database of the docker container.
   */
  static readonly dbName = "data";

  /**
   * The name of the container.
   */
  private static readonly containerName = "vscode-liquibase-mariadb";

  /**
   * Basic Docker command. This also includes the wsl prefix for windows.
   */
  private static readonly docker = `${isWindows() ? "wsl" : ""} docker`;

  /**
   * Starts a MariaDB container.
   *
   * You want to check the status of the container with `checkContainerStatus` afterwards.
   *
   * @returns the id of the started container
   */
  static async startContainer(): Promise<string> {
    const command = `${this.docker} run -d -p ${this.port}:3306 --name ${this.containerName} -e MYSQL_ROOT_PASSWORD=${this.password} -e MYSQL_USER=${this.username} -e MYSQL_DATABASE=${this.dbName} mariadb`;

    return this.executeCommand(command);
  }

  /**
   * Stops and removes the MariaDB container.
   *
   * @returns - the id of the removed container
   */
  static async stopAndRemoveContainer(): Promise<string> {
    const command = `${this.docker} container rm --force -v ${this.containerName}`;

    return this.executeCommand(command);
  }

  /**
   * Checks the status of the container. If the container is running and the database available, then nothing is happening.
   * If the container is not running after some wait time (around 5 - 10 seconds), then an error will be thrown.
   */
  static async checkContainerStatus(): Promise<void> {
    // check if container is running
    const running = await this.repeatCommand(`${this.docker} inspect -f '{{.State.Running}}' ${this.containerName}`);

    if (running && running.trim() === "true") {
      // install mysql to the container
      await this.executeCommand(
        `${this.docker} exec ${this.containerName} sh -c "apt-get update && apt-get install -y mysql-client"`
      );

      // check if database is available
      await this.repeatCommand(
        `${this.docker} exec ${this.containerName} mysql -u${this.username} -p${this.password} -e "SELECT 1;"`
      );
    }
  }

  /**
   * Repeatedly tries a command with a wait timeout in between.
   * This should be used for commands that need wait for the initialization of docker containers.
   *
   * @param command - the command that should be executed
   * @returns the result of the command
   */
  private static async repeatCommand(command: string): Promise<string | undefined> {
    const maxRetries = 10;
    for (let i = 1; i <= maxRetries; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const result = await this.executeCommand(command);
        return result;
      } catch (error) {
        if (i === maxRetries) {
          throw error;
        }
      }
    }
  }

  /**
   * Executes a command.
   *
   * @param command - the command that should be executed
   * @returns the output of the command
   */
  private static async executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          // TODO  korrekt? vorher war reject
          console.error(stderr);
        }
        resolve(stdout);
      });
    });
  }

  /**
   * 
   * @param command 
   * @returns 
   */
  static async executeSQL(pool: mariadb.Pool, command: string): Promise<string> {
    let conn;
    try {
      conn = await pool.getConnection();
      const res = await conn.query(command);
      return res;
    }
    catch (e) {
      conn?.destroy();
      console.error(e);
      return "";
    }
    finally {
      conn?.destroy();
    }
  }
}
