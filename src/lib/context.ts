import {NS} from "Bitburner";
import {ILogger, Logger} from "/lib/Logger";

export class Context {
    ns: NS
    logger: ILogger

    constructor(ns: NS, logger: ILogger | undefined = undefined) {
        this.ns = ns
        if (!logger) {
            this.logger = new Logger(ns)
        } else {
            this.logger = logger
        }
    }
}

export function getNS(ctx: Context): NS {
    return ctx.ns
}
