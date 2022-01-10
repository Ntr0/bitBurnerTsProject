export const pathServerMap = "/pvc/servermap.txt"
export const path = {
    CrawlerData: "/data/crawlerdata.txt",
}
export const pathEventQueue = "/pvc/eventqueue.txt"

export enum Script {
    Weaken = "/hack/weaken.js",
    Hack = "/hack/hack.js",
    Grow = "/hack/grow.js",
}

export enum Action {
    Init = "init",
    Weak = "weak",
    Grow = "grow",
    Hack = "hack"
}