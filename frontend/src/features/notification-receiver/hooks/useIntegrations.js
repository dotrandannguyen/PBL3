import { useState, useCallback, useEffect } from "react";
import { integrationAPI } from "../api/integration.api";
import { getInboxTasks } from "../../tasks/api/task.api";
import { CloudRain, Github, Mail, Slack } from "lucide-react";
import useAuth from "../../auth/hooks/useAuth";

export const useIntegrations = () => {
  const { user, accessToken } = useAuth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState({
    gmail: true,
    github: true,
    slack: true,
  });

  const fetchIntegrations = useCallback(async () => {
    if (!accessToken || !user) return;

    setLoading(true);
    let allItems = [];
    const newConnectedStatus = { gmail: true, github: true, slack: true };

    try {
      // Fetch preview từ API (Gmail + GitHub emails)
      const [gmailResult, githubResult, slackResult] = await Promise.allSettled([
        integrationAPI.getGmailPreview(),
        integrationAPI.getGithubPreview(),
        integrationAPI.getSlackPreview(),
      ]);

      //Fetch inbox tasks từ DB (để lấy isConverted flag)
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
      // Inbox tasks fetched — map by ID for fast lookup below

      // Handle Gmail response
      if (gmailResult.status === "fulfilled" && gmailResult.value.success) {
        const gmailDataArray = Array.isArray(gmailResult.value.data?.data)
          ? gmailResult.value.data.data
          : [];

        const mails = gmailDataArray
          .map((mail) => {
            // Lookup task dùng taskId (task ID từ preview API)
            const task = taskMapById[mail.taskId];

            // Task external đã ARCHIVED => xem như đã dismiss khỏi inbox
            if (task?.status === "ARCHIVED") {
              return null;
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
              status: task?.status || "INBOX",
              isConverted: task?.isConverted || false,
              itemData: mail,
            };
          })
          .filter(Boolean);
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

        const issues = githubDataArray
          .map((issue) => {
            //Lookup task dùng taskId (task ID từ preview API)
            const task = taskMapById[issue.taskId];

            // Task external đã ARCHIVED => xem như đã dismiss khỏi inbox
            if (task?.status === "ARCHIVED") {
              return null;
            }


            return {
              id: issue.taskId || `github-${issue.id}`,
              source: "github",
              sender: issue.creator || issue.repository,
              subject: issue.title,
              preview:
                issue.description ||
                `Issue in ${issue.repository} - State: ${issue.state}`,
              time: new Date(issue.createdAt),
              link: issue.link,
              icon: Github,
              color: "text-gray-800 dark:text-gray-200",
              status: task?.status || "INBOX",
              isConverted: task?.isConverted || false,
              itemData: issue,
            };
          })
          .filter(Boolean);
        allItems = [...allItems, ...issues];
      } else if (
        githubResult.status === "rejected" &&
        githubResult.reason.response?.status === 404
      ) {
        newConnectedStatus.github = false;
      }

      // Handle Slack response
      if (slackResult.status === "fulfilled" && slackResult.value.success) {
        const slackDataArray = Array.isArray(slackResult.value.data?.data)
          ? slackResult.value.data.data
          : [];

        const messages = slackDataArray
          .map((message) => {
            const task = taskMapById[message.taskId];

            if (task?.status === "ARCHIVED") {
              return null;
            }

            return {
              id: message.taskId || `slack-${message.id}`,
              source: "slack",
              sender: message.sender || "Slack",
              subject: message.channelName
                ? `#${message.channelName}`
                : "Slack",
              preview: message.text || "",
              time: new Date(message.date || Date.now()),
              link: message.link,
              icon: Slack,
              color: "text-[#4A154B]",
              status: task?.status || "INBOX",
              isConverted: task?.isConverted || false,
              itemData: message,
            };
          })
          .filter(Boolean);

        allItems = [...allItems, ...messages];
      } else if (
        slackResult.status === "rejected" &&
        slackResult.reason.response?.status === 404
      ) {
        newConnectedStatus.slack = false;
      }

      // Sort combined array by time (newest first)
      allItems.sort((a, b) => b.time.getTime() - a.time.getTime());

      // Serialize dates to ISO string for rendering
      const serializedItems = allItems.map((item) => ({
        ...item,
        time: item.time.toISOString(),
      }));



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
