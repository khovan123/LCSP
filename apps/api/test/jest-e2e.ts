import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "..",
  testEnvironment: "node",
  testRegex: "test/.*\\.e2e-spec\\.ts$",
  setupFiles: ["<rootDir>/test/jest-env.ts"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "^(.*\\/scan\\/presentation\\/http\\/worker-api-key.guard)\\.js$":
      "<rootDir>/src/modules/scan/presentation/http/worker-api-key.guard.js",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  maxWorkers: 1,
};

export default config;
