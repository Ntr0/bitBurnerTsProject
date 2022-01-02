import {NS} from "Bitburner";
import {IServer} from "/lib/ServerMap"
import {getLogger} from "/lib/Logger";

export function hackable(ns: NS, server: IServer): boolean {
    if (server.hackingLevel < 0) {
        return false
    }
    return (
        server.hackingLevel <= ns.getHackingLevel()
        && server.rooted
    )
}

export function exploitable(ns: NS, server: IServer): boolean {
    return (
        hackable(ns, server) && server.maximumMoney > 0
    )
}

export function getPath(serverMap: Map<string, IServer>, from: string, target: string): string[] {
    let toPath: string[] = []
    let fromPath: string[] = []
    let fromHome = serverMap.get(target)
    while (fromHome !== undefined) {
        if (fromHome.name == "home") {
            break
        }
        fromPath.unshift(fromHome.name)
        fromHome = serverMap.get(fromHome.parent)
    }
    let toHome = serverMap.get(from)
    // nectar-net -> home -> CSEC
    while (toHome !== undefined) {
        if (toHome.name == "home") {
            break
        }
        toPath.push(toHome.parent)
        toHome = serverMap.get(toHome.parent)
    }
    return toPath.concat(fromPath)
}

export function connect(ns: NS, serverMap: Map<string, IServer>, target: string) {
    let logger = getLogger(ns)
    let cur = ns.getHostname()
    for (const srv of getPath(serverMap, ns.getHostname(), target)) {
        if (!ns.connect(srv)) {
            logger.error(`could not connect to ${srv}`)
        }
    }
}