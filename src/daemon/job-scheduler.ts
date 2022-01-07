import {NS} from "Bitburner";
import {JobScheduler} from "/lib/Job";
import {Context} from "/lib/context";

export async function main(ns: NS) {
    let ctx = new Context(ns)
    let jobScheduler = new JobScheduler(ctx)
    ns.disableLog("sleep")
    await jobScheduler.main()
}