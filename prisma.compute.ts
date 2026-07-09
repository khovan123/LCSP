import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "@lcsp/api",
    root: "apps/api",
    framework: "custom",
    httpPort: 3000,
    build: {
      command: null,
      outputDirectory: "dist",
      entrypoint: "src/main.js",
    },
  },
});
