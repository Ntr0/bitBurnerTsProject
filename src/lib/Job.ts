import {NS} from "Bitburner";
import {TimedQueue} from "/lib/TimedQueue";
import {getLogger, ILogger} from "/lib/Logger";
import {runThreads} from "/lib/Scheduler";
import {Context, getNS} from "/lib/context";

const JobSchedulerPort = 1
const pathJobQueue = "/pvc/jobQueue.txt"
const EOF = "NULL PORT DATA"
const queueTimeout = 1000

export enum FailureHandler {

}

export interface Job {
    deadline: number
    execTime: number
    runTime: number
    script: string
    args: string[]
    threads: number
}

async function runJob(ctx: Context, job: Job): Promise<Job | undefined> {
    let deadline = job.deadline
    if (job.runTime != 0) {
        deadline -= job.runTime
    }
    if (deadline < Date.now()) {
        // drop the job, as it won't finish before the deadline
        return
    }
    let threads = await runThreads(ctx, job.script, job.threads, job.args)
    if (threads > 0) {
        return {
            args: job.args,
            deadline: job.deadline,
            runTime: job.runTime,
            execTime: Date.now() + 5000,
            script: job.script,
            threads: threads,
        }
    }
    return
}

export async function scheduleJob(ns: NS, job: Job) {
    while (!await ns.tryWritePort(JobSchedulerPort, [JSON.stringify(job)])) {
        await ns.sleep(1000)
    }
}

export class JobScheduler {
    ns: NS
    queue: TimedQueue<Job>
    logger: ILogger
    ctx: Context

    constructor(ctx: Context) {
        this.ns = getNS(ctx)
        this.logger = getLogger(ctx)
        this.ctx = ctx
        this.queue = new TimedQueue<Job>(this.ns, pathJobQueue)
    }

    async main() {
        while (true) {
            let item = this.ns.readPort(JobSchedulerPort)
            while (item != EOF) {
                let job: Job = JSON.parse(item)
                this.queue.pushAbs(job.execTime, job)
                item = this.ns.readPort(JobSchedulerPort)
            }
            await this.queue.saveToFile()
            let start = Date.now()
            while (queueTimeout + start > Date.now()) {
                if (this.queue.length() == 0) {
                    break
                }
                let job = await this.queue.blockShiftUntil(1000)
                if (job != undefined) {
                    let result = await runJob(this.ctx, job)
                    if (result != undefined) {
                        this.queue.pushAbs(result.execTime, result)
                        await this.queue.saveToFile()

                    }
                }
            }
            await this.ns.sleep(100)
        }
    }
}
