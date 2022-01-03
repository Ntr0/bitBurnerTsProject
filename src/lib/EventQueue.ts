import {NS} from "Bitburner";
import {Action, pathEventQueue} from "/lib/consts";
import {TimedQueue} from "/lib/TimedQueue";

export interface IEvent {
    server: string
    duration: number
    action: Action
    remainingActionDuration: number
    needThreads: number
    startedThreads: number
}

export function newEventQueue(ns: NS): TimedQueue<IEvent> {
    return new TimedQueue<IEvent>(ns, pathEventQueue)
}

export async function loadEventQueue(ns: NS): Promise<TimedQueue<IEvent>> {
    return await TimedQueue.fromFile<IEvent>(ns, pathEventQueue)
}