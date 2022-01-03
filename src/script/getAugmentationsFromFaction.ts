import {NS} from "Bitburner";

export async function main(ns: NS) {
    let faction: string = <string>ns.args[0]
    ns.tprintf(ns.getAugmentationsFromFaction(faction).join("\n"))
}