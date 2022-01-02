import {loadServerMap, saveServerMap, IServer, newServer} from "/lib/ServerMap"
import {getLogger, ILogger} from "/lib/Logger"
import {Server} from "/lib/Server"
import {NS} from "Bitburner";
import {hackable} from "/lib/ServerFunctions";
class Crawler {
    ns: NS
    logger: ILogger

    constructor(ns: NS) {
        this.ns = ns
        this.logger = getLogger(ns)
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
        while (this.ns.getHostname() != "home") {
            let tgt = serverMap.get(this.ns.getHostname())
            if (tgt !== undefined && tgt.parent !== undefined) {
                this.ns.connect(tgt.parent)
            }
        }
        let path: string[] = []
        let parent = serverMap.get(target)
        while (parent !== undefined && parent.parent != "" && parent.parent != "home") {
            path.unshift(parent.parent)
            parent = serverMap.get(parent.parent)
        }
        for (const srv of path) {
            this.ns.connect(srv)
        }
    }

    async installBackdoor(serverMap: Map<string, IServer>, server: string): Promise<boolean> {
        if (server == "home") {
            return true
        }
        return false
        /**
        if (hackable(this.ns, server)) {
            let host = this.ns.getHostname()
            this.connect(serverMap, server)
            await this.ns.installBackdoor()
            await this.ns.sleep(this.ns.getHackTime(server) / 4 )
            this.logger.debug("installed backdoor on" + server)
            this.connect(serverMap, host)
            return true
        }
        return false
         */
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
        }
        if (!ns.hasRootAccess(name)) {
            srv.rooted = await this.rootServer(name)
        } else {
            srv.rooted = true
        }
        if (!srv.backdoor) {
            srv.backdoor = await this.installBackdoor(serverMap, name)
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

export async function crawl(ns: NS, depth: number) {
    let crawler = new Crawler(ns)
    let serverMap = await loadServerMap(ns)
    cleanServerMap(ns, serverMap)
    let visited = []
    await crawler.scanServer(serverMap, visited, "home", undefined, depth)
    await saveServerMap(ns, serverMap)
}