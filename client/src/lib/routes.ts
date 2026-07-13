import {
  Sparkles,
  TrendingUp,
  Pencil,
  FileText,
  Calendar,
  MessageCircle,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavGroup = "Workspace" | "Comms";

export type RouteConfig = {
  path: string;
  label: string;
  icon: LucideIcon;
  titleBase: string;
  titleAccent: string;
  group: NavGroup;
};

export const routes: RouteConfig[] = [
  { path: "/", label: "AI Chat", icon: Sparkles, titleBase: "AI ", titleAccent: "Chat", group: "Workspace" },
  { path: "/trends", label: "Trends", icon: TrendingUp, titleBase: "Trending ", titleAccent: "Now", group: "Workspace" },
  { path: "/scripts", label: "Scripts & Ideas", icon: Pencil, titleBase: "Scripts & ", titleAccent: "Ideas", group: "Workspace" },
  { path: "/contracts", label: "Contracts", icon: FileText, titleBase: "", titleAccent: "Contracts", group: "Workspace" },
  { path: "/calendar", label: "Calendar", icon: Calendar, titleBase: "", titleAccent: "Calendar", group: "Comms" },
  { path: "/dms", label: "Instagram DMs", icon: MessageCircle, titleBase: "Instagram ", titleAccent: "DMs", group: "Comms" },
  { path: "/settings", label: "Settings", icon: Settings, titleBase: "", titleAccent: "Settings", group: "Comms" },
];

export function findRoute(pathname: string): RouteConfig | undefined {
  return routes.find((route) => route.path === pathname);
}
