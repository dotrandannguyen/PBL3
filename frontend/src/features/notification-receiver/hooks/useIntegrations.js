import { useState, useCallback, useEffect } from "react";
import { integrationAPI } from "../api/integration.api";
import { getInboxTasks } from "../../tasks/api/task.api";
import { CloudRain, Github, Mail } from "lucide-react";
import useAuth from "../../auth/hooks/useAuth";

export const useIntegrations = () => {
  const { user, accessToken } = useAuth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState({
    gmail: true,
    github: true,
  });

  const fetchIntegrations = useCallback(async () => {
    if (!accessToken || !user) return;

    setLoading(true);
    let allItems = [];
    const newConnectedStatus = { gmail: true, github: true };

    try {
      // 1️⃣ Fetch preview từ API (Gmail + GitHub emails)
      const [gmailResult, githubResult] = await Promise.allSettled([
        integrationAPI.getGmailPreview(),
        integrationAPI.getGithubPreview(),
      ]);

      // 2️⃣ Fetch inbox tasks từ DB (để lấy isConverted flag)
      const inboxResponse = await getInboxTasks({ limit: 100 });
      let inboxTasks = [];

      // Handle different response structures
      if (Array.isArray(inboxResponse.data?.data?.data)) {
        // Standard shape from backend: { success: true, data: { data: [...] } }
        inboxTasks = inboxResponse.data.data.data;
      } else if (Array.isArray(inboxResponse.data?.data)) {
        // Fallback: { data: [...] }
        inboxTasks = inboxResponse.data.data;
      } else if (Array.isArray(inboxResponse.data)) {
        // Fallback: [...]
        inboxTasks = inboxResponse.data;
      }

      // Map of task ID -> task (để lookup isConverted)
      const taskMapById = {};
      if (Array.isArray(inboxTasks)) {
        inboxTasks.forEach((task) => {
          taskMapById[task.id] = task;
        });
      }
      // 🔍 DEBUG: Log tasks from DB
      console.log(
        "📥 [useIntegrations] Fetched from DB:",
        inboxTasks.length,
        "tasks",
      );
      console.log(
        "📊 [useIntegrations] taskMapById keys:",
        Object.keys(taskMapById),
      );
      console.log(
        "📄 [useIntegrations] Task details:",
        inboxTasks.slice(0, 3).map((t) => ({
          id: t.id,
          title: t.title,
          isConverted: t.isConverted,
        })),
      );

      // Handle Gmail response
      if (gmailResult.status === "fulfilled" && gmailResult.value.success) {
        const gmailDataArray = Array.isArray(gmailResult.value.data?.data)
          ? gmailResult.value.data.data
          : [];

        const mails = gmailDataArray.map((mail) => {
          // ✅ Lookup task dùng taskId (task ID từ preview API)
          const task = taskMapById[mail.taskId];
          // 🔍 DEBUG: Log lookup result
          if (mail.taskId) {
            console.log(
              `📧 [Gmail] Lookup mail.taskId=${mail.taskId}: task=${task ? `FOUND (isConverted=${task.isConverted})` : "NOT FOUND"}`,
            );
          }
          return {
            id: mail.taskId || `gmail-${mail.id}`,
            source: "gmail",
            sender: mail.from,
            subject: mail.subject,
            preview: mail.snippet,
            time: new Date(mail.date),
            link: mail.link,
            icon: Mail,
            color: "text-red-500",
            status: "INBOX",
            isConverted: task?.isConverted || false,
            itemData: mail,
          };
        });
        allItems = [...allItems, ...mails];
      } else if (
        gmailResult.status === "rejected" &&
        gmailResult.reason.response?.status === 404
      ) {
        newConnectedStatus.gmail = false;
      }

      // Handle Github response
      if (githubResult.status === "fulfilled" && githubResult.value.success) {
        const githubDataArray = Array.isArray(githubResult.value.data?.data)
          ? githubResult.value.data.data
          : [];

        const issues = githubDataArray.map((issue) => {
          // ✅ Lookup task dùng taskId (task ID từ preview API)
          const task = taskMapById[issue.taskId];
          // 🔍 DEBUG: Log lookup result
          if (issue.taskId) {
            console.log(
              `🐙 [GitHub] Lookup issue.taskId=${issue.taskId}: task=${task ? `FOUND (isConverted=${task.isConverted})` : "NOT FOUND"}`,
            );
          }
          return {
            id: issue.taskId || `github-${issue.id}`,
            source: "github",
            sender: issue.creator || issue.repository,
            subject: issue.title,
            preview: `Issue in ${issue.repository} - State: ${issue.state}`,
            time: new Date(issue.createdAt),
            link: issue.link,
            icon: Github,
            color: "text-gray-800 dark:text-gray-200",
            status: "INBOX",
            isConverted: task?.isConverted || false,
            itemData: issue,
          };
        });
        allItems = [...allItems, ...issues];
      } else if (
        githubResult.status === "rejected" &&
        githubResult.reason.response?.status === 404
      ) {
        newConnectedStatus.github = false;
      }

      // Sort combined array by time (newest first)
      allItems.sort((a, b) => b.time.getTime() - a.time.getTime());

      // Serialize dates to ISO string for rendering
      const serializedItems = allItems.map((item) => ({
        ...item,
        time: item.time.toISOString(),
      }));

      // 🔍 DEBUG: Log final data before setData
      console.log(
        "✅ [useIntegrations] Final data ready:",
        serializedItems.length,
        "items",
      );
      console.log(
        "📌 [useIntegrations] Items with isConverted=true:",
        serializedItems.filter((i) => i.isConverted).length,
      );
      serializedItems.slice(0, 3).forEach((item) => {
        console.log(
          `  - ${item.source} "${item.subject}": isConverted=${item.isConverted}`,
        );
      });

      setData(serializedItems);
      setConnected(newConnectedStatus);
      setError(null);
    } catch (err) {
      setError(err.message || "Something went wrong fetching integrations.");
      console.error("Error fetching integrations:", err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, user]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  return {
    data,
    setData,
    loading,
    error,
    connected,
    refetch: fetchIntegrations,
  };
};
