const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export interface ColumnGroupMember {
  table: string;
  column: string;
}

export interface ProjectState {
  nodes: any[];
  column_groups: ColumnGroupMember[][];
}

/** Response from GET /projects/:key */
interface ProjectApiResponse {
  id: number;
  connection_key: string;
  data: { nodes?: any[] };
  column_groups: ColumnGroupMember[][];
  created_at: string;
  updated_at: string;
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
    };
  } catch (err) {
    console.error("Error fetching project state:", err);
    return null;
  }
}

export async function saveProjectState(connectionKey: string, state: ProjectState): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connection_key: connectionKey,
        data: { nodes: state.nodes },
        column_groups: state.column_groups,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save project state: ${response.statusText}`);
    }
  } catch (err) {
    console.error("Error saving project state:", err);
  }
}
