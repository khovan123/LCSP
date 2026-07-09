import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "@lcsp/api",
    root: "apps/api",
    framework: "nestjs",
    httpPort: 3000,
  },
});
