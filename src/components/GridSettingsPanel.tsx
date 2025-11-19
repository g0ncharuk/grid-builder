import type { ReactNode } from "react";
import type { GridSetting } from "@/lib/types";
import { GAP_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumberInput } from "./number-input";
import { 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Settings2
} from "lucide-react";

interface GridSettingsPanelProps {
  settings: GridSetting;
  onSettingChange: (key: keyof GridSetting, value: number) => void;
  onAddItem: () => void;
  onClearItems: () => void;
  onExport: () => void;
  onImport: () => void;
  onApplyTemplate: (name: string) => void;
  templates: { name: string; label: string; intent: string }[];
}

export function GridSettingsPanel({
  settings,
  onSettingChange,
  onAddItem,
  onClearItems,
  onExport,
  onImport,
  onApplyTemplate,
  templates,
}: GridSettingsPanelProps) {
  return (
    <Card 
      className="border-0 shadow-xl shadow-indigo-500/5 ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-200">
          <Settings2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <SettingsField label="Columns">
            <NumberInput
              min={1}
              max={24}
              value={settings.cols}
              onChange={(value) => onSettingChange("cols", Math.max(1, value))}
            />
          </SettingsField>
          <SettingsField label="Rows (min)">
            <NumberInput
              min={1}
              max={24}
              value={settings.rows}
              onChange={(value) => onSettingChange("rows", Math.max(1, value))}
            />
          </SettingsField>
        </div>

        <SettingsField label="Gap Size">
          <Select
            value={String(settings.gap)}
            onValueChange={(value) => onSettingChange("gap", Number(value))}
          >
            <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              <SelectValue placeholder="Gap" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
              {GAP_OPTIONS.map((gap) => (
                <SelectItem key={gap} value={String(gap)} className="dark:text-slate-200 dark:focus:bg-slate-900">
                  <span className="font-medium">{gap}</span>
                  <span className="text-muted-foreground ml-1">units</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>

        <div className="h-px bg-slate-100 dark:bg-slate-800" />

        <div className="space-y-3">
          <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 dark:shadow-none" 
              onClick={onAddItem}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-900/50 hover:text-red-700 dark:hover:text-red-300" 
              onClick={onClearItems}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Templates</Label>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => onApplyTemplate(template.name)}
                className={cn(
                  "flex items-center justify-center rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 border border-transparent",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  template.intent
                )}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800" />

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="secondary" className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200" onClick={onImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</Label>
      {children}
    </div>
  );
}
