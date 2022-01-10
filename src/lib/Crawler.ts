import {IServer, loadServerMap, newServer, saveServerMap} from "/lib/ServerMap"
import {getLogger, ILogger} from "/lib/Logger"
import {NS} from "Bitburner";
import {rootServer} from "/lib/ServerFunctions";
import {Context, getNS} from "/lib/context";

class Crawler {
    ns: NS
    logger: ILogger

    constructor(ctx: Context) {
        this.ns = getNS(ctx)
        this.logger = getLogger(ctx)
    }

    async updateServer(ctx: Context, serverMap, name, parent) {
        let ns = this.ns
        let srv = serverMap.get(name)
        if (srv === undefined) {
            // log(ns,`found new server ${name}`)
            //           logger.debug("add server " + name)
            srv = newServer(name, parent)
            serverMap.set(name, srv)
            srv.maximumMoney = ns.getServerMaxMoney(name)
            srv.hackingLevel = ns.getServerRequiredHackingLevel(name)
            srv.maxRam = ns.getServerMaxRam(name)
        }
        // always update home ram
        if (name == "home") {
            srv.maxRam = ns.getServerMaxRam(name)
            srv.rooted = true
            srv.backdoor = true
        } else {
            if (!ns.hasRootAccess(name)) {
                srv.rooted = rootServer(this.ns, this.logger, name)
            } else {
                srv.rooted = true
            }
            if (!srv.backdoor) {
                //   srv.backdoor = await installBackdoor(ctx, serverMap, srv)
            }
        }
        await saveServerMap(ns, serverMap)
    }

    async scanServer(ctx: Context, serverMap, visited, name, parent, depth) {
        let ns = this.ns
        if (visited.indexOf(name) > -1) {
            return
        }
        await this.updateServer(ctx, serverMap, name, parent)
        const servers = ns.scan(name)
        visited.push(name)
        if (depth > 0) {
            for (const child of servers) {
                if (child == "home") {
                    continue;
                } else if (visited.indexOf(child) > -1) {
                    continue
                }
                await this.scanServer(ctx, serverMap, visited, child, name, depth - 1)
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

export async function crawl(ctx, reset: boolean, depth: number) {
    let crawler = new Crawler(ctx)
    let ns = getNS(ctx)
    let serverMap: Map<string, IServer> = new Map()
    if (!reset) {
        serverMap = await loadServerMap(ns)
        cleanServerMap(ns, serverMap)
    }
    let visited = []
    await crawler.scanServer(ctx, serverMap, visited, "home", undefined, depth)
    await saveServerMap(ns, serverMap)
}