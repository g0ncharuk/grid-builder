import { useEffect } from "react";

interface ShortcutHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
}: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isCmdOrCtrl = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      // Undo: Cmd+Z
      if (isCmdOrCtrl && !isShift && event.key.toLowerCase() === "z") {
        event.preventDefault();
        onUndo?.();
      }

      // Redo: Cmd+Shift+Z or Cmd+Y
      if (
        (isCmdOrCtrl && isShift && event.key.toLowerCase() === "z") ||
        (isCmdOrCtrl && event.key.toLowerCase() === "y")
      ) {
        event.preventDefault();
        onRedo?.();
      }

      // Delete: Backspace or Delete
      if (event.key === "Backspace" || event.key === "Delete") {
        // Only delete if we have a selection mechanism (which we don't yet globally)
        // But maybe we can trigger it if hovering?
        // For now, let's NOT implement global delete without selection, as it might be dangerous.
        // Or maybe we can pass a "hoveredItemId" if we track it?
        // Let's leave it for now or implement it if we have a way to know what to delete.
        // onDelete?.();
      }

      // Duplicate: Cmd+D
      if (isCmdOrCtrl && event.key.toLowerCase() === "d") {
        event.preventDefault();
        // Same issue: what to duplicate?
        // onDuplicate?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUndo, onRedo, onDelete, onDuplicate]);
}
