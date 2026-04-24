const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(/\/$/, "");

export interface ColumnGroupMember {
  catalog?: string;
  schema?: string;
  table: string;
  column: string;
}

export interface ProjectState {
  nodes: any[];
  column_groups: ColumnGroupMember[][];
  version?: number;
}

/** Response from GET /projects/:key */
export interface ProjectHistoryItem {
  id: number;
  project_id: number;
  version: number;
  data: { nodes?: any[] };
  column_groups: ColumnGroupMember[][];
  created_at: string;
}

interface ProjectApiResponse {
  id: number;
  connection_key: string;
  data: { nodes?: any[] };
  column_groups: ColumnGroupMember[][];
  created_at: string;
  updated_at: string;
  version: number;
}

export async function fetchProjectState(connectionKey: string): Promise<ProjectState | null> {
  try {
    const response = await fetch(`${BASE_URL}/projects/${encodeURIComponent(connectionKey)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch project state: ${response.statusText}`);
    }
    const resp: ProjectApiResponse = await response.json();
    return {
      nodes: resp.data?.nodes || [],
      column_groups: resp.column_groups || [],
      version: resp.version,
    };
  } catch (err) {
    console.error("Error fetching project state:", err);
    return null;
  }
}

export async function saveProjectState(connectionKey: string, state: ProjectState): Promise<number | undefined> {
  const response = await fetch(`${BASE_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connection_key: connectionKey,
      data: { nodes: state.nodes },
      column_groups: state.column_groups,
      version: state.version,
    }),
  });

  if (!response.ok) {
    if (response.status === 409) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Project was modified by another user. Please refresh.");
    }
    throw new Error(`Failed to save project state: ${response.statusText}`);
  }
  
  const resp: ProjectApiResponse = await response.json();
  return resp.version;
}

export async function fetchProjectHistory(connectionKey: string): Promise<ProjectHistoryItem[]> {
  try {
    const response = await fetch(`${BASE_URL}/projects/${connectionKey}/history`);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to fetch project history: ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    console.error("Error fetching project history:", err);
    return [];
  }
}

export async function deleteProjectHistory(historyId: number): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/projects/history/${historyId}`, {
      method: "DELETE",
    });
    return response.ok;
  } catch (err) {
    console.error("Error deleting project history:", err);
    return false;
  }
}
