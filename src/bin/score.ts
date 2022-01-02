import { Server } from "/lib/Server"
//import {loadServerMap} from "/lib/ServerMap.ts"
export function autocomplete(data, args) {
    return [...data.servers]
}
/** @param {NS} ns **/
export async function main(ns) {
    var srv = new Server(ns, ns.args[0])
    srv.updateScore()
    srv.printInfo()
/*
    var serverMap = await loadServerMap(ns)

    var parent = serverMap.get(srv.name)
    var path = ""

   while ( typeof(parent) != 'undefined' ) {
        path = "connect " + parent.name + "; " + path
        parent = serverMap.get(parent.parent)
    }
    ns.tprint("path: " + path)

    //await scoreServer(ns, ns.args[0])

 */
}