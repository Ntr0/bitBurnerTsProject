import {NS} from "Bitburner";
import {getLogger, TermWriter} from "/lib/Logger";

/** @param {NS} ns **/
export async function main(ns: NS) {
    const logger = getLogger(ns).withWriter(new TermWriter(ns));

    logger.info("\tEverything seems to be in order :D");
    logger.warning("\tJust showing some colors");
    logger.error("Fake error, no panik");
    logger.panic("bye")
}
