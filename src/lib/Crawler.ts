import {IServer, loadServerMap, newServer, saveServerMap} from "/lib/ServerMap"
import {ILogger} from "/lib/Logger"
import {NS} from "Bitburner";
import {getPath, hackable} from "/lib/ServerFunctions";

class Crawler {
    ns: NS
    logger: ILogger

    constructor(ns: NS, logger: ILogger) {
        this.ns = ns
        this.logger = logger
    }

    async rootServer(name) {
        let ns = this.ns
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
            this.logger.debug(`cannot root ${name}: have only ${rootability} hacks`)
            return false
        }
        for (const [file, fun] of hacks.entries()) {
            if (ns.fileExists(file, "home")) {
                await fun(name)
            }
        }

        if (ns.fileExists("NUKE.exe", "home")) {
            await ns.nuke(name)
        }
        this.logger.info(`rooted ${name}`)
        return true
    }

    connect(serverMap: Map<string, IServer>, target: string) {
        let path = getPath(serverMap, this.ns.getCurrentServer(), target)
        this.logger.debug(`connection path from ${this.ns.getHostname()}->${target}: ${path} `)
        for (const srv of path) {
            this.logger.debug(`connecting to ${srv}`)
            this.ns.connect(srv)
        }
    }

    async installBackdoor(serverMap: Map<string, IServer>, server: IServer): Promise<boolean> {
        if (server.name == "home") {
            return true
        }
        if (hackable(this.ns, server)) {
            let host = this.ns.getCurrentServer()
            this.connect(serverMap, server.name)
            if (this.ns.getCurrentServer() != server.name) {
                this.logger.error(`connected to unexpected server. Expected ${server.name} but connected to ${this.ns.getHostname()}`)
                return false
            }
            await this.ns.installBackdoor()
//            await this.ns.sleep(this.ns.getHackTime(server.name) / 4)
            this.logger.debug("installed backdoor on" + server)
            this.connect(serverMap, host)
            return true
        }
        return false
    }

    async scanServer(serverMap, visited, name, parent, depth) {
        let ns = this.ns
        if (visited.indexOf(name) > -1) {
            return
        }

        let srv = serverMap.get(name)
        if (srv === undefined) {
            // log(ns,`found new server ${name}`)
            this.logger.debug("add server " + name)
            srv = newServer(name, parent)
            serverMap.set(name, srv)
            srv.maximumMoney = ns.getServerMaxMoney(name)
            srv.hackingLevel = ns.getServerRequiredHackingLevel(name)
            srv.maxRam = ns.getServerMaxRam(name)
        }
        if (!ns.hasRootAccess(name)) {
            srv.rooted = await this.rootServer(name)
        } else {
            srv.rooted = true
        }
        if (!srv.backdoor) {
            srv.backdoor = await this.installBackdoor(serverMap, srv)
        }
        const servers = ns.scan(name)
        visited.push(name)
        if (depth > 0) {
            for (const child of servers) {
                if (child == "home") {
                    continue;
                } else if (visited.indexOf(child) > -1) {
                    continue
                }
                await this.scanServer(serverMap, visited, child, name, depth - 1)
                await ns.sleep(100)
            }
        }
    }
}

function cleanServerMap(ns: NS, serverMap: Map<string, any>) {
    for (const name of serverMap.keys()) {
        if (!ns.serverExists(name)) {
            serverMap.delete(name)
        }
    }
}

export async function crawl(ns: NS, logger: ILogger, reset: boolean, depth: number) {
    let crawler = new Crawler(ns, logger)
    let serverMap: Map<string, IServer> = new Map()
    crawler.logger.debug("initialized")
    if (!reset) {
        serverMap = await loadServerMap(ns)
        cleanServerMap(ns, serverMap)
    }
    let visited = []
    await crawler.scanServer(serverMap, visited, "home", undefined, depth)
    await saveServerMap(ns, serverMap)
}