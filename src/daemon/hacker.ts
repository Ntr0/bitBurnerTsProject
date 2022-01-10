import {Server} from "/lib/Server"
import {Action, Script} from "/lib/consts";
import {IServer, loadServerMap} from "/lib/ServerMap"
import {IEvent, loadEventQueue, newEventQueue} from "/lib/EventQueue"
import {runThreads} from "/lib/Scheduler"
import {getLogger, ILogger, Logger, LogLevel, LogWriter} from "/lib/Logger"
import {NS} from "Bitburner";
import {exploitable} from "/lib/ServerFunctions";
import {TimedQueue} from "/lib/TimedQueue";
import {Context, getNS} from "/lib/context";


async function analyzeQueue(queue) {
    let threadSize = 2 //TODO better analyze script sizes
    let overcommit = 0
    for (let i = 0; i < queue.length(); i++) {
        let record = queue.data[i]
        overcommit += record.needThreads - record.startThreads
    }
    return overcommit * threadSize
}


interface EventAction {
    action: Action
    requiredThreads: number
    startedThreads: number
    remainingDuration: number
}

interface NewEvent {
    server: string
    requeue: number
    actions: EventAction[]
}

function updateEvent(event: NewEvent) {
    let actions: EventAction[] = []
    for (let action of event.actions) {
        action.remainingDuration -= event.requeue
        if (action.remainingDuration > 0) {
            actions.push(action)
        }
    }
    event.actions = actions
}

function newInitializationEvent(name: string): IEvent {
    return {
        server: name,
        duration: 0,
        action: Action.Init,
        remainingActionDuration: 0,
        needThreads: 0,
        startedThreads: 0
    }
}

/*
async function optHack(ns: NS, logger: ILogger, event: NewEvent) {
    updateEvent(event)
    let server = new Server(ns, event.server)
    server.updateValues()
    for (let action of event.actions) {
        switch (action.action) {
            case Action.Grow:

                break
            case Action.Hack:
                break
        }

    }
    // if not all threads could be scheduled, we should see if it is worth to try to start the rest

}


 */
async function hackBetter(ctx: Context, name: string): Promise<IEvent> {
    let ns = getNS(ctx)
    let logger = getLogger(ctx)
    let server = new Server(ctx, name)
    server.updateValues()
    let threads = 0
    let remain = 0
    let action = server.nextAction()
    let duration = 0
    switch (action) {
        case Action.Weak:
            threads = server.weakThreads
            remain = await runThreads(ctx, Script.Weaken, threads, [server.name])
            duration = ns.getWeakenTime(server.name)
            break;
        case Action.Grow:
            threads = server.growThreads
            remain = await runThreads(ctx, Script.Grow, threads, [server.name])
            duration = ns.getGrowTime(server.name)
            break;
        case Action.Hack:
            threads = server.hackThreads
            remain = await runThreads(ctx, Script.Hack, server.hackThreads, [server.name])
            duration = ns.getHackTime(server.name)
            break;
    }
    let eventDuration = duration
    logger.debug(`[${server.name}]: ${threads - remain}/${threads} ${action} ${ns.tFormat(duration)}`)
    if (remain == threads) {
        eventDuration = 5000
    }
    return {
        server: name,
        duration: eventDuration + 100, // grace period to let all effects tickle in
        action: action,
        remainingActionDuration: duration,
        needThreads: threads,
        startedThreads: threads - remain
    }
}

function getServerListFromQueue(ctx: Context, queue: TimedQueue<IEvent>): Map<string, Server> {
    let hackingServers = new Map()
    for (let i = 0; i < queue.length(); i++) {
        let server = new Server(ctx, queue.data[i].server)
        hackingServers.set(server.name, server)
    }
    return hackingServers
}

async function getHackableServers(ns: NS, logger: ILogger): Promise<IServer[]> {
    let result: IServer[] = []
    const serverMap = await loadServerMap(ns)
    for (const server of serverMap.values()) {
        if (exploitable(ns, server)) {
            result.push(server)
        } else {
            logger.debug(`${server.name} is not exploitable`)
        }
    }
    return result
}

/** @param {NS} ns **/
export async function main(ns: NS) {
    let opts = ns.flags([
        ["reset", false],
        ["server", []],
    ])
    let servers: string[] = opts.server
    ns.disableLog("ALL")
    let logger = new Logger(ns).withWriter(new LogWriter(ns))
    logger.withLevel(LogLevel.Debug)
    let ctx = new Context(ns, logger)
    let queue = newEventQueue(ns)
    let hackingServers: Map<string, IServer> = new Map()
    const queueTimeout = 10000
    if (!opts.reset) {
        logger.info("loading queue")
        queue = await loadEventQueue(ns)
        hackingServers = getServerListFromQueue(ctx, queue)
    }

    while (true) {
        for (const srv of await getHackableServers(ns, logger)) {
            if (hackingServers.has(srv.name)) {
                continue
            }
            if (!(servers.length == 0 || servers.includes(srv.name))) {
                continue
            }
            queue.push(0, newInitializationEvent(srv.name))
            await queue.saveToFile()
            hackingServers.set(srv.name, srv)
        }
        logger.debug("finished server scan")
        let start = Date.now()
        while (queueTimeout + start > Date.now()) {
            let [dur, data] = queue.peek()
            if (dur != undefined && data != undefined) {
                logger.trace(`peek: ${dur - Date.now()} -> ${data.server}`)
            } else {
                await ns.sleep(queueTimeout)
                break
            }
            let srvState = await queue.blockShiftUntil(1000)
            if (srvState != undefined) {
                let result = await hackBetter(ctx, srvState.server)
                queue.push(result.duration, result)
                await queue.saveToFile()
            }
        }
    }
}