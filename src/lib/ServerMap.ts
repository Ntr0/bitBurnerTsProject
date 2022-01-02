import {pathServerMap} from "/lib/consts"
import {mapFromJSON, mapToJSON} from "/lib/map";
import {NS} from "Bitburner";


export interface IServer {
    name: string,
    parent: string,
    backdoor: boolean,
    rooted: boolean
    hackingLevel : number
    maximumMoney: number
    maxRam: number

}

export function newServer(name, parent): IServer {
    return {
        name: name,
        parent: parent,
        backdoor: false,
        rooted: false,
        hackingLevel: -1,
        maximumMoney: -1,
        maxRam: -1,
    }
}

export async function loadServerMap(ns:NS) : Promise<Map<string,IServer>> {
    var data = await ns.read(pathServerMap)
    return mapFromJSON(data)
}

export async function saveServerMap(ns, serverMap) {
    await ns.write(pathServerMap, mapToJSON(serverMap), "w")
}