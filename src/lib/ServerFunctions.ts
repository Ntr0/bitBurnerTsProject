import {NS} from "Bitburner";
import {IServer} from "/lib/ServerMap"
import {getLogger, ILogger} from "/lib/Logger";
import {Context, getNS} from "/lib/context";

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


export async function installBackdoor(ctx: Context, serverMap: Map<string, IServer>, server: IServer): Promise<boolean> {
    const ns = getNS(ctx)
    if (server.name == "home") {
        return true
    }
    if (hackable(ns, server)) {
        let host = ns.getCurrentServer()
        connect(ctx, serverMap, server.name)
        if (ns.getCurrentServer() != server.name) {
            return false
        }
        await ns.installBackdoor()
        connect(ctx, serverMap, host)
        return true
    }
    return false
}

export function rootServer(ns: NS, logger: ILogger, name: string): boolean {
    let hacks = new Map()
    hacks.set("FTPCrack.exe", ns.ftpcrack)
    hacks.set("BruteSSH.exe", ns.brutessh)
    hacks.set("HTTPWorm.exe", ns.httpworm)
    hacks.set("relaySMTP.exe", ns.relaysmtp)
    hacks.set("SQLInject.exe", ns.sqlinject)

    let rootability = 0
    for (const f of hacks.keys()) {
        if (ns.fileExists(f, "home")) {
            rootability++
        }
    }
    if (ns.getServerNumPortsRequired(name) > rootability) {
        logger.debug(`cannot root ${name}: have only ${rootability} hacks`)
        return false
    }
    for (const [file, fun] of hacks.entries()) {
        if (ns.fileExists(file, "home")) {
            fun(name)
        }
    }

    if (ns.fileExists("NUKE.exe", "home")) {
        ns.nuke(name)
    }
    return true
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

export function connect(ctx: Context, serverMap: Map<string, IServer>, target: string) {
    let logger = getLogger(ctx)
    let ns = getNS(ctx)
    let cur = ns.getCurrentServer()
    for (const srv of getPath(serverMap, cur, target)) {
        if (!ns.connect(srv)) {
            logger.error(new Error(`could not connect to ${srv}`), "")
        }
    }
}