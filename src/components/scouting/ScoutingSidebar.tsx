"use client";

import Image from "next/image";
import Link from "next/link";
import { Box, List, ListItemButton, ListItemIcon, Typography } from "@mui/material";
import { LucideIcon } from "lucide-react";
import {
  FileSpreadsheet,
  LayoutDashboard,
  NotebookPen,
  Settings,
  Trophy,
  Users,
} from "lucide-react";

const drawerWidth = 220;

type SidebarItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  activeKey?: "players";
};

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Oyuncular", icon: Users, href: "/scouting", activeKey: "players" },
  { label: "Raporlar", icon: FileSpreadsheet },
  { label: "Karşılaştırma", icon: Trophy },
  { label: "Notlar", icon: NotebookPen },
  { label: "Ayarlar", icon: Settings },
];

export function ScoutingSidebar({
  activeKey = "players",
}: {
  activeKey?: "players" | "detail";
}) {
  return (
    <Box
      component="aside"
      sx={{
        width: drawerWidth,
        height: "100vh",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        backgroundColor: "#0c1117",
        p: 2.5,
        display: { xs: "none", lg: "block" },
      }}
    >
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 1.4 }}>
        <Image
          src="/athleticlabs_logo.png"
          alt="Athletic Labs Logo"
          width={44}
          height={44}
          style={{ borderRadius: 999 }}
        />
        <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>
          Athletic Labs <Box component="span" sx={{ color: "#4ade80" }}>| Scouting</Box>
        </Typography>
      </Box>

      <List sx={{ gap: 0.5, display: "flex", flexDirection: "column" }}>
        {sidebarItems.map((item) => {
          const selected =
            (activeKey === "players" || activeKey === "detail") &&
            item.activeKey === "players";

          const content = (
            <ListItemButton
              selected={selected}
              sx={{
                borderRadius: 2.5,
                py: 1.2,
                borderLeft: selected ? "3px solid #4ade80" : "3px solid transparent",
                backgroundColor: selected ? "rgba(255,255,255,0.03)" : "transparent",
              }}
            >
              <ListItemIcon sx={{ color: selected ? "#4ade80" : "#8c98a8", minWidth: 36 }}>
                <item.icon size={18} />
              </ListItemIcon>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: selected ? 700 : 500,
                  color: selected ? "#4ade80" : "#c6d0db",
                }}
              >
                {item.label}
              </Typography>
            </ListItemButton>
          );

          if (item.href) {
            return (
              <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
                {content}
              </Link>
            );
          }

          return <Box key={item.label}>{content}</Box>;
        })}
      </List>
    </Box>
  );
}

export const scoutingDrawerWidth = drawerWidth;
