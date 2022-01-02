import {NS} from "Bitburner";

export class EventQueue {
    ns: NS
    queue: number[]
    data: any[]

    constructor(ns) {
        this.ns = ns
        this.queue = []
        this.data = []

    }

    peek() {
        if (this.queue.length == 0) {
            return [undefined, undefined]
        }
        return [this.queue[0], this.data[0]]
    }

    getEvent(i) {
        if (i < this.length()) {
            return [this.queue[i], this.data[i]]
        }
        return [undefined, undefined]
    }

    getData() {
        return this.data
    }

    async blockShiftUntil(ms) {
        if (this.queue.length == 0) {
            return undefined
        }

        let now = Date.now()
        if (this.queue[0] > now) {
            if (this.queue[0] - now > ms) {
                await this.ns.sleep(ms)
                return undefined
            }
            await this.ns.sleep(this.queue[0] - now)
        }
        return this._shift()
    }

    async blockShift() {
        if (this.queue.length == 0) {
            return undefined
        }

        let now = Date.now()
        if (this.queue[0] > now) {
            await this.ns.sleep(this.queue[0] - now)
        }
        return this._shift()
    }

    _shift() {
        this.queue.shift()
        return this.data.shift()
    }

    shift() {
        if (this.queue[0] > Date.now()) {
            return undefined
        }
        return this._shift()

    }

    length() {
        return this.queue.length
    }

    push(duration, event) {
        if (event === undefined) {
            throw ("cannot use undefined in queue")
        }
        let index = 0
        let dueTime = Date.now() + duration
        for (; index < this.queue.length; index++) {
            if (dueTime < this.queue[index]) {
                break;
            }
        }
        this.queue.splice(index, 0, dueTime)
        this.data.splice(index, 0, event)
    }

    async saveToFile(file) {
        let data: string[] = [JSON.stringify(this)]
        await this.ns.write(file, data, "w")
    }
}

export async function loadEventQueue(ns, fileName) {
    var item = new EventQueue(ns)
    var data = await ns.read(fileName)
    if (data != "") {

        let parsed = JSON.parse(data)
        item.data = parsed.data
        item.queue = parsed.queue

    }
    return item
}