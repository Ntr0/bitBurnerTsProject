function replace(valueReplacer: Function) {
    return function (key, value) {
        if (value instanceof Map) {
            let replacedValue = new Array()
            for (const [k, v] of value.entries()) {
                replacedValue.push([k, valueReplacer(v)])
            }
            return {
                dataType: 'Map',
                value: replacedValue,
            };
        }
        return value;
    }
}

function revive(valueReviver) {
    return function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (value.dataType === 'Map') {
                let m = new Map()
                let raw = new Map(value.value)
                for (const [k, v] of raw.entries()) {
                    m.set(k, valueReviver(v))
                }
                return m;
            }
        }
        return value;

    }
}

function defaultReviver(value) {
    return value
}

function defaultReplacer(value) {
    return value
}

export function mapFromJSON(data: string, valueReviver: Function = defaultReviver): Map<string, any> {
    let m = new Map()
    if (data != "") {
        m = JSON.parse(data, revive(valueReviver))
    }
    return m
}

export function mapToJSON(m: Map<string, any>, valueReplacer: Function = defaultReplacer): string {
    return JSON.stringify(m, replace(valueReplacer), '\t')
}

class myMap {

}