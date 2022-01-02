import {getPath} from "/lib/ServerFunctions";
import {IServer, newServer} from "/lib/ServerMap";

describe("basic test", () => {
    it('should', () => {
        let map = new Map(
            [
                ["home", newServer("home", undefined)],
                ["iron-gym", newServer("iron-gym", 'home')],
                ["awful-gym", newServer("awful-gym", 'home')],
                ["test", newServer("test", "iron-gym")],
            ]
        )
        const path = getPath(map, "test", "awful-gym")
        expect(path).toStrictEqual(["iron-gym", "home", "awful-gym"])
        expect(getPath(map,"home","home")).toStrictEqual([])
        expect(getPath(map, 'awful-gym', 'test')).toStrictEqual(["home",'iron-gym','test'])
    })

})
