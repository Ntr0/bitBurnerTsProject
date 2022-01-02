import {getLogger, LogLevel} from "/lib/Logger";
import {crawl} from "/lib/Crawler";
import {NS} from "Bitburner";

/** @param {NS} ns **/
export async function main(ns:NS) {
    let logger = getLogger(ns).setLevel(LogLevel.Debug)
    ns.disableLog("sleep")
    ns.disableLog("scan")
    while (true) {
        try {
            logger.info("Scanning")
            await crawl(ns, 20)
        } catch (e) {
            logger.error(`caught err: ${e}`)
        }
        await ns.sleep(10000)
    }

}