import { useCallback, useMemo, useRef } from "react";
import { BreakpointTabs } from "@/components/breakpoint-tabs";
import { GridSettingsPanel } from "@/components/GridSettingsPanel";
import { ItemsPanel } from "@/components/ItemsPanel";
import { PreviewCanvas } from "@/components/PreviewCanvas";
import { Toast } from "@/components/Toast";
import { BREAKPOINTS, BREAKPOINT_ORDER } from "@/lib/constants";
import { generateTailwindCode } from "@/lib/grid";
import { useGridState } from "@/hooks/useGridState";

type TemplateButton = { name: string; label: string; intent: string };

const templateButtons: TemplateButton[] = [
  {
    name: "hero",
    label: "Hero Section",
    intent: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  {
    name: "sidebar",
    label: "Sidebar Layout",
    intent: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  },
  {
    name: "cards",
    label: "Cards Grid",
    intent: "bg-green-100 text-green-800 hover:bg-green-200",
  },
  {
    name: "masonry",
    label: "Masonry",
    intent: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  },
];

import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { LayoutGrid, Github } from "lucide-react"; // Assuming these icons are available

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// ... imports ...

function App() {
  const {
    items,
    gridSettings,
    currentBreakpoint,
    setCurrentBreakpoint,
    selectedItemId,
    setSelectedItemId,
    showGrid,
    setShowGrid,
    dragMode,
    setDragMode,
    toast,
    showNotification,
    mutateLayout,
    updateItemLayout,
    addItem,
    clearItems,
    removeItem,
    duplicateItem,
    updateGridSetting,
    handleCopyFromBreakpoint,
    applyTemplate,
    importPreset,
    undo,
    redo,
  } = useGridState();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onDelete: () => {
      if (selectedItemId !== null) {
        removeItem(selectedItemId);
        setSelectedItemId(null);
        showNotification("Item deleted");
      }
    },
    onDuplicate: () => {
      if (selectedItemId !== null) {
        duplicateItem(selectedItemId);
      }
    },
  });

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify({ items, settings: gridSettings }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grid-config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Configuration exported successfully");
  }, [items, gridSettings, showNotification]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          importPreset(content);
        } catch (error) {
          console.error("Import failed:", error);
          showNotification("Failed to import configuration");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [importPreset, showNotification]
  );

  const generatedCode = useMemo(
    () => generateTailwindCode(items, gridSettings),
    [items, gridSettings]
  );

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(generatedCode);
    showNotification("Tailwind code copied to clipboard");
  }, [generatedCode, showNotification]);

  const currentSettings = gridSettings[currentBreakpoint];
  const currentIndex = BREAKPOINT_ORDER.indexOf(currentBreakpoint);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div 
        className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300"
        onClick={() => setSelectedItemId(null)}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="application/json"
          onChange={handleImport}
        />
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                  Grid Generator
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Tailwind CSS Layout Builder
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <BreakpointTabs
                current={currentBreakpoint}
                items={BREAKPOINTS}
                onSelect={(bp) => setCurrentBreakpoint(bp)}
              />
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <a
                href="https://github.com/yourusername/grid-react"
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <ModeToggle />
            </div>
          </div>
        </header>
        
        <main className="mt-6 mx-auto grid w-full max-w-[1600px] gap-6 px-6 pb-12 2xl:grid-cols-[360px_minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-6">
            <GridSettingsPanel
              settings={currentSettings}
              onSettingChange={updateGridSetting}
              onAddItem={addItem}
              onClearItems={clearItems}
              onExport={handleExport}
              onImport={handleImportClick}
              onApplyTemplate={applyTemplate}
              templates={templateButtons}
            />
          </div>

          <PreviewCanvas
            items={items}
            breakpoint={currentBreakpoint}
            settings={currentSettings}
            showGrid={showGrid}
            dragMode={dragMode}
            onToggleShowGrid={setShowGrid}
            onToggleDragMode={setDragMode}
            mutateLayout={mutateLayout}
            code={generatedCode}
            onCopyCode={handleCopyCode}
            selectedItemId={selectedItemId}
            onSelect={setSelectedItemId}
          />
          
          <ItemsPanel
            items={items}
            breakpoint={currentBreakpoint}
            nextBreakpoint={
              BREAKPOINT_ORDER[
                Math.min(currentIndex + 1, BREAKPOINT_ORDER.length - 1)
              ]
            }
            prevBreakpoint={BREAKPOINT_ORDER[Math.max(currentIndex - 1, 0)]}
            onUpdate={updateItemLayout}
            onDuplicate={duplicateItem}
            onRemove={removeItem}
            onCopyFrom={handleCopyFromBreakpoint}
            canCopyPrev={currentIndex > 0}
            canCopyNext={currentIndex < BREAKPOINT_ORDER.length - 1}
            selectedItemId={selectedItemId}
            onSelect={setSelectedItemId}
          />
        </main>
        <Toast message={toast} />
      </div>
    </ThemeProvider>
  );
}

export default App;

