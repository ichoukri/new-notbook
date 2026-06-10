import {
  Bell,
  Box,
  Cpu,
  Layers,
  RefreshCw,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type SettingsTabId =
  | "models"
  | "chunking"
  | "vector-store"
  | "ingestion"
  | "permissions"
  | "notifications";

export type SettingsTab = {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
  desc: string;
};

export const SETTING_TABS: SettingsTab[] = [
  {
    id: "models",
    label: "Embedding Models",
    icon: Cpu,
    desc: "Model & endpoint config",
  },
  {
    id: "chunking",
    label: "Chunking",
    icon: Layers,
    desc: "Chunk size & strategy",
  },
  {
    id: "vector-store",
    label: "Vector Store",
    icon: Box,
    desc: "Database connection",
  },
  {
    id: "ingestion",
    label: "Ingestion Defaults",
    icon: RefreshCw,
    desc: "Mode & retry settings",
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: Shield,
    desc: "Access control",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    desc: "Alerts & emails",
  },
];
