import { useMetadata } from "../store/MetadataContext";
import { useProject } from "../store/ProjectContext";

export default function GlobalLoader() {
  const { state: metadataState } = useMetadata();
  const { isProjectLoading, isHistoryLoading } = useProject();

  const isConnecting = metadataState.connectionStatus === "connecting";
  const isSchemasLoading = metadataState.schemasLoading;
  
  // Navigation is loading if any schema's tables are currently loading
  const isNavLoading = metadataState.schemas.some((s) => s.tablesLoading);

  const isAppLoading = isConnecting || isSchemasLoading || isNavLoading || isProjectLoading || isHistoryLoading;

  if (!isAppLoading) return null;

  let loadingMessage = "Loading...";
  if (isConnecting) loadingMessage = "Connecting to Database...";
  else if (isSchemasLoading || isNavLoading) loadingMessage = "Loading Navigation...";
  else if (isHistoryLoading) loadingMessage = "Loading History...";
  else if (isProjectLoading) loadingMessage = "Loading Graph...";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      <div className="flex flex-col items-center bg-slate-800/90 border border-slate-700/50 p-6 rounded-2xl shadow-2xl backdrop-blur-md min-w-[240px]">
        <svg className="w-10 h-10 text-amber-500 animate-spin mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div className="text-white/90 font-medium tracking-wide">{loadingMessage}</div>
      </div>
    </div>
  );
}
