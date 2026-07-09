import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "lcsp",
    root: "apps/api",
    framework: "nestjs",
  },
});
