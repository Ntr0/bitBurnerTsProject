import {NS} from "Bitburner";


export class TimedQueue<Type> {
    ns: NS
    queue: number[]
    data: Type[]
    fileName: string

    constructor(ns: NS, saveFileName: string) {
        this.ns = ns
        this.queue = []
        this.data = []
        this.fileName = saveFileName

    }

    public peek(): [number | undefined, Type | undefined] {
        if (this.queue.length == 0) {
            return [undefined, undefined]
        }
        return [this.queue[0], this.data[0]]
    }

    public getAt(i: number): [number, Type] {
        if (i < this.length()) {
            return [this.queue[i], this.data[i]]
        }
        throw new Error("index out of bounds")
    }

    public getData(): Type[] {
        return this.data
    }

    public async blockShiftUntil(ms: number): Promise<Type | undefined> {
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

    /**
     * blockShift will return the next item in the queue once the time for it has arrived.
     * It will block till given timeout or until the item is now ripe, whatever is earlier
     * @param maxDuration
     */
    public async blockShift(maxDuration: number = -1): Promise<Type | undefined> {
        if (this.queue.length == 0) {
            return undefined
        }
        let now = Date.now()
        if (this.queue[0] > now) {
            let timeout = this.queue[0] - now
            if (maxDuration != -1) {
                timeout = Math.min(timeout, maxDuration)
            }
            await this.ns.sleep(timeout)
        }
        return this.shift()
    }

    private _shift(): Type | undefined {
        this.queue.shift()
        return this.data.shift()
    }

    /**
     * shift returns undefined if no item is to be processed now, or if the queue is empty.
     * Otherwise item of Type is returned
     */
    public shift(): Type | undefined {
        if (this.queue.length == 0 || this.queue[0] > Date.now()) {
            return undefined
        }
        return this._shift()
    }

    public length() {
        return this.queue.length
    }

    public pushAbs(dueTime: number, event: Type) {
        let index = 0
        for (; index < this.queue.length; index++) {
            if (dueTime < this.queue[index]) {
                break;
            }
        }
        this.queue.splice(index, 0, dueTime)
        this.data.splice(index, 0, event)
    }

    public push(duration: number, event: Type) {
        this.pushAbs(Date.now() + duration, event)
    }

    public async saveToFile() {
        let data: string[] = [JSON.stringify(this)]
        await this.ns.write(this.fileName, data, "w")
    }

    public static async fromFile<Type>(ns: NS, fileName: string): Promise<TimedQueue<Type>> {
        var item = new TimedQueue<Type>(ns, fileName)
        var data = await ns.read(fileName)
        if (data != "") {

            let parsed = JSON.parse(data)
            item.data = parsed.data
            item.queue = parsed.queue

        }
        return item
    }
}