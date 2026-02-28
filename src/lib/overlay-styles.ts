export const overlayContentBase =
  "z-50 overflow-hidden rounded-[10px] border border-border bg-popover p-1 text-popover-foreground shadow-md";

export const overlayMaxHeight =
  "max-h-[var(--radix-dropdown-menu-content-available-height)]";

export const overlayAnimation =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export const overlaySlideIn =
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

export const overlayContent = `${overlayContentBase} ${overlayMaxHeight} ${overlayAnimation} ${overlaySlideIn}`;

export const overlayItemBase =
  "relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none";

export const overlayItemHover =
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";

export const overlayItemFocus = "focus:bg-accent focus:text-accent-foreground";

export const overlayItemDisabled =
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export const overlayItemTransition = "transition-colors";

export const overlayItem = `${overlayItemBase} ${overlayItemHover} ${overlayItemDisabled} ${overlayItemTransition}`;

export const overlayItemWithIcon = "gap-2";

export const overlaySubTrigger = `${overlayItemBase} ${overlayItemHover} ${overlayItemDisabled} ${overlayItemTransition} data-[state=open]:bg-accent`;

export const overlayCheckableItem =
  "relative flex cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export const overlayItemIndicator =
  "absolute left-2 inline-flex h-3.5 w-3.5 items-center justify-center text-foreground";

export const overlayLabel = "px-2 py-1.5 text-sm font-semibold text-foreground";

export const overlaySeparator = "-mx-1 my-1 h-px bg-muted";

export const overlayShortcut = "ml-auto text-xs tracking-widest opacity-60";

export const overlayChevron = "ml-auto h-4 w-4 opacity-60";
