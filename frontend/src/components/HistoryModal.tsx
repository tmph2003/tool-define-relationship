import { useEffect, useState } from "react";
import { fetchProjectHistory, deleteProjectHistory, type ProjectHistoryItem } from "../api/projects";
import { useProject } from "../store/ProjectContext";
import { useMetadata } from "../store/MetadataContext";
import { useToast } from "../contexts/ToastContext";

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HistoryModal({ open, onClose }: HistoryModalProps) {
  const [history, setHistory] = useState<ProjectHistoryItem[]>([]);
  const { state: metadataState } = useMetadata();
  const { loadProject, setIsDirty, serverVersion, isHistoryLoading, setIsHistoryLoading } = useProject();
  const { toast } = useToast();

  useEffect(() => {
    if (open && metadataState.connectionStatus === "connected" && metadataState.connectedUser) {
      const storageKey = `rd_graph_user_${metadataState.connectedUser}`;
      setIsHistoryLoading(true);
      fetchProjectHistory(storageKey)
        .then((data) => setHistory(data))
        .catch(() => toast({ type: "error", message: "Failed to load history" }))
        .finally(() => setIsHistoryLoading(false));
    }
  }, [open, metadataState, toast]);

  if (!open) return null;

  const handleDelete = async (id: number) => {
    const success = await deleteProjectHistory(id);
    if (success) {
      setHistory(history.filter(h => h.id !== id));
      toast({ type: "success", message: "Snapshot deleted" });
    } else {
      toast({ type: "error", message: "Failed to delete snapshot" });
    }
  };

  const handleRestore = async (item: ProjectHistoryItem) => {
    // Removed native confirm() because it can be blocked by browsers
    const restoredNodes = item.data.nodes || [];
    const restoredGroups = item.column_groups as any;

    loadProject({
      tables: restoredNodes,
      relationships: restoredGroups,
    } as any);
    
    // Check if the restored version is different from the current active version
    const isDifferentVersion = item.version !== serverVersion;
    
    // Set dirty state after React Flow finishes rendering the new nodes/edges
    setTimeout(() => setIsDirty(isDifferentVersion), 250);
    
    if (isDifferentVersion) {
      toast({ type: "success", message: `Loaded version ${item.version}. Don't forget to save your changes!` });
    } else {
      toast({ type: "info", message: `Loaded version ${item.version} (Already latest)` });
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="w-[600px] rounded-md shadow-2xl flex flex-col overflow-hidden"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-mid)",
          maxHeight: "80vh"
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <h2 className="text-sm font-semibold font-space text-[var(--color-text-1)]">Project History Snapshots</h2>
          <button onClick={onClose} className="text-[var(--color-text-3)] hover:text-white">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isHistoryLoading ? (
            <div className="text-center text-xs text-[var(--color-text-3)] py-10">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center text-xs text-[var(--color-text-3)] py-10">No history available for this project.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border-mid)] text-[var(--color-text-3)] font-space">
                  <th className="pb-2 font-medium">Version</th>
                  <th className="pb-2 font-medium">Saved At</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-white/5 transition-colors">
                    <td className="py-3 font-mono text-[var(--color-amber)]">v{item.version}</td>
                    <td className="py-3 text-[var(--color-text-2)]">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="py-3 text-right">
                      <button 
                        onClick={() => handleRestore(item)}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-sm mr-2 transition-colors"
                      >
                        Restore
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-sm transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
