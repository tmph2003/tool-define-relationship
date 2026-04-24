import TopNavbar from "./layouts/TopNavbar";
import LeftSidebar from "./layouts/LeftSidebar";
import CenterCanvas from "./layouts/CenterCanvas";
import RightPropertiesPanel from "./layouts/RightPropertiesPanel";
import { ProjectProvider } from "./store/ProjectContext";
import { MetadataProvider } from "./store/MetadataContext";
import { ReactFlowProvider } from "@xyflow/react";
import KeyGroupManager from "./components/KeyGroupManager";
import { ToastProvider } from "./contexts/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    // Force dark mode at root — Obsidian Cartographer design
    <div className="dark" style={{ height: "100vh", overflow: "hidden" }}>
      <ErrorBoundary>
        <ToastProvider>
          <ReactFlowProvider>
            <MetadataProvider>
              <ProjectProvider>
                <TopNavbar />
                <LeftSidebar />
                <CenterCanvas />
                <RightPropertiesPanel />
                <KeyGroupManager />
              </ProjectProvider>
            </MetadataProvider>
          </ReactFlowProvider>
        </ToastProvider>
      </ErrorBoundary>
    </div>
  );
}
