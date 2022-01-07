import {loadServerMap} from "/lib/ServerMap"
import {getLogger} from "/lib/Logger"
import {Context, getNS} from "/lib/context";

/**
 * @param {Context} ctx
 * @param {string} serverName
 * @param {string} script script to run
 * @param {int} threads
 * @param {[any]} args arguments to pass to the script
 */
async function startScript(ctx: Context, serverName: string, script: string, threads: any, args: any) {
    let logger = getLogger(ctx)
    let ns = getNS(ctx)
    if (!ns.fileExists(script, serverName)) {
        if (!await ns.scp(script, "home", serverName)) {
            logger.warning("failed to copy " + script + " to " + serverName)
        }
    }
    let pid = ns.exec(script, serverName, threads, ...args)
    if (pid == 0) {
        logger.warning("failed to start " + script + " on " + serverName)
        return 0
    }
    logger.debug(`started on ${serverName} with ${threads} threads PID[${pid}]: ${script} ${args}`)
    return threads

}

/**
 * start given script with as many threads on all servers as possible to the max given
 * it will try all available servers only once, so the number of threads started may be
 * equal or lower than the max threads given.
 *
 * @param {Context} ctx context
 * @param {string} script script to run
 * @param {int} threads total number of threads to start
 * @param {[any]} args args to pass to the script
 * @returns {int} number of threads remained.
 */
//
export async function runThreads(ctx: Context, script: string, threads: number, args: string[]) {
    const logger = getLogger(ctx)
    const ns = getNS(ctx)
    const serverMap = await loadServerMap(ns)
    const scriptRam = ns.getScriptRam(script)
    try {
        for (const [name, server] of serverMap.entries()) {

            if (!server.rooted) {
                logger.debug(`skip unrooted server ${name}`)
                continue;
            }
            let freeRam = server.maxRam - ns.getServerUsedRam(name)
            if (name == "home") {
                freeRam -= 10
            }
            const freeThreads = Math.floor(freeRam / scriptRam)
            if (freeThreads >= 1) {
                const startThreads = freeThreads > threads ? threads : freeThreads
                logger.debug(`starting ${script} on ${name} with ${startThreads}, ${threads} remaining`)
                const started = await startScript(ctx, name, script, startThreads, args)
                threads -= started
            }
            if (threads <= 0) {
                break
            }
        }
    } catch (e) {
        logger.error(e, `catched error ${e}`)
    }
    return threads
}

/**
export async function runAllThreads(ns:NS, script: string, threads:number, args:string[]):Promise<number> {
    const logger = getLogger(ns)
    const serverMap = await loadServerMap(ns)
    const scriptRam = ns.getScriptRam(script)
    let totalThreads = threads
    let suitableServers = new Map()

    try {
        for (const [serverName, server] of serverMap.entries()) {
            if (!server.rooted) {
                logger.debug(`skip unrooted server ${serverName}`)
                continue;
            }
            const freeRam = ns.getServerMaxRam(serverName) - ns.getServerUsedRam(serverName)
            let freeThreads = Math.floor(freeRam / scriptRam)
            if (freeThreads >= 1) {
                if (freeThreads > threads) {
                    freeThreads = threads
                }
                suitableServers.set(serverName, freeThreads)
                threads -= freeThreads
            }
            if (threads == 0) {
                break
            }
        }
        if (threads > 0) {
            return totalThreads
        }
        for (const [server, startThreads] of suitableServers.entries()) {
            log(ns, `starting ${script} on ${server} with ${startThreads}, ${totalThreads} remaining`)

            var started = await startScript(ns, server, script, startThreads, args)
            totalThreads -= started

        }
    } catch (e) {
        log(ns, `catched error ${e}`)
    }

    return totalThreads
}
 */