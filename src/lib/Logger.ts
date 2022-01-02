import {NS} from "Bitburner"

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
    setLevel(lvl: LogLevel): ILogger
    panic(msg: string, ...args: any)

    error(msg: string, ...args: any)

    warning(msg: string, ...args: any)

    info(msg: string, ...args: any)

    debug(msg: string, ...args: any)

    trace(msg: string, ...args: any)
}

interface logWriter {
    writeLog(msg: string, ...args: any)
}

class TermWriter {
    ns: NS

    constructor(ns: NS) {
        this.ns = ns
    }

    writeLog(msg: string, ...args: any) {
        this.ns.tprintf(msg, args)
    }
}

class LogWriter {
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

    constructor(ns: NS, log?: logWriter) {
        this.ns = ns
        if (log) {
            this.log = log
        } else {
            this.log = new LogWriter(ns)
        }
    }
    setLevel(logLevel:LogLevel): ILogger {
        this.level = logLevel
        return this
    }

    _log(lvl: LogLevel, msg, args) {
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

    error(msg: string, ...args: any) {
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

export class TermLogger extends Logger {
    constructor(ns) {
        super(ns, new TermWriter(ns));
    }
}

let logger: ILogger

export function getLogger(ns:NS) : ILogger {
    if (typeof(logger) === 'undefined' ) {
        logger = new Logger(ns)
    }
    return logger
}