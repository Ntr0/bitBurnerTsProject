import {Logger, LogLevel, LogWriter} from "/lib/Logger";
import {crawl} from "/lib/Crawler";
import {NS} from "Bitburner";
import {Context} from "/lib/context";

/** @param {NS} ns **/
export async function main(ns: NS) {
    let opts = ns.flags([
        ["reset", false]
    ])
    let logger = new Logger(ns).withWriter(new LogWriter(ns))
    logger.withLevel(LogLevel.Debug)
    let ctx = new Context(ns, logger)
    ns.disableLog("sleep")
    ns.disableLog("scan")
    ns.disableLog("getHackingLevel")
    let reset = opts.reset
    while (true) {
        try {
            logger.info("Scanning")
            await crawl(ctx, reset, 20)
        } catch (e) {
            logger.error(e, `caught err: ${e}`)
        }
        reset = false
        await ns.sleep(10000)
    }

}