import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  apps: {
    api: {
      root: "apps/api",
      framework: "nestjs",
    },
    web: {
      root: "apps/web",
      framework: "nextjs",
    },
  },
});
