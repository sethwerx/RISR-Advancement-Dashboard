import type { ComponentType } from "react";

export type TabDefinition = {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  description: string;
  Component?: ComponentType;
};
