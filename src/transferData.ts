import { NO_PRE_CONFIGURED_DRIVER } from "./drivers";

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
   * NOTE: If you plan to refactor this, Maps are not really serializable and therefore not good for passing the values!
   */
  additionalConfiguration: { [key: string]: string } = {};
}

/**
 * The Database connection configuration with all the input that is needed for connecting to the database.
 * @see https://docs.liquibase.com/concepts/connections/creating-config-properties.html
 */
export class DatabaseConnection {
  /**
   * Username to connect to the target database.
   */
  username: string;

  /**
   *Password to connect to the target database.
   */
  password: string;

  /**
   * Specifies the database to use when making comparisons to the source database. Also known as the target.
   * This is usually a jdbc url.
   */
  url: string;

  /**
   * Specifies the driver class name for the target database.
   */
  driver: string;

  /**
   * Specifies the directories and JAR files to search for changelog files and custom extension classes.
   *
   * TODO To separate multiple directories, use a semicolon (;) on Windows or a colon (:) on Linux or MacOS.
   */
  classpath: string;

  /**
   * The database type. This can be any type from the drivers. This will be later adjusted into `driver` and `classpath`, if a pre-configured driver was selected.
   */
  databaseType: string;

  constructor() {
    this.username = "";
    this.password = "";
    this.url = "";
    this.driver = "";
    this.classpath = "";
    this.databaseType = NO_PRE_CONFIGURED_DRIVER;
  }

  /**
   * Sets a value to a dynamic key.
   * @param pName - the name of the element that should be set
   * @param pValue - the value that should be set
   */
  setValue(pName: keyof DatabaseConnection, pValue: string): void {
    Object.defineProperty(this, pName, { value: pValue });
  }
}
