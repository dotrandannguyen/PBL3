import { Chrome, Github, Mail } from "lucide-react";

const NOTIFICATIONS = [
  {
    id: 1,
    source: "google",
    sender: "Google Security",
    subject: "Security alert",
    preview: "New sign-in to your Google Account on a Windows device.",
    time: "1h",
    unread: true,
    icon: Chrome,
    color: "#ea4335",
  },
  {
    id: 2,
    source: "github",
    sender: "GitHub",
    subject: "Personal access token",
    preview: "A personal access token has been added to your account.",
    time: "2h",
    unread: true,
    icon: Github,
    color: "#d4d4d4",
  },
  {
    id: 3,
    source: "mail",
    sender: "Linear",
    subject: "Cycle 12 Summary",
    preview: "The cycle has ended. View the summary of completed issues.",
    time: "1d",
    unread: false,
    icon: Mail,
    color: "#5e6ad2",
  },
];

export default NOTIFICATIONS;
