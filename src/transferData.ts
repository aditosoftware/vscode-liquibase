/**
 * The message data that can be transferred from the webview to the extension.
 */
export interface MessageData {
  /**
   * The command that should be executed. This command is any string that is referenced in the panel of the webview.
   */
  command: string;

  /**
   * The real data of the message.
   */
  data: LiquibaseConfigurationData;
}

/**
 * The liquibase configuration data.
 */
export class LiquibaseConfigurationData {
  /**
   * The name of the configuration.
   */
  name: string = "";

  /**
   * The normal database connection configuration.
   */
  databaseConnection: DatabaseConnection = new DatabaseConnection();

  /**
   * The reference database connection. This connection does not need to be there.
   */
  referenceDatabaseConnection?: DatabaseConnection;

  /**
   * Some additional configurations.
   */
  additionalConfiguration?: Map<string, string>;
}

/**
 * The Database connection configuration with all the input that is needed for connecting to the database.
 */
export class DatabaseConnection {
  username: string;
  password: string;
  url: string;
  driver: string;
  classpath: string;

  /**
   * The database type. This can be any type from the drivers.
   */
  databaseType: string;

  constructor() {
    this.username = "";
    this.password = "";
    this.url = "";
    this.driver = "";
    this.classpath = "";
    this.databaseType = "";
  }

  /**
   * Sets a value to a dynamic key.
   * @param pName the name of the element that should be set
   * @param pValue the value that should be set
   */
  public setValue(pName: keyof DatabaseConnection, pValue: string): void {
    Object.defineProperty(this, pName, { value: pValue });
  }
}
