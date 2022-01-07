import {NS} from "Bitburner";
import {Job, scheduleJob} from "/lib/Job";

export async function main(ns: NS) {
    let opts = ns.flags([
        ["script", ""],
        ["args", []],
        ["threads", 0],
        ["deadline", 0],
        ["runtime", 0]
    ])
    let job: Job;
    job = {
        runTime: 0,
        threads: opts.threads,
        execTime: Date.now(),
        script: opts.script,
        deadline: Date.now() + opts.deadline,
        args: opts.args

    };
    await scheduleJob(ns, job)
}