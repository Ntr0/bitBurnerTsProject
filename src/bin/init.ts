import {NS} from "Bitburner";

/** @param {NS} ns **/
export async function main(ns: NS) {
    ns.exec("/daemon/auto-buyer.ns", "home", 1)
    ns.exec("/daemon/crawler.ns", "home", 1, "--reset")
    ns.exec("/daemon/hacker.ns", "home", 1, "--reset")
    ns.exec("singularity.ns", "home", 1)
}
