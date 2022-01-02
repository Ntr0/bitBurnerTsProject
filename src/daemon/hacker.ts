import {Server} from "/lib/Server"
import {Action} from "/lib/consts";
import {IServer, loadServerMap} from "/lib/ServerMap"
import {EventQueue, loadEventQueue} from "/lib/EventQueue"
import {runThreads} from "/lib/Scheduler"
import {getLogger, LogLevel} from "/lib/Logger"
import {pathEventQueue} from "/lib/consts"
import {NS} from "Bitburner";
import {exploitable} from "/lib/ServerFunctions";

const scriptWeaken = "/hack/weaken.ns"
const scriptHack = "/hack/hack.ns"
const scriptGrow = "/hack/grow.ns"


async function analyzeQueue(queue) {
    let threadSize = 2 //TODO better analyze script sizes
    let overcommit = 0
    for (let i = 0; i < queue.length(); i++) {
        let record = queue.data[i]
        overcommit += record.needThreads - record.startThreads
    }
    return overcommit * threadSize
}

interface IEvent {
    server: string
    duration: number
    action: Action
    needThreads: number
    startedThreads: number
}

function newInitializationEvent(name: string): IEvent {
    return {
        server: name,
        duration: 0,
        action: Action.Init,
        needThreads: 0,
        startedThreads: 0
    }
}

async function hackBetter(ns: NS, name: string): Promise<IEvent> {
    const logger = getLogger(ns)
    let server = new Server(ns, name)
    server.updateValues()
    let threads = 0
    let remain = 0
    let action = server.nextAction()
    let duration = 0
    switch (action) {
        case Action.Weak:
            threads = server.weakThreads
            remain = await runThreads(ns, scriptWeaken, threads, [server.name])
            duration = ns.getWeakenTime(server.name)
            break;
        case Action.Grow:
            threads = server.growThreads
            remain = await runThreads(ns, scriptGrow, threads, [server.name])
            duration = ns.getGrowTime(server.name)
            break;
        case Action.Hack:
            threads = server.hackThreads
            remain = await runThreads(ns, scriptHack, server.hackThreads, [server.name])
            duration = ns.getHackTime(server.name)
            break;
    }

    logger.debug(`[${server.name}]: ${threads - remain}/${threads} ${action} ${ns.tFormat(duration)}`)
    if (remain == threads) {
        duration = 5000
    }
    let result: IEvent = {
        "server": name,
        "duration": duration + 1000, // grace period to let all effects tickle in
        "action": action,
        "needThreads": threads,
        "startedThreads": threads - remain
    }
    return result
}

async function loadQueue(ns) {
    let logger = getLogger(ns)
    let hackingServers = new Map()
    let queue
    try {
        queue = await loadEventQueue(ns, pathEventQueue)
    } catch (e) {
        logger.error(`got error ${e}`)
        queue = new EventQueue(ns)
    }

    for (let i = 0; i < queue.length(); i++) {
        let server = new Server(ns, queue.data[i].server.name)
        queue.data[i].server = server
        hackingServers.set(server.name, server)
    }
    return [queue, hackingServers]
}

async function getHackableServers(ns: NS): Promise<IServer[]> {
    let result: IServer[] = []
    const serverMap = await loadServerMap(ns)
    for (const server of serverMap.values()) {
        if (exploitable(ns, server)) {
            result.push(server)
        }
    }
    return result
}

/** @param {NS} ns **/
export async function main(ns: NS) {
    let opts = ns.flags([
        ["reset", false],
    ])

    ns.disableLog("ALL")
    let logger = getLogger(ns)
    logger.setLevel(LogLevel.Debug)
    let queue = new EventQueue(ns)
    let hackingServers = new Map()
    const queueTimeout = 10000
    if (opts.reset == false) {
        [queue, hackingServers] = await loadQueue(ns)
    }


    while (true) {
        for (const srv of await getHackableServers(ns)) {
            if (hackingServers.has(srv.name)) {
                continue
            }
            queue.push(0, newInitializationEvent(srv.name))
            await queue.saveToFile(pathEventQueue)
            hackingServers.set(srv.name, srv)
        }
        logger.debug("finished server scan")
        let start = Date.now()
        while (queueTimeout + start > Date.now()) {
            let [dur, data] = queue.peek()
            if (dur != undefined) {
                logger.trace(`peek: ${dur - Date.now()} -> ${data.name}`)
            } else {
                await ns.sleep(queueTimeout)
                break
            }
            let srvState = await queue.blockShiftUntil(1000)
            if (srvState != undefined) {
                let result = await hackBetter(ns, srvState.server)
                queue.push(result.duration, result)
                await queue.saveToFile(pathEventQueue)
            }
        }
    }
}