import { AuditWriterService } from "./audit-writer.service.js";
import { AuditModule } from "./audit.module.ts";

describe("AuditModule", () => {
  it("T08: is registered as a global module so AuditWriterService is injectable everywhere", () => {
    const isGlobal = Reflect.getMetadata("__module:global__", AuditModule) as
      boolean | undefined;

    expect(isGlobal).toBe(true);
  });

  it("T08: exports AuditWriterService", () => {
    const exportsMetadata = Reflect.getMetadata(
      "exports",
      AuditModule,
    ) as unknown[];

    expect(exportsMetadata).toContain(AuditWriterService);
  });
});
