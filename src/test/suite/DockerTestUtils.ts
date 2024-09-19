import { exec } from "child_process";
import { isWindows } from "../../utilities/osUtilities";
import mariadb from "mariadb";
import { VSBrowser } from "vscode-extension-tester";
import { randomUUID } from "crypto";

/**
 * Creates and manages a maria docker container for tests.
 *
 * **Note:** for this tests to work, you need the following prerequisites:
 * - under Windows: you need WSL. In the WSL you need to have docker installed. You can verify it by running `wsl docker -v` in your CMD or PowerShell.
 * - under Linux and mac: you need docker installed. You can verify it by running `docker -v`
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
   * The connection pool to the mariaDB without any database.
   */
  private static readonly pool = this.createPool();

  /**
   * The IP address used for any docker container.
   * Do not get this field directly, use `getDockerIP` instead.
   */
  private static dockerIP: string | undefined;

  /**
   * Gets the IP address that should be used for any connections to the database.
   *
   * @returns the IP that should be used for the docker address
   */
  static getDockerIP(): string {
    if (this.dockerIP) {
      return this.dockerIP;
    }

    const dockerIPVariable = process.env.DOCKER_IP;
    if (typeof dockerIPVariable === "undefined") {
      this.dockerIP = "localhost";
    } else {
      this.dockerIP = dockerIPVariable.trim();
    }

    return this.dockerIP;
  }

  /**
   * Starts a docker container.
   *
   * You want to check the status of the container with `checkContainerStatus` afterwards.
   *
   * @param containerName - The container that should be started
   * @param exposedPort - the port number that should be exposed in the container
   * @returns the id of the started container
   */
  static async startContainer(containerName: string = "mariadb", exposedPort: number = 3310): Promise<string> {
    let command: string = "";
    switch (containerName) {
      case "mariadb":
        command = `${this.docker} run -d -p ${exposedPort}:3306 --name ${
          this.containerNamePrefix + containerName
        } -e MYSQL_ROOT_PASSWORD=${this.password} -e MYSQL_USER=${this.username} -e MYSQL_DATABASE=${
          this.dbName
        } mariadb`;
        break;

      case "postgres":
        command = `${this.docker} run -d -p ${exposedPort}:5432 --name ${
          this.containerNamePrefix + containerName
        } -e POSTGRES_PASSWORD=${this.password} -e POSTGRES_USER=${this.username} -e POSTGRES_DB=${
          this.dbName
        } postgres`;
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
   * @returns A Promise that resolves when the container status and database availability are checked.
   */
  static async checkContainerStatus(containerName: string = "mariadb"): Promise<void> {
    const fullContainerName = this.containerNamePrefix + containerName;

    // check if container is running
    const running = await this.repeatCommand(`${this.docker} inspect -f '{{.State.Running}}' ${fullContainerName}`);

    if (running && running.trim() === "true") {
      switch (containerName) {
        case "mariadb":
          // install mysql to the container
          await this.repeatCommand(
            `${this.docker} exec ${fullContainerName} sh -c "apt-get update && apt-get install -y mysql-client"`
          );

          // check if database is available
          await this.repeatCommand(
            `${this.docker} exec ${fullContainerName} mysql -u${this.username} -p${this.password} -e "SELECT 1;"`
          );
          break;

        // check if database is available
        case "postgres":
          try {
            await this.repeatCommand(`${this.docker} exec ${fullContainerName} psql ${this.dbName} -c "SELECT 1;"`);
          } catch (error) {
            await VSBrowser.instance.takeScreenshot(`${randomUUID()}-status-check`);
            throw error;
          }

          // create the needed schema
          try {
            await this.repeatCommand(
              `${this.docker} exec ${fullContainerName} psql ${this.dbName} -c "CREATE SCHEMA ${this.dbName};"`
            );
          } catch (error) {
            await VSBrowser.instance.takeScreenshot(`${randomUUID()}-create-schema`);
            throw error;
          }
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
          console.error(stderr);
        }
        resolve(stdout);
      });
    });
  }

  /**
   * Executes an SQL command on a MariaDB pool.
   *
   * @param command - The SQL command to execute.
   * @param pool - The MariaDB pool to execute the command on.
   * @returns A Promise resolving to the result of the SQL command execution.
   */
  static async executeMariaDBSQL(command: string, pool?: mariadb.Pool): Promise<string> {
    const usedPool = pool || this.pool;

    let conn;
    try {
      conn = await usedPool.getConnection();
      const res = await conn.query(command);
      return res;
    } catch (e) {
      conn?.destroy();
      console.error(e);
      return "";
    } finally {
      conn?.destroy();
    }
  }

  /**
   * Creates a pool for the database.
   *
   * @param database - the name of the database
   * @returns the created pool
   */
  static createPool(database?: string): mariadb.Pool {
    return mariadb.createPool({
      host: DockerTestUtils.getDockerIP(),
      user: DockerTestUtils.username,
      password: DockerTestUtils.password,
      connectionLimit: 10,
      port: 3310,
      database: database,
    });
  }

  /**
   * Resets the database by dropping and creating the schema.
   */
  static async resetDB(): Promise<void> {
    await DockerTestUtils.executeMariaDBSQL("DROP SCHEMA data", this.pool);
    await DockerTestUtils.executeMariaDBSQL("CREATE SCHEMA data", this.pool);
  }
}
