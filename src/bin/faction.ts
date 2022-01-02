import {NS, Player} from "Bitburner";

/*
const factions:string[] = [
    "Fulcrum Secret Technologies",
    "Bachman & Associates",
    "Volhaven",
    "Daedalus",
    "Sector-12",
    "MegaCorp",
    "NWO",
    "Aevum",
]
*/
function shouldIncreaseReputationAtFaction(ns: NS, me: Player, faction: string): boolean {
    let requiredFavor = ns.getFavorToDonate()
    // I only want to increase the rep, if the faction offers interesting things
    let augs = ns.getAugmentationsFromFaction(faction)
    let myAugs: string[] = ns.getOwnedAugmentations(true)
    let remainingAugmentations = augs.filter(aug => !myAugs.includes(aug))
    if (remainingAugmentations.length <= 0) {
        return false
    }
    /*
    for (const aug of remainingAugmentations) {
        let repCosts = ns.getAugmentationRepReq(aug)
    }

     */

    return (ns.getFactionFavor(faction) + ns.getFactionFavorGain(faction) < requiredFavor)
}

export async function main(ns: NS) {
    let me = ns.getPlayer()
    let worked = true
    while (worked) {
        worked = false
        for (const faction of me.factions) {
            if (shouldIncreaseReputationAtFaction(ns, me, faction)) {
                ns.tprintf("should work at " + faction)
                if (!ns.workForFaction(faction, "Hacking Contracts")) {
                    ns.tprintf("could not start working for faction " + faction)
                } else {
                    worked = true
                    await ns.sleep(60000)
                    ns.stopAction()
                }
            }
        }
    }
}