/**
 * The different parts of an JDBC url.
 */
export interface UrlParts {
  /**
   * The server address, e.g. localhost.
   */
  serverAddress?: string;

  /**
   * The port, e.g. 3306.
   */
  port?: number;

  /**
   * The name of the database, e.g. data
   */
  databaseName?: string;
}
