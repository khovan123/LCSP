"use client";

import { resolveMessage } from "@lcsp/i18n";
import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { appLocale } from "@/lib/locale";

import type { AppShellNavigationSection } from "../../types/app-shell.types";

export function AppSidebar({
  sections,
}: {
  sections: AppShellNavigationSection[];
}) {
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    function syncHash() {
      setCurrentHash(window.location.hash);
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, []);

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      mobileTitle={t("pages.appShell.mobileTitle")}
      mobileDescription={t("pages.appShell.mobileDescription")}
    >
      <SidebarHeader className="border-b border-sidebar-border/70">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/workspace" />}
              tooltip={t("pages.appShell.productName")}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <ShieldCheckIcon className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">
                  {t("pages.appShell.productName")}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/65">
                  {t("pages.appShell.productTagline")}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const [itemPath, itemHash = ""] = item.href.split("#");
                  const active = itemHash
                    ? pathname === itemPath && currentHash === `#${itemHash}`
                    : item.exact
                      ? pathname === itemPath && currentHash === ""
                      : pathname.startsWith(itemPath);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        render={<Link href={item.href} />}
                        tooltip={item.label}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70">
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-sidebar-foreground/65">
          <ShieldCheckIcon className="size-4 text-sidebar-primary" />
          <span>{t("pages.appShell.secureWorkspace")}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function t(key: string) {
  return resolveMessage(
    appLocale,
    key as Parameters<typeof resolveMessage>[1],
  );
}
