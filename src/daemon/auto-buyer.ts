import {getLogger, LogLevel, LogWriter} from "/lib/Logger"
import {loadEventQueue} from "/lib/EventQueue"
import {loadServerMap} from "/lib/ServerMap"
import {NS} from "Bitburner";

function makeid(length) {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}

function getSuitableRam(ns, money, ram) {
    while (ns.getPurchasedServerCost(ram) > money && ram > 1) {
        ram = Math.floor(ram / 2)
    }
    return ram
}

/**
 * getSmallestServer returns a tuple with the ram and name of the server that has the smallest configuration
 * @param {NS} ns namespace
 * @param {string[]} servers list of purchased servers
 */
function getSmallestServer(ns: NS, servers: string[]): [number, string] {
    let minRam = 0
    let minServer = ""
    for (const server of servers) {
        let ram = ns.getServerMaxRam(server)
        if (minRam == 0 || minRam > ram) {
            minRam = ram
            minServer = server
        }
    }
    return [minRam, minServer]
}

async function analyzeQueue(ns) {
    let queue = await loadEventQueue(ns)
    let threadSize = 2 //TODO better analyze script sizes
    let overcommit = 0
    for (let i = 0; i < queue.length(); i++) {
        let record = queue.data[i]
        overcommit += record.needThreads - record.startedThreads
    }
    return overcommit * threadSize
}

function buyServer(ns: NS, suitableRam: number) {
    let logger = getLogger(ns)
    logger.debug(`got suiteable ram: ${suitableRam}`)
    if (suitableRam > 1 && suitableRam % 2 == 0) {
        let hostname = ns.purchaseServer(`pserv-${suitableRam}-${makeid(8)}`, suitableRam);
        logger.debug(`bought ${hostname}`)
    }
}

async function getFreeRam(ns: NS) {
    let serverMap = await loadServerMap(ns)
    let sumFree = 0
    for (const [name, server] of serverMap.entries()) {
        let free = 0
        try {
            if (!server.rooted) {
                continue
            }
            let max = server.maxRam
            let used = ns.getServerUsedRam(name)
            free = max - used
            if (max > 0) {
                sumFree += free
            }
        } catch (e) {

        }
    }
    return sumFree
}

async function manageServers(ns: NS, maxServers: number) {
    let logger = getLogger(ns)
    let ramNeeded = await analyzeQueue(ns)
    let ramFree = await getFreeRam(ns)
    if (ramNeeded < ramFree) {
        return
    }
    logger.info(`need ${ramNeeded} more RAM`)
    let servers = ns.getPurchasedServers()
    let suitableRam = getSuitableRam(ns, ns.getServerMoneyAvailable("home"), ns.getPurchasedServerMaxRam())
    if (servers.length < maxServers) {
        buyServer(ns, suitableRam)
        return
    }
    let [minRam, minServer] = getSmallestServer(ns, servers)
    if (minRam > 0 && minRam < suitableRam) {
        logger.debug(`deleting server ${minServer}`)
        ns.killall(minServer)
        ns.deleteServer(minServer)
    } else {
        logger.debug(`smallest size buyable ${suitableRam}, smallest server ${minRam} => wait for more cash`)
    }

}

/** @param {NS} ns **/
export async function main(ns) {

    let logger = getLogger(ns).withWriter(new LogWriter(ns))
    logger.withLevel(LogLevel.Debug)
    ns.disableLog("ALL")
    logger.info("started")
    const maxServers = ns.getPurchasedServerLimit()
    if (maxServers == 0) {
        logger.info("can't purchase servers in this bit node")
        return
    }
    while (true) {
        await manageServers(ns, maxServers)
        await ns.sleep(10000)
    }
}

// Iterator we'll use for our loop


// Continuously try to purchase servers until we've reached the maximum
// amount of servers