/**
 * The liquibase settings that are needed for the configuration of the `liquibase.properties` files.
 */
export interface LiquibaseSettings {
  /**
   * The default database configuration that should be selected in any dropdown.
   */
  readonly defaultDatabaseForConfiguration: string;

  /**
   * The basic liquibase directory in the project that should be added to the classpath
   */
  readonly liquibaseDirectoryInProject: string;
}
