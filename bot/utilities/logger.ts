/**
 * ANSI escape codes for foreground colors in the console.
 */
export enum FgColor {
    Black = "\x1b[30m", Red = "\x1b[31m", Green = "\x1b[32m",
    Yellow = "\x1b[33m", Blue = "\x1b[34m", Magenta = "\x1b[35m",
    Cyan = "\x1b[36m", White = "\x1b[37m", Orange = "\x1b[38;5;208m",
    Grey = "\x1b[90m",
}

/**
 * ANSI escape codes for background colors in the console.
 */
export enum BgColor {
    Black = "\x1b[40m", Red = "\x1b[41m", Green = "\x1b[42m",
    Yellow = "\x1b[43m", Blue = "\x1b[44m", Magenta = "\x1b[45m",
    Cyan = "\x1b[46m", White = "\x1b[47m",
}

/**
 * ANSI escape codes for text styling in the console.
 */
export enum Style {
    Reset = "\x1b[0m", Bold = "\x1b[1m", Underline = "\x1b[4m",
}

/**
 * Defines the options for a log message.
 */
interface LogOptions {
    /** A context string, like a Guild ID or module name. */
    context?: string;
    /** Whether the process attached to this log is completed. */
    completed?: boolean;
}

/**
 * A custom logger for creating colorful and formatted console output.
 */
export default class Logger {
    /**
     * Maps log levels to specific foreground colors.
     */
    private static levelColorMap = new Map<string, FgColor>([
        ["ERROR", FgColor.Red],
        ["WARN", FgColor.Yellow],
        ["INFO", FgColor.Green],
        ["SETUP", FgColor.Blue],
        ["DEBUG", FgColor.Magenta],
        ["CLIENT=>DISCORD.JS", FgColor.Orange],
        ["CLIENT=>GUILD MANAGER", FgColor.Orange],
    ]);

    /**
     * The core logging method. It formats and prints a message to the console.
     * @param level The log level (e.g., "INFO", "ERROR").
     * @param message The main content of the log message.
     * @param options Additional options for context and completion status.
     */
    static log(level: string, message: string, options?: LogOptions) {
        const timestamp = new Date().toLocaleTimeString('en-US', {hour12: false});
        const timestampString = `${FgColor.Grey}[${timestamp}]${Style.Reset}`;

        // Automatically find the color for the level, defaulting to white
        const levelUpper = level.toUpperCase();
        const levelColor = this.levelColorMap.get(levelUpper) || FgColor.White;
        const levelString = `${levelColor}${Style.Bold}[${levelUpper.padEnd(7)}]${Style.Reset}`;

        // Format the context string if it exists
        const contextString = options?.context
            ? `${FgColor.Grey}[${options.context}]${Style.Reset}`
            : '';

        // Dynamically color the message content based on patterns
        const formattedMessage = message
            // Colorize content in backticks (e.g., `variable`) in yellow
            .replace(/`([^`]+)`/g, `${FgColor.Yellow}$1${Style.Reset}${levelColor}`)
            // Colorize mentions (e.g., <@123>, <#123>) in magenta
            .replace(/<(@|#|@&)\d{17,19}>/g, `${FgColor.Magenta}$&${Style.Reset}${levelColor}`)
            // Colorize standalone Snowflake IDs in cyan
            .replace(/\b(\d{17,19})\b/g, `${FgColor.Cyan}$1${Style.Reset}${levelColor}`);

        const completedMarker = options?.completed ? `${FgColor.Green}✔️${Style.Reset}` : '';

        // Assemble and print the final, detailed log
        console.log(`${timestampString} ${levelString} ${contextString} ${levelColor}${formattedMessage}${Style.Reset} ${completedMarker}`);
    }

    /**
     * Logs an informational message.
     * @param message The message to log.
     * @param context Optional context string.
     * @param completed Optional completion status.
     */
    static info(message: string, context?: string, completed: boolean = false) {
        Logger.log("INFO", message, {context, completed});
    }

    /**
     * Logs a warning message.
     * @param message The message to log.
     * @param context Optional context string.
     * @param completed Optional completion status.
     */
    static warn(message: string, context?: string, completed: boolean = false) {
        Logger.log("WARN", message, {context, completed});
    }

    /**
     * Logs an error message.
     * @param message The message to log.
     * @param context Optional context string.
     * @param completed Optional completion status.
     */
    static error(message: string, context?: string, completed: boolean = false) {
        Logger.log("ERROR", message, {context, completed});
    }
}