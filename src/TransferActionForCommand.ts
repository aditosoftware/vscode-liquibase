/**
 * Any action that should be executed after the command.
 *
 * This should be used when you call any liquibase command from another command.
 *
 * Example call:
 *
 * @example
 * await vscode.commands.executeCommand("liquibase.validate", new MyTransferActionForCommand());
 */
export abstract class TransferActionForCommand {
  /**
   * Command that should be executed after the liquibase command was finished.
   */
  abstract executeAfterCommandAction(): void;
}
