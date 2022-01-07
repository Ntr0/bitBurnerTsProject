import {loadEventQueue} from "/lib/EventQueue"

/** @param {NS} ns **/
export async function main(ns) {
    let queue = await loadEventQueue(ns)

    let now = Date.now()
    for (let i = 0; i < queue.length(); i++) {
        const [time, event] = queue.getAt(i)
        let diff = ns.tFormat(time - now)
        ns.tprint(`${diff}: ${event.server} ${event.action}: ${event.startedThreads}/${event.needThreads}`)
    }

}