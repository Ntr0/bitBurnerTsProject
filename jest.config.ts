module.exports = {
    transform: {'^.+\\.ts?$': 'ts-jest'},
    testEnvironment: 'node',
    testRegex: 'test.(ts|tsx)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^/lib/(.*)$': '<rootDir>/src/lib/$1',
    },
    globals: {
        "ts-jest": {
            compiler: "typescript",
            tsconfig: "tsconfig.json", // ← important !!!
            diagnostics: {
                ignoreCodes: [151001]
            }
        }
    }
};
