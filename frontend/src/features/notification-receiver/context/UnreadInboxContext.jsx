import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import socketService from "../../../shared/api/socket.service";
import { getInboxTasks } from "../../tasks/api/task.api";
import useAuth from "../../auth/hooks/useAuth";

const UnreadInboxContext = createContext({ count: 0, reset: () => {} });

const extractInboxTasks = (response) => {
  if (Array.isArray(response?.data?.data?.data)) return response.data.data.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

/**
 * UnreadInboxProvider — tracks the number of inbox items the user hasn't
 * converted into tasks yet. Increments on socket NEW_INBOX_ITEM. Auto-resets
 * when the user navigates to /mail (the Inbox page).
 *
 * Uses a dedicated socket listener that does NOT clash with the
 * mail-receiver-page useInboxSocket consumer.
 */
export function UnreadInboxProvider({ children }) {
  const { user, accessToken } = useAuth();
  const [count, setCount] = useState(0);
  const location = useLocation();
  const initialFetchedRef = useRef(false);

  // Fetch the initial unread count once we have an auth token
  useEffect(() => {
    if (!accessToken || !user || initialFetchedRef.current) return;
    initialFetchedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const response = await getInboxTasks({ limit: 100 });
        const tasks = extractInboxTasks(response);
        const unread = tasks.filter((task) => !task.isConverted).length;
        if (!cancelled) setCount(unread);
      } catch (err) {
        // Silent — badge just stays at 0
        console.warn("[UnreadInbox] initial fetch failed", err?.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, user]);

  // Subscribe to NEW_INBOX_ITEM via raw socket (separate listener so it
  // coexists with the mail page's useInboxSocket consumer).
  useEffect(() => {
    if (!user) return;
    const socket = socketService.getSocket();
    const handler = () => setCount((prev) => prev + 1);
    socket.on("NEW_INBOX_ITEM", handler);
    return () => {
      socket.off("NEW_INBOX_ITEM", handler);
    };
  }, [user]);

  // Auto-reset when user navigates to the inbox page.
  // Tracked via ref so we only reset on path-transition, not on count change.
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = location.pathname;
    if (location.pathname === "/mail" && prev !== "/mail") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(0);
    }
  }, [location.pathname]);

  const reset = useCallback(() => setCount(0), []);

  return (
    <UnreadInboxContext.Provider value={{ count, reset }}>
      {children}
    </UnreadInboxContext.Provider>
  );
}

export function useUnreadInbox() {
  return useContext(UnreadInboxContext);
}
