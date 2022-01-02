import { Server } from "/lib/Server"
import { loadServerMap } from "/lib/ServerMap"
import {NS} from "Bitburner"
import {hackable} from "/lib/ServerFunctions";

/** @param {NS} ns **/
export async function main(ns: NS) {
    let opts = ns.flags([
        ["all", false],
    ])
    var serverMap = await loadServerMap(ns)
    var toSort = new Map()
    for (const [name, server] of serverMap.entries()) {
        let srv = Server.fromIServer(ns, server)
        srv.updateValues()
        toSort.set(srv.hackingLevel, srv)
    }
    var sorted: Map<string, Server>= new Map([...toSort.entries()].sort((a, b) => a[0] - b[0]))
    for (const entry of sorted.values()) {
        if (opts.all) {
            ns.tprintf(entry.shortInfo())
        } else if (hackable(ns, entry)) {
            ns.tprintf(entry.shortInfo())
        }
    }
}
