"use client";

import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ContentHubProvider } from "@/lib/store";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ContentHubProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </ContentHubProvider>
  );
}
