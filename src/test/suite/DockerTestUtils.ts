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
export class DockerTestUtils {
  /**
   * The username for the created database.
   */
  static readonly username = "root";

  /**
   * The password for the created database.
   */
  static readonly password = "root";

  /**
   * The name of the database of the docker container.
   */
  static readonly dbName = "data";

  /**
   * The name of the container.
   */
  private static readonly containerNamePrefix = "vscode-liquibase-";

  /**
   * Basic Docker command. This also includes the wsl prefix for windows.
   */
  private static readonly docker = `${isWindows() ? "wsl" : ""} docker`;

  /**
   * Starts a docker container.
   *
   * You want to check the status of the container with `checkContainerStatus` afterwards.
   * 
   * @param containerName - The container that should be started
   *
   * @returns the id of the started container
   */
  static async startContainer(containerName: string = "mariadb", exposedPort: number = 3310): Promise<string> {
    let command: string = "";
    switch (containerName) {
      case "mariadb":
        command = `${this.docker} run -d -p ${exposedPort}:3306 --name ${this.containerNamePrefix + containerName} -e MYSQL_ROOT_PASSWORD=${this.password} -e MYSQL_USER=${this.username} -e MYSQL_DATABASE=${this.dbName} mariadb`;
        break;

      case "postgres":
        command = `${this.docker} run -d -p ${exposedPort}:5432 --name ${this.containerNamePrefix + containerName} -e POSTGRES_PASSWORD=${this.password} -e POSTGRES_USER=${this.username} -e POSTGRES_DB=${this.dbName} postgres`;
        break;

      default:
        break;
    }


    return this.executeCommand(command);
  }

  /**
   * Stops and removes the docker container.
   * 
   * @param containerName - Container that should be removed
   *
   * @returns The id of the removed container
   */
  static async stopAndRemoveContainer(containerName: string = "mariadb"): Promise<string> {
    const command = `${this.docker} container rm --force -v ${this.containerNamePrefix + containerName}`;

    return this.executeCommand(command);
  }

  /**
   * Checks the status of the specified container and the availability of the database within it.
   * 
   * @param containerName - The name of the container to check.
   * @param dbExecutable - The executable for the database client.
   * @returns A Promise that resolves when the container status and database availability are checked.
   */
  static async checkContainerStatus(containerName: string = "mariadb", dbExecutable: string = "mysql-client"): Promise<void> {
    // check if container is running
    const running = await this.repeatCommand(`${this.docker} inspect -f '{{.State.Running}}' ${this.containerNamePrefix + containerName}`);

    if (running && running.trim() === "true") {
      
      switch (containerName) {
        case "mariadb":
          // install mysql to the container
          await this.executeCommand(
            `${this.docker} exec ${this.containerNamePrefix + containerName} sh -c "apt-get update && apt-get install -y ${dbExecutable}"`
          );

          // check if database is available
          await this.repeatCommand(
            `${this.docker} exec ${this.containerNamePrefix + containerName} mysql -u${this.username} -p${this.password} -e "SELECT 1;"`
          );
          break;

          // check if database is available
        case "postgres":
          await this.repeatCommand(
            `${this.docker} exec ${this.containerNamePrefix + containerName} psql ${this.dbName} -c "SELECT 1;"`
          );

          //
          await this.executeCommand(
            `${this.docker} exec ${this.containerNamePrefix + containerName} psql ${this.dbName} -c "CREATE SCHEMA ${this.dbName};"`
          );
          break;

        default:
          break;
      }
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
  * Executes an SQL command on a MariaDB pool.
  * 
  * @param pool - The MariaDB pool to execute the command on.
  * @param command - The SQL command to execute.
  * @returns A Promise resolving to the result of the SQL command execution.
  */
  static async executeMariaDBSQL(pool: mariadb.Pool, command: string): Promise<string> {
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
