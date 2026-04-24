import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useReactFlow, type Edge, type Node } from "@xyflow/react";
import type { ProjectData, ProjectSettings, KeyGroup } from "../types";
import { edgesToColumnGroups, columnGroupsToEdges, type ColumnEndpoint } from "../utils/edgeConversion";
import { saveProjectState } from "../api/projects";

interface ProjectContextType {
  keyGroups: KeyGroup[];
  setKeyGroups: React.Dispatch<React.SetStateAction<KeyGroup[]>>;
  settings: ProjectSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProjectSettings>>;
  isKeyGroupManagerOpen: boolean;
  setKeyGroupManagerOpen: (open: boolean) => void;
  exportProject: () => ProjectData;
  loadProject: (data: ProjectData) => void;
  /** Get column groups derived from current edges */
  getColumnGroups: () => ColumnEndpoint[][];
  captureHistory: () => void;
  undoHistory: () => boolean;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  /** Shared selection state — bypasses React Flow's broken internal selection tracking */
  selectedEdgeId: string | null;
  setSelectedEdgeId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedNodeId: string | null;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  isDirty: boolean;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  serverVersion: number | undefined;
  setServerVersion: React.Dispatch<React.SetStateAction<number | undefined>>;
  saveProjectToServer: (connectionKey: string) => Promise<void>;
  isProjectLoading: boolean;
  setIsProjectLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isHistoryLoading: boolean;
  setIsHistoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();

  const [keyGroups, setKeyGroups] = useState<KeyGroup[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>({ version: "1.0.0" });
  const [isKeyGroupManagerOpen, setKeyGroupManagerOpen] = useState(false);
  const [, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [activeTab, setActiveTab] = useState("Graph");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [serverVersion, setServerVersion] = useState<number | undefined>(undefined);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const captureHistory = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    setHistory((h) => {
      if (h.length > 0) {
        const last = h[h.length - 1];
        // Note: Simple reference equality is used here because XYFlow creates new arrays when updating
        if (last.nodes === nodes && last.edges === edges) return h;
      }
      const newHistory = [...h, { nodes, edges }];
      return newHistory.length > 50 ? newHistory.slice(newHistory.length - 50) : newHistory;
    });
  }, [getNodes, getEdges]);

  const undoHistory = useCallback((): boolean => {
    let success = false;
    setHistory((h) => {
      if (h.length === 0) return h;
      const prevState = h[h.length - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      success = true;
      const newHistory = h.slice(0, -1);
      // If we've undone everything, we're back to the saved state
      if (newHistory.length === 0) {
        setIsDirty(false);
      }
      return newHistory;
    });
    return success;
  }, [setNodes, setEdges, setIsDirty]);

  const getColumnGroups = (): ColumnEndpoint[][] => {
    return edgesToColumnGroups(getEdges(), getNodes());
  };

  const exportProject = (): ProjectData => {
    return {
      tables: getNodes(),
      relationships: getColumnGroups(),
      key_groups: keyGroups,
      settings: settings,
    };
  };

  const loadProject = (data: ProjectData) => {
    if (data.tables) setNodes(data.tables);
    
    // Parse new format: arrays of columns -> edges
    if (data.relationships && Array.isArray(data.relationships) && data.relationships.length > 0 && Array.isArray(data.relationships[0])) {
      const restoredEdges = columnGroupsToEdges(data.relationships as any, data.tables || getNodes());
      setEdges(restoredEdges);
    } 
    // Parse legacy format: raw React Flow edges
    else if (data.edges) {
      setEdges(data.edges);
    } else if (data.relationships && data.relationships.length > 0 && typeof data.relationships[0] === 'object' && 'source' in data.relationships[0]) {
      // Fallback if someone manually edited the JSON and passed raw edges inside relationships
      setEdges(data.relationships as any);
    }
    
    if (data.key_groups) setKeyGroups(data.key_groups);
    if (data.settings) setSettings(data.settings);
  };

  const saveProjectToServer = async (connectionKey: string) => {
    // Use statically imported API method
    
    const columnGroups = edgesToColumnGroups(getEdges(), getNodes());
    const newVersion = await saveProjectState(connectionKey, {
      nodes: getNodes(),
      column_groups: columnGroups,
      version: serverVersion,
    });
    
    if (newVersion !== undefined) {
      setServerVersion(newVersion);
      setIsDirty(false);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        keyGroups,
        setKeyGroups,
        settings,
        setSettings,
        isKeyGroupManagerOpen,
        setKeyGroupManagerOpen,
        exportProject,
        loadProject,
        getColumnGroups,
        captureHistory,
        undoHistory,
        activeTab,
        setActiveTab,
        selectedEdgeId,
        setSelectedEdgeId,
        selectedNodeId,
        setSelectedNodeId,
        isDirty,
        setIsDirty,
        serverVersion,
        setServerVersion,
        saveProjectToServer,
        isProjectLoading,
        setIsProjectLoading,
        isHistoryLoading,
        setIsHistoryLoading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return ctx;
}
