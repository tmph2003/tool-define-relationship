import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { MetadataState, TrinoConnectionRequest, TrinoConnectionResponse } from "../types";
import { connectTrino, disconnectTrino, fetchTables, fetchColumns, checkHealth } from "../services";

const initial: MetadataState = {
  connectionStatus: "idle",
  connectionError: null,
  catalog: null,
  connectedHost: null,
  primarySchema: null,
  schemas: [],
  schemasLoading: false,
  schemasError: null,
};

type MetadataContextType = {
  state: MetadataState;
  connect: (params: TrinoConnectionRequest) => Promise<TrinoConnectionResponse>;
  disconnect: () => void;
  toggleSchema: (schemaName: string) => Promise<void>;
  toggleTable: (schemaName: string, tableName: string) => Promise<void>;
  addSchema: (schemaName: string) => Promise<void>;
};

const MetadataContext = createContext<MetadataContextType | null>(null);

export function MetadataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MetadataState>(initial);

  // Auto-restore connection on load
  useEffect(() => {
    checkHealth()
      .then((res) => {
        if (res.trino_reachable) {
          const schemaName = (res as any).schema_name;
          setState((s) => ({
            ...s,
            connectionStatus: "connected",
            schemasLoading: schemaName ? true : false,
            connectedHost: res.host || s.connectedHost,
            catalog: res.catalog || s.catalog,
            primarySchema: schemaName || s.primarySchema,
          }));

          if (schemaName) {
            fetchTables(schemaName)
              .then((tablesRes) => {
                setState((s) => ({
                  ...s,
                  schemas: [{
                    schema_name: tablesRes.schema_name,
                    tables: tablesRes.tables.map(t => ({
                      table_name: t.table_name,
                      table_type: t.table_type,
                      columns: null,
                      columnsLoading: false,
                      columnsError: null
                    })),
                    tablesLoading: false,
                    tablesError: null,
                    expanded: true
                  }],
                  schemasLoading: false
                }));
              })
              .catch((err) => {
                console.error("Auto-load schema failed", err);
                setState((s) => ({ ...s, schemasLoading: false }));
              });
          }
        }
      })
      .catch(() => {
        // Ignore health check failures on startup
      });
  }, []);

  // ── Connect + auto-load schemas ──────────────────────────────────────
  const connect = useCallback(async (params: TrinoConnectionRequest) => {
    setState((s) => ({ ...s, connectionStatus: "connecting", connectionError: null }));

    try {
      const res = await connectTrino(params);
      if (!res.connected) throw new Error(res.message);

      setState((s) => ({
        ...s,
        connectionStatus: "connected",
        catalog: res.catalog,
        connectedHost: res.host,
        primarySchema: res.schema_name || null,
        schemasLoading: false,
        schemasError: null,
        // Start with an empty list of schemas. The user must add them manually.
        schemas: [],
      }));

      // Automatically add and load the schema if provided
      if (res.schema_name) {
        setTimeout(() => addSchema(res.schema_name as string), 100);
      }

      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setState((s) => ({
        ...s,
        connectionStatus: "error",
        connectionError: msg,
        schemasLoading: false,
      }));
      throw err; // Re-throw so callers can catch it (like TrinoConnectForm)
    }
  }, []);

  // ── Disconnect ───────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    setState(initial);
    try {
      await disconnectTrino();
    } catch (err) {
      console.error("Failed to disconnect from backend", err);
    }
  }, []);

  // ── Toggle schema (lazy-load tables) ────────────────────────────────
  const toggleSchema = useCallback(async (schemaName: string) => {
    // Find the schema in the current state to decide what to do
    // Note: We use a functional update for state, but we trigger the fetch based on the CURRENT closure state.
    // This works perfectly for user clicks because the state is stable.
    setState((s) => {
      const sc = s.schemas.find((x) => x.schema_name === schemaName);
      if (!sc) return s;
      const shouldLoad = !sc.expanded && sc.tables === null && !sc.tablesLoading;
      return {
        ...s,
        schemas: s.schemas.map((x) =>
          x.schema_name !== schemaName ? x : {
            ...x,
            expanded: !x.expanded,
            tablesLoading: shouldLoad ? true : x.tablesLoading,
          }
        ),
      };
    });

    // We also need to read from the CURRENT closure state to decide if we should fetch.
    // The functional updater above handles the React state, but we need to trigger the side effect here.
    const sc = state.schemas.find((x) => x.schema_name === schemaName);
    if (!sc) return; // Not found in state (e.g., if called too early)
    
    const shouldLoad = !sc.expanded && sc.tables === null && !sc.tablesLoading;
    if (!shouldLoad) return;

    try {
      const res = await fetchTables(schemaName);
      setState((s) => ({
        ...s,
        schemas: s.schemas.map((x) =>
          x.schema_name !== schemaName ? x : {
            ...x,
            tablesLoading: false,
            tables: res.tables.map((t) => ({
              table_name: t.table_name,
              table_type: t.table_type,
              columns: null,
              columnsLoading: false,
              columnsError: null,
            })),
          }
        ),
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        schemas: s.schemas.map((x) =>
          x.schema_name !== schemaName ? x : {
            ...x,
            tablesLoading: false,
            tablesError: err instanceof Error ? err.message : "Failed to load tables",
          }
        ),
      }));
    }
  }, [state.schemas]);

  // ── Toggle table columns (lazy-load) ─────────────────────────────────
  const toggleTable = useCallback(async (schemaName: string, tableName: string) => {
    setState((s) => {
      const sc = s.schemas.find((x) => x.schema_name === schemaName);
      const tbl = sc?.tables?.find((t) => t.table_name === tableName);
      if (!tbl) return s;
      const shouldLoad = tbl.columns === null && !tbl.columnsLoading;
      if (!shouldLoad) return s;
      return {
        ...s,
        schemas: s.schemas.map((sc2) =>
          sc2.schema_name !== schemaName ? sc2 : {
            ...sc2,
            tables: sc2.tables?.map((t) =>
              t.table_name !== tableName ? t : { ...t, columnsLoading: true }
            ) ?? null,
          }
        ),
      };
    });

    const sc = state.schemas.find((x) => x.schema_name === schemaName);
    const tbl = sc?.tables?.find((t) => t.table_name === tableName);
    if (!tbl) return;
    
    const shouldLoad = tbl.columns === null && !tbl.columnsLoading;
    if (!shouldLoad) return;

    try {
      const res = await fetchColumns(schemaName, tableName);
      setState((s) => ({
        ...s,
        schemas: s.schemas.map((x) =>
          x.schema_name !== schemaName ? x : {
            ...x,
            tables: x.tables?.map((t) =>
              t.table_name !== tableName ? t : {
                ...t,
                columnsLoading: false,
                columns: res.columns,
              }
            ) ?? null,
          }
        ),
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        schemas: s.schemas.map((x) =>
          x.schema_name !== schemaName ? x : {
            ...x,
            tables: x.tables?.map((t) =>
              t.table_name !== tableName ? t : {
                ...t,
                columnsLoading: false,
                columnsError: err instanceof Error ? err.message : "Failed to load columns",
              }
            ) ?? null,
          }
        ),
      }));
    }
  }, [state.schemas]);

  // ── Add schema manually ──────────────────────────────────────────────
  const addSchema = useCallback(async (schemaName: string) => {
    const cleanName = schemaName.trim().toLowerCase();
    if (!cleanName) return;

    let alreadyExists = false;
    let wasExpanded = false;

    setState((s) => {
      const existing = s.schemas.find((sc) => sc.schema_name === cleanName);
      if (existing) {
        alreadyExists = true;
        wasExpanded = existing.expanded;
        return s;
      }

      return {
        ...s,
        schemas: [
          ...s.schemas,
          {
            schema_name: cleanName,
            tables: null,
            tablesLoading: true, // We are going to fetch it immediately
            tablesError: null,
            expanded: true,      // We are going to expand it immediately
          },
        ].sort((a, b) => a.schema_name.localeCompare(b.schema_name)),
      };
    });

    // If it already existed in the state, just use toggleSchema to expand/fetch if needed.
    if (alreadyExists) {
      if (!wasExpanded) {
        await toggleSchema(cleanName);
      }
      return;
    }

    // Otherwise, we just added it and set tablesLoading: true.
    // Fetch the tables right away!
    try {
      const res = await fetchTables(cleanName);
      setState((s) => ({
        ...s,
        schemas: s.schemas.map((x) =>
          x.schema_name !== cleanName ? x : {
            ...x,
            tablesLoading: false,
            tables: res.tables.map((t) => ({
              table_name: t.table_name,
              table_type: t.table_type,
              columns: null,
              columnsLoading: false,
              columnsError: null,
            })),
          }
        ),
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        schemas: s.schemas.map((x) =>
          x.schema_name !== cleanName ? x : {
            ...x,
            tablesLoading: false,
            tablesError: err instanceof Error ? err.message : "Failed to load tables",
          }
        ),
      }));
    }
  }, [toggleSchema]);

  return (
    <MetadataContext.Provider value={{ state, connect, disconnect, toggleSchema, toggleTable, addSchema }}>
      {children}
    </MetadataContext.Provider>
  );
}

export function useMetadata() {
  const ctx = useContext(MetadataContext);
  if (!ctx) {
    throw new Error("useMetadata must be used within a MetadataProvider");
  }
  return ctx;
}
