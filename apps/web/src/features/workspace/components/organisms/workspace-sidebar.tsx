"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  getWorkspaceNavigationUrl,
  isWorkspaceNavigationItemActive,
  parseWorkspaceNavigationTarget,
} from "@/lib/workspace-navigation";

import type { WorkspaceNavigationItem } from "../../types/navigation.types";

type WorkspaceSidebarProps = {
  productName: string;
  navigationLabel: string;
  mobileTitle: string;
  mobileDescription: string;
  items: WorkspaceNavigationItem[];
};

export function WorkspaceSidebar({
  productName,
  navigationLabel,
  mobileTitle,
  mobileDescription,
  items,
}: WorkspaceSidebarProps) {
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

  function handleNavigation(
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    const target = parseWorkspaceNavigationTarget(href);

    if (pathname !== target.pathname) {
      return;
    }

    event.preventDefault();
    window.history.pushState(null, "", getWorkspaceNavigationUrl(href));
    setCurrentHash(target.hash);
  }

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      mobileTitle={mobileTitle}
      mobileDescription={mobileDescription}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={productName}>
              <span>{productName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{navigationLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isWorkspaceNavigationItemActive({
                        currentPathname: pathname,
                        currentHash,
                        href: item.href,
                      })}
                      render={
                        <a
                          href={item.href}
                          onClick={(event) =>
                            handleNavigation(event, item.href)
                          }
                        />
                      }
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
      </SidebarContent>
    </Sidebar>
  );
}
