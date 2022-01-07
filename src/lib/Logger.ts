import {NS} from "Bitburner"
import {Context} from "/lib/context";

export enum LogLevel {
    Panic = -1,
    Error,
    Warning,
    Info,
    Debug,
    Trace,
}

function localeHHMMSS(ms = 0) {
    if (!ms) {
        ms = new Date().getTime()
    }

    return new Date(ms).toLocaleTimeString()
}

export interface ILogger {
    withLevel(lvl: LogLevel): ILogger

    withWriter(writer: LogWriter): ILogger

    panic(msg: string, ...args: any)

    error(error: Error, msg: string, ...args: any)

    warning(msg: string, ...args: any)

    info(msg: string, ...args: any)

    debug(msg: string, ...args: any)

    trace(msg: string, ...args: any)
}

interface logWriter {
    writeLog(msg: string, ...args: any)
}

export class TermWriter {
    ns: NS

    constructor(ns: NS) {
        this.ns = ns
    }

    writeLog(msg: string, ...args: any) {
        this.ns.tprintf(msg, args)
    }
}

export class LogWriter {
    ns: NS

    constructor(ns: NS) {
        this.ns = ns
    }

    writeLog(msg: string, ...args: string[]) {
        let actualMessage: string = this.ns.sprintf(msg, ...args)
        this.ns.print(actualMessage)
    }
}

export class Logger implements ILogger {
    ns: NS
    log: logWriter
    level: LogLevel = LogLevel.Info
    private static _instance: Logger

    constructor(ns: NS, log?: logWriter) {
        this.ns = ns
        if (log) {
            this.log = log
        } else {
            this.log = new LogWriter(ns)
        }
    }

    public static Instance(ns: NS): ILogger {
        return this._instance || (this._instance = new this(ns))
    }

    withWriter(writer: LogWriter): ILogger {
        this.log = writer
        return this
    }

    withLevel(logLevel: LogLevel): ILogger {
        this.level = logLevel
        return this
    }

    _log(lvl: LogLevel, msg, args) {
        //       this.ns.print(`${lvl} > ${this.level}`)
        if (lvl > this.level) {
            return
        }
        let char: string = ''
        switch (lvl) {
            case LogLevel.Panic:
                char = 'P';
                break;
            case LogLevel.Error:
                char = 'E';
                break;
            case LogLevel.Info:
                char = 'I';
                break;
            case LogLevel.Debug:
                char = 'D';
                break;
            case LogLevel.Trace:
                char = 'T';
                break;
            case LogLevel.Warning:
                char = 'W'
                break;
            default:
                char = `${lvl}`;
                break
        }
        msg = `${localeHHMMSS()}:${char}:` + msg
        this.log.writeLog(msg, args)
    }

    debug(msg: string, ...args: any) {
        this._log(LogLevel.Debug, msg, args)
    }

    error(error: Error, msg: string, ...args: any) {
        msg += error.stack
        this._log(LogLevel.Error, msg, args)
    }

    info(msg: string, ...args: any) {
        this._log(LogLevel.Info, msg, args)
    }

    panic(msg: string, ...args: any) {
        this._log(LogLevel.Panic, msg, args)
        this.ns.exit()
    }

    trace(msg: string, ...args: any) {
        this._log(LogLevel.Trace, msg, args)
    }

    warning(msg: string, ...args: any) {
        this._log(LogLevel.Warning, msg, args)
    }

}

export function getLogger(ctx: Context): ILogger {
    return ctx.logger
}