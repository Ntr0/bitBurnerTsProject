import {getLogger, LogLevel} from "/lib/Logger";
import {crawl} from "/lib/Crawler";
import {NS} from "Bitburner";

/** @param {NS} ns **/
export async function main(ns: NS) {
    let opts = ns.flags([
        ["reset", false]
    ])
    let logger = getLogger(ns)
    logger.withLevel(LogLevel.Trace)
    ns.disableLog("sleep")
    ns.disableLog("scan")
    ns.disableLog("getHackingLevel")
    while (true) {
        try {
            logger.info("Scanning")
            await crawl(ns, logger, opts.reset, 20)
        } catch (e) {
            logger.error(`caught err: ${e}`)
        }
        await ns.sleep(10000)
    }

}