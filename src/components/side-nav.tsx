import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export interface SideNavProps {
  items: NavItem[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  className?: string;
}

/**
 * 侧边导航栏组件
 * 用于在设置页面等地方提供导航功能
 */
export function SideNav({
  items,
  activeId,
  onNavigate,
  className,
}: SideNavProps) {
  const handleClick = (id: string, href: string) => {
    if (onNavigate) {
      onNavigate(id);
    } else {
      // 默认行为：使用 chrome.tabs 打开页面
      chrome.tabs.create({ url: chrome.runtime.getURL(href) });
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <ScrollArea className="h-full py-4">
        <nav className={cn("flex flex-col gap-1 px-2", className)}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <Tooltip key={item.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10 px-3",
                      isActive && "bg-muted font-medium",
                    )}
                    onClick={() => handleClick(item.id, item.href)}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="text-sm">{item.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </ScrollArea>
    </TooltipProvider>
  );
}
