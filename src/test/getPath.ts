import {NS} from "Bitburner";
import {getLogger, TermLogger} from "/lib/Logger";
import {loadServerMap} from "/lib/ServerMap";
import {getPath} from "/lib/ServerFunctions";

export async function main(ns:NS) {
    let logger = new TermLogger(ns)
    let serverMap = await loadServerMap(ns)
    let path = getPath(serverMap, "lexo-corp", "rothman-uni")
    for (const hop of path) {
        logger.info(`connect ${hop}`)
    }
}