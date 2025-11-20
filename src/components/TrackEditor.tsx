import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Track, TrackUnit } from "@/lib/types";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface TrackEditorProps {
  label: string;
  tracks: Track[];
  onChange: (tracks: Track[]) => void;
}

const UNITS: TrackUnit[] = ["fr", "px", "%", "auto", "min-content", "max-content"];

export function TrackEditor({ label, tracks, onChange }: TrackEditorProps) {
  const handleAdd = () => {
    onChange([
      ...tracks,
      { id: Math.random().toString(36).substring(2, 9), value: 1, unit: "fr" },
    ]);
  };

  const handleRemove = (index: number) => {
    const newTracks = [...tracks];
    newTracks.splice(index, 1);
    onChange(newTracks);
  };

  const handleChange = (index: number, field: keyof Track, value: any) => {
    const newTracks = [...tracks];
    newTracks[index] = { ...newTracks[index], [field]: value };
    onChange(newTracks);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </Label>
        <span className="text-[10px] text-slate-400 font-mono">
          {tracks.length} tracks
        </span>
      </div>
      
      <div className="space-y-2">
        {tracks.map((track, index) => (
          <div key={index} className="flex items-center gap-2 group">
            <div className="text-slate-300 dark:text-slate-700 cursor-grab active:cursor-grabbing">
              <GripVertical className="w-3 h-3" />
            </div>
            
            <div className="flex-1 flex items-center gap-1">
              {/* Value Input */}
              {!["auto", "min-content", "max-content"].includes(track.unit) && (
                <Input
                  type="number"
                  value={track.value}
                  onChange={(e) => handleChange(index, "value", parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs font-mono px-2 w-16"
                />
              )}
              
              {/* Unit Select */}
              <Select
                value={track.unit}
                onValueChange={(value) => handleChange(index, "unit", value as TrackUnit)}
              >
                <SelectTrigger className="h-7 text-xs w-[85px] px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u} className="text-xs">
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleRemove(index)}
              disabled={tracks.length <= 1}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-xs border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700"
        onClick={handleAdd}
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Add Track
      </Button>
    </div>
  );
}
