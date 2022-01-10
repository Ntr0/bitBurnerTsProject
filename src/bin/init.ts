import {NS} from "Bitburner";

/** @param {NS} ns **/
export async function main(ns: NS) {
    ns.exec("/daemon/auto-buyer.js", "home", 1)
    ns.exec("/daemon/crawler.js", "home", 1, "--reset")
    ns.exec("/daemon/hacker.js", "home", 1, "--reset")
    ns.exec("singularity.js", "home", 1)
}
