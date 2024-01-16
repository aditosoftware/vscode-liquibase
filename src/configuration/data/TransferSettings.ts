/**
 * The liquibase settings that are needed for the configuration of the `liquibase.properties` files.
 */
export interface LiquibaseSettings {
  /**
   * The default database configuration that should be selected in any dropdown.
   */
  readonly defaultDatabaseForConfiguration: string;

  /**
   * The liquibase directory that should be added to the classpath
   */
  readonly liquibaseDirectoryForClasspath: string;
}
