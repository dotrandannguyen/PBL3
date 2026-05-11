import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from "react";
import { FileText, CheckSquare } from "lucide-react";
import * as workspaceApi from "../api/workspace.api";
import useAuth from "../../auth/hooks/useAuth";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [pendingRenameId, setPendingRenameId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const creatingDefaultRef = useRef(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await workspaceApi.getWorkspaces();
      const workspaces = res.data;
      if (workspaces && workspaces.length > 0) {
        setPages(workspaces.map(w => ({
          id: w.id,
          icon: <FileText size={14} />,
          label: w.name,
          type: "private"
        })));
        setActivePage(prev => {
          if (!prev || !workspaces.find(w => w.id === prev)) return workspaces[0].id;
          return prev;
        });
      } else {
        // Create default workspace if none — guard against StrictMode double-run
        if (creatingDefaultRef.current) return;
        creatingDefaultRef.current = true;
        try {
          const res2 = await workspaceApi.createWorkspace({ name: "Mặc định" });
          const defaultWorkspace = res2.data;
          const newPage = {
            id: defaultWorkspace.id,
            icon: <CheckSquare size={14} />,
            label: defaultWorkspace.name,
            type: "private"
          };
          setPages([newPage]);
          setActivePage(newPage.id);
        } finally {
          creatingDefaultRef.current = false;
        }
      }
    } catch (e) {
      console.error("Failed to load workspaces", e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWorkspaces();
  }, [isAuthenticated]);

  // Step 1: user clicks "+" → show inline input
  const handleAddNewList = () => {
    setIsCreatingWorkspace(true);
  };

  // Step 2: user types name + Enter → actually create workspace
  const createWorkspaceWithName = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setIsCreatingWorkspace(false);
      return;
    }
    try {
      const res = await workspaceApi.createWorkspace({ name: trimmed });
      const newWorkspace = res.data;
      const newPage = {
        id: newWorkspace.id,
        icon: <FileText size={14} />,
        label: newWorkspace.name,
        type: "private",
      };
      setPages((prev) => [...prev, newPage]);
      setActivePage(newPage.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const cancelCreate = useCallback(() => {
    setIsCreatingWorkspace(false);
  }, []);

  const clearPendingRename = useCallback(() => {
    setPendingRenameId(null);
  }, []);

  const handleDeletePage = async (id) => {
    try {
      await workspaceApi.deleteWorkspace(id);
      setPages((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (activePage === id && next.length > 0) setActivePage(next[0].id);
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenamePage = async (id, newLabel) => {
    try {
      await workspaceApi.updateWorkspace(id, { name: newLabel });
      setPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, label: newLabel } : p)),
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        pages,
        activePage,
        setActivePage,
        handleAddNewList,
        handleDeletePage,
        handleRenamePage,
        pendingRenameId,
        clearPendingRename,
        loading,
        isCreatingWorkspace,
        createWorkspaceWithName,
        cancelCreate,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

