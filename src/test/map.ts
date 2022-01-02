import {NS} from "Bitburner";
import {mapFromJSON, mapToJSON} from "/lib/map";
import {getLogger, TermLogger} from "/lib/Logger";

class Test {
    data: string

    constructor(data: string) {
        this.data = data
    }

    fun() {
        return this.data
    }

    static parse(json: string) {
        let data = JSON.parse(json)
        return new Test(data)
    }

    static dump(value: Test) {
        return JSON.stringify(value.data)
    }
}

function revive(value) {
    return
}

export async function main(ns: NS) {
    let m = new Map()

    let logger = new TermLogger(ns)
    m.set("test", new Test("test/data"))
    for (const [k,v] of m.entries()) {
        logger.info(`${k}->${typeof(v)}`)
    }
    let dump = mapToJSON(m, Test.dump)
    logger.info(dump)
    let newMap = mapFromJSON(dump, Test.parse)
    for (const [k,v] of newMap.entries()) {
        logger.info(`${k}->${typeof(v)}`)
    }
    logger.info(`${newMap.entries()}`)
    logger.info(newMap.get("test").fun())
}