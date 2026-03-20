import { useState, useCallback, useEffect } from "react";
import { integrationAPI } from "../api/integration.api";
import { CloudRain, Github, Mail } from "lucide-react"; // Common icons
import useAuth from "../../auth/hooks/useAuth";

export const useIntegrations = () => {
  const { user, accessToken } = useAuth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState({
    gmail: true, // Assume true until we get a 404/400
    github: true,
  });

  const fetchIntegrations = useCallback(async () => {
    if (!accessToken || !user) return; // Prevent fetch if not logged in

    setLoading(true);
    let allItems = [];
    const newConnectedStatus = { gmail: true, github: true };

    try {
      // Fetch concurrently
      const [gmailResult, githubResult] = await Promise.allSettled([
        integrationAPI.getGmailPreview(),
        integrationAPI.getGithubPreview(),
      ]);

      // Handle Gmail response
      if (gmailResult.status === "fulfilled" && gmailResult.value.success) {
        // Backend returns: { success: true, data: { message, total, data: [...] } }
        const gmailDataArray = Array.isArray(gmailResult.value.data?.data)
          ? gmailResult.value.data.data
          : [];

        const mails = gmailDataArray.map((mail) => ({
          id: `gmail-${mail.id}`,
          source: "gmail",
          sender: mail.from,
          subject: mail.subject,
          preview: mail.snippet,
          time: new Date(mail.date), // Requires standard date representation
          link: mail.link,
          icon: Mail,
          color: "text-red-500",
          itemData: mail,
        }));
        allItems = [...allItems, ...mails];
      } else if (
        gmailResult.status === "rejected" &&
        gmailResult.reason.response?.status === 404
      ) {
        newConnectedStatus.gmail = false;
      }

      // Handle Github response
      if (githubResult.status === "fulfilled" && githubResult.value.success) {
        // Backend returns: { success: true, data: { message, total, data: [...] } }
        const githubDataArray = Array.isArray(githubResult.value.data?.data)
          ? githubResult.value.data.data
          : [];

        const issues = githubDataArray.map((issue) => ({
          id: `github-${issue.id}`,
          source: "github",
          sender: issue.creator || issue.repository,
          subject: issue.title,
          preview: `Issue in ${issue.repository} - State: ${issue.state}`,
          time: new Date(issue.createdAt),
          link: issue.link,
          icon: Github,
          color: "text-gray-800 dark:text-gray-200",
          itemData: issue,
        }));
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

      setData(serializedItems);
      setConnected(newConnectedStatus);
      setError(null);
    } catch (err) {
      setError(err.message || "Something went wrong fetching integrations.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, user]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  return { data, loading, error, connected, refetch: fetchIntegrations };
};
