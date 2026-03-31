import {
  Search,
  Home,
  Users,
  Sparkles,
  Inbox,
  Settings,
  Store,
  Trash2,
  Calendar,
  Mail,
} from "lucide-react";

const MAIN_NAV_ITEMS = [
  { icon: Search, label: "Search" },
  { icon: Home, label: "Home" },

  { icon: Inbox, label: "Inbox" },
];

const NOTION_APPS = [
  { icon: Mail, label: "Notion Mail" },
  { icon: Calendar, label: "Notion Calendar" },
];

const BOTTOM_NAV_ITEMS = [
  { icon: Settings, label: "Settings" },
  { icon: Trash2, label: "Trash" },
];

export { MAIN_NAV_ITEMS, NOTION_APPS, BOTTOM_NAV_ITEMS };
