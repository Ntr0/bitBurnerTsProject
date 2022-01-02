import {NS} from "Bitburner"
import {getLogger, ILogger} from "/lib/Logger"
import {Action} from "/lib/consts";
import {IServer} from "/lib/ServerMap";

const growthRatio = 0.9
const hackRatio = 0.75 // we are only aming to get 75% of the money available, to optimize growth
const weakFactor = 0.05
const fortifyAmount = 0.002

export class Server implements IServer{
    ns: NS
    logger: ILogger
    name: string
    parent: string

    growThreads: number = 0
    growAmount: number = 0
    growTime: number = 0

    hackingLevel: number = -1
    rooted: boolean = false
    curMoney: number = 0
    maximumMoney: number = 0

    weakThreads: number = 0
    weakTime: number = 0
    minSecLevel: number = 0
    secLevel: number = 0
    secIncrease: number = 0
    invalid: boolean = false
    hackThreads = 0
    public backdoor :boolean = false
    private hackAmount: number = 0;
    private baseHackThreads: number = 0;
    hackChance: number = 0;

    constructor(ns: NS, name, parent = "") {
        this.ns = ns
        this.logger = getLogger(ns)
        this.name = name
        this.parent = parent
    }
    static fromIServer(ns:NS, srv: IServer) :Server{
        let server = new Server(ns, srv.name, srv.parent)
        server.maximumMoney = srv.maximumMoney
        server.hackingLevel = srv.hackingLevel
        server.rooted = srv.rooted
        server.backdoor = srv.backdoor
        return server
    }
    getWeakAfterHack() {
        if (!this.hackable()) {
            return 0
        }
        // const percentHacked = calculatePercentMoneyHacked(server, Player);

        // server.fortify(CONSTANTS.ServerFortifyAmount * Math.min(threads, maxThreadNeeded));
        const percentHacked = this.ns.hackAnalyze(this.name)
        let maxThreadNeeded = Math.ceil((1 / percentHacked) * (this.curMoney / this.maximumMoney));
        let securityIncrease = fortifyAmount * Math.min(this.hackThreads, maxThreadNeeded)
        return Math.ceil((this.secLevel + securityIncrease - this.minSecLevel) / weakFactor)
    }

    getWeakAfterGrow() {
        /**
         *   if (oldMoneyAvailable !== server.moneyAvailable) {
    //Growing increases server security twice as much as hacking
    let usedCycles = numCycleForGrowth(server, server.moneyAvailable / oldMoneyAvailable, p, cores);
    usedCycles = Math.min(Math.max(0, Math.ceil(usedCycles)), threads);
    server.fortify(2 * CONSTANTS.ServerFortifyAmount * usedCycles);
  }
         */

//        let usedCycles = this.ns.growthAnalyze(this.name, )
    }

    updateValues() {
        let ns = this.ns
        try {
            this.hackingLevel = ns.getServerRequiredHackingLevel(this.name)
            this.rooted = ns.hasRootAccess(this.name)

            this.maximumMoney = ns.getServerMaxMoney(this.name)
            this.curMoney = ns.getServerMoneyAvailable(this.name)

            if (this.hackable()) {
                this.hackAmount = this.curMoney * hackRatio
                this.baseHackThreads = Math.ceil(ns.hackAnalyzeThreads(this.name, this.hackAmount))
                this.hackChance = ns.hackAnalyzeChance(this.name)

                this.secLevel = ns.getServerSecurityLevel(this.name)
                this.minSecLevel = ns.getServerMinSecurityLevel(this.name)

                this.weakTime = ns.getWeakenTime(this.name)
                this.weakThreads = Math.ceil((this.secLevel - this.minSecLevel) / weakFactor)

                let wantMoney = this.maximumMoney * growthRatio

                let useMoney = (this.curMoney == 0 ? 1 : this.curMoney)
                let growthFactor = wantMoney / useMoney

                // growth
                if (growthFactor >= 1) {
                    this.growAmount = (this.maximumMoney * growthRatio) - this.curMoney
                    this.growThreads = Math.ceil(ns.growthAnalyze(this.name, growthFactor < 1 ? 1 : growthFactor))
                    this.growTime = ns.getGrowTime(this.name)
                }
                this.optimizeHackThreads()
            }

        } catch (e) {
            this.invalid = true
            throw (e)
        }
    }

    updateScore() {
        this.updateValues()
    }

    /**
     * assumed that of 100 threads and a chance of 50%
     * it means that only 50 threads will be evective, we need to make some adoptions
     */
    optimizeHackThreads() {
        let successfulThreads = this.baseHackThreads
        let threads = successfulThreads

        let failedChance = 1 - this.hackChance
        let failedThreads = threads * failedChance

        let secIncrease = this.ns.hackAnalyzeSecurity(threads)
        this.logger.trace(`${failedChance}, ${this.hackChance} ${failedThreads} - ${threads} - ${successfulThreads}`)
        while (secIncrease + this.secLevel <= 100 && failedThreads > threads - successfulThreads) {
            this.logger.trace(`${failedThreads} - ${threads} - ${successfulThreads}`)
            threads = threads + threads * this.hackChance
            failedChance *= failedChance
            failedThreads = threads * failedChance
            secIncrease = this.ns.hackAnalyzeSecurity(threads)
        }
        this.hackThreads = Math.ceil(threads)
        this.secIncrease = secIncrease
    }

    hackable() {
        return (this.hackingLevel <= this.ns.getHackingLevel() && this.rooted && this.maximumMoney > 0)
    }

    growScore() {
        if ((this.growAmount > 0) && (this.growTime > 0) && (this.growThreads > 0)) {
            return (this.growAmount * 10000 / (this.growThreads * this.growTime))
        }
        return 0
    }

    printInfo() {
        this._printInfo(this.ns)
    }

    _cFormat(val: number) {
        return this.ns.nFormat(val, "$0.00a")
    }

    _printInfo(ns) {
        ns.tprint(`${this.name}: ${this._cFormat(this.curMoney)}/${this._cFormat(this.maximumMoney)}`)
        ns.tprint(`Growth: ${this.growThreads}T in ${(this.growTime / 1000).toFixed(3)}s to raise ${this._cFormat(this.growAmount)}`)
        ns.tprint(`Security: ${this.weakThreads}T for ${this.secLevel}/${this.minSecLevel} in ${this.weakTime / 1000}s}`)
        ns.tprint(`Hack: ${(this.hackChance * 100).toFixed(2)}% ${this.hackThreads}T -> Sec+ ${this.secIncrease}}`)
        ns.tprint(`Weak After Hack> ${this.getWeakAfterHack()}`)
    }

    shortInfo() {
        var grow = `G[${this.growThreads}->${this._cFormat(this.growAmount)}](${this.growScore()})`
        var weak = `W[${this.weakThreads}->${this.secLevel}->${this.minSecLevel}]`
        var hack = `H[${this.hackThreads}->${this.ns.nFormat(this.hackAmount, '$0.00a')} => S+${this.secIncrease.toFixed(2)}]`
        var money = `M[${this.ns.nFormat(this.curMoney, "$0.00a")}/${this.ns.nFormat(this.maximumMoney, "$0.00a")}`
        var root = this.rooted ? "+" : "-"
        var backdoor = this.backdoor ? "+": "-"
        return `${root}${backdoor}[${this.name}]:\t(${this.hackingLevel}) NA[${this.nextAction()}] ${grow} ${weak} ${hack} ${money}`
    }

    desiredMinSecurity(): number {
        return this.minSecLevel + 5
    }

    nextAction(): Action {
        if (this.secLevel > this.desiredMinSecurity()) {
            return Action.Weak
        } else if (this.curMoney < this.maximumMoney * growthRatio) {
            return Action.Grow
        } else {
            return Action.Hack
        }
    }
}