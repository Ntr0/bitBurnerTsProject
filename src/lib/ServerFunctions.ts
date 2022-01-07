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

/*
export function connect(serverMap: Map<string, IServer>, target: string) {
        let path = getPath(serverMap, this.ns.getCurrentServer(), target)
        this.logger.debug(`connection path from ${this.ns.getHostname()}->${target}: ${path} `)
        for (const srv of path) {
            this.logger.debug(`connecting to ${srv}`)
            this.ns.connect(srv)
        }
    }

export async function installBackdoor(serverMap: Map<string, IServer>, server: IServer): Promise<boolean> {
    if (server.name == "home") {
        return true
    }
    if (hackable(this.ns, server)) {
        let host = this.ns.getCurrentServer()
        this.connect(serverMap, server.name)
        if (this.ns.getCurrentServer() != server.name) {
            return false
        }
        await this.ns.installBackdoor()
        this.connect(serverMap, host)
        return true
    }
    return false
}
 */
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
    let cur = ns.getHostname()
    for (const srv of getPath(serverMap, ns.getHostname(), target)) {
        if (!ns.connect(srv)) {
            logger.error(new Error(`could not connect to ${srv}`), "")
        }
    }
}