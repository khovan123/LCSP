"use client";

import * as React from "react";

type CollapsibleContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CollapsibleContext =
  React.createContext<CollapsibleContextValue | null>(null);

function Collapsible({
  open,
  defaultOpen = false,
  onOpenChange,
  ...props
}: React.ComponentProps<"div"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const currentOpen = open ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  return (
    <CollapsibleContext.Provider value={{ open: currentOpen, setOpen }}>
      <div data-slot="collapsible" {...props} />
    </CollapsibleContext.Provider>
  );
}

function CollapsibleTrigger({
  render,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button"> & {
  render?: React.ReactElement<{
    children?: React.ReactNode;
    onClick?: React.MouseEventHandler;
    "aria-expanded"?: boolean;
    "data-state"?: string;
  }>;
}) {
  const context = useCollapsibleContext();
  const state = context.open ? "open" : "closed";

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (!event.defaultPrevented) {
      context.setOpen(!context.open);
    }
  }

  if (render) {
    return React.cloneElement(render, {
      children,
      onClick: handleClick,
      "aria-expanded": context.open,
      "data-state": state,
    });
  }

  return (
    <button
      type="button"
      data-slot="collapsible-trigger"
      data-state={state}
      aria-expanded={context.open}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

function CollapsibleContent({
  children,
  ...props
}: React.ComponentProps<"div">) {
  const context = useCollapsibleContext();

  if (!context.open) {
    return null;
  }

  return (
    <div data-slot="collapsible-content" data-state="open" {...props}>
      {children}
    </div>
  );
}

function useCollapsibleContext() {
  const context = React.useContext(CollapsibleContext);
  if (!context) {
    throw new Error("Collapsible components must be used within Collapsible.");
  }
  return context;
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
