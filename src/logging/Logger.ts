import * as vscode from "vscode";
import winston from "winston";
import TransportStream, { TransportStreamOptions } from "winston-transport";
import { LoggingMessage } from "./LoggingMessage";
import * as fs from "fs";

/**
 * A logger to log to the log file, output and window message.
 */
export class Logger {
  private static instance: Logger;

  private logger: winston.Logger;
  private outputChannel: vscode.OutputChannel;

  private constructor(logger: winston.Logger, outputChannel: vscode.OutputChannel) {
    this.logger = logger;
    this.outputChannel = outputChannel;
  }

  /**
   * Returns the singleton instance of the logger. Please note that you need to call `initializeLogger` once before getting the logger.
   * @returns - the logger of the extension.
   */
  static getLogger(): Logger {
    if (!this.instance) {
      throw new Error("no instance of the logger was created");
    }
    return this.instance;
  }

  /**
   * Reveal this channel in the UI.
   *
   * @param preserveFocus - When `true` the channel will not take focus.
   */
  showOutputChannel(preserveFocus?: boolean) {
    this.outputChannel.show(preserveFocus);
  }

  /**
   * Logs any given message with the corresponding level.
   *
   * @param loggingMessage - the message tht should be logged
   */
  log(loggingMessage: LoggingMessage) {
    switch (loggingMessage.level) {
      case "error":
        this.error(loggingMessage.message, loggingMessage.error, loggingMessage.notifyUser);
        break;
      case "warn":
        this.warn(loggingMessage.message, loggingMessage.notifyUser);
        break;
      case "info":
        this.info(loggingMessage.message, loggingMessage.notifyUser);
        break;
      case "debug":
        this.debug(loggingMessage.message);
        break;
    }
  }

  /**
   * Logs an error message to the log file and the output.
   * @param message - a user friendly message of the error
   * @param error - the error itself
   * @param notifyUser - if the user should also be notified via `vscode.window.showErrorMessage`
   */
  error(message: string, notifyUser: boolean): void;
  error(message: string, error: unknown, notifyUser?: boolean): void;
  error(message: string, error: unknown, notifyUser?: boolean): void {
    this.logger.error(message, error);
    if (notifyUser) {
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * Logs a warn to the log file and the output.
   * @param message - a user friendly message
   * @param notifyUser - if the user should also be notified via `vscode.window.showWarningMessage`
   */
  warn(message: string, notifyUser?: boolean) {
    this.logger.warn(message);
    if (notifyUser) {
      vscode.window.showWarningMessage(message);
    }
  }

  /**
   * Logs an information message to the log file and the output.
   * @param message - a user friendly message
   * @param notifyUser - if the user should be also notified via `vscode.window.showInformationMessage`
   */
  info(message: string, notifyUser?: boolean) {
    this.logger.info(message);
    if (notifyUser) {
      vscode.window.showInformationMessage(message);
    }
  }

  /**
   * Logs an debug message to the output file.
   * @param message - the message
   */
  debug(message: string) {
    this.logger.debug(message);
  }

  /**
   * Initializes the logger. This needs to be done in the `activate` method of the extension.
   * @param context - the context where the logger needs to be registered.
   * @param name - the name of the extension. This will be also used as the name for the output channel as well as the name for the main file
   */
  static initializeLogger(context: vscode.ExtensionContext, name: string): void {
    // create output channel for any logging
    const outputChannel = vscode.window.createOutputChannel(name);
    context.subscriptions.push(outputChannel);

    if (!fs.existsSync(context.logUri.fsPath)) {
      fs.mkdirSync(context.logUri.fsPath, { recursive: true });
    }

    // and create a logger
    const logger = winston.createLogger({
      level: "debug",
      exitOnError: false,
      format: winston.format.combine(
        winston.format.simple(),
        winston.format.metadata(),
        winston.format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        winston.format.printf(
          (info) => `${info.timestamp} [${info.level}]: ${info.message}${info?.metadata?.stack || ""}`
        )
      ),
      transports: [
        // log everything to the output channel with info level or higher
        new VSCodeOutputChannelTransport(outputChannel, {
          level: "info",
        }),
        // log in in a file with the name of the extension and output channel everything
        new winston.transports.File({
          dirname: context.logUri.fsPath,
          filename: `${outputChannel.name}.log`,
        }),
        // separate file for every error log, including uncaught exceptions und rejections
        new winston.transports.File({
          level: "error",
          dirname: context.logUri.fsPath,
          filename: `error.log`,
          handleExceptions: true,
          handleRejections: true,
        }),
      ],
    });

    if (process.env.NODE_ENV !== "production") {
      // add a console logger when not in production
      logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf((info) => `[${info.level}]: ${info.message}`)
          ),
        })
      );
    }

    // and create the instance
    this.instance = new Logger(logger, outputChannel);
  }

  /**
   * Ends the logging.
   */
  static end() {
    if (this.instance) {
      this.instance.logger.end();
    }
  }
}

/**
 * A custom transport for any logs.
 * This will write the logs to the `vscode.OutputChannel`.
 */
class VSCodeOutputChannelTransport extends TransportStream {
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel, opts?: TransportStreamOptions) {
    super(opts);
    this.outputChannel = outputChannel;
  }

  public log(info: never, callback: () => void) {
    this.outputChannel.appendLine(info[Symbol.for("message")]);

    setImmediate(() => {
      this.emit("logged", info);
    });

    callback();
  }
}
