import { useCallback, useReducer } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

type HistoryAction<T> =
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SET"; newPresent: T }
  | { type: "RESET"; newPresent: T };

const historyReducer = <T>(
  state: HistoryState<T>,
  action: HistoryAction<T>
): HistoryState<T> => {
  const { past, present, future } = state;

  switch (action.type) {
    case "UNDO": {
      if (past.length === 0) return state;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    }
    case "REDO": {
      if (future.length === 0) return state;
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    }
    case "SET": {
      if (action.newPresent === present) return state;
      return {
        past: [...past, present],
        present: action.newPresent,
        future: [],
      };
    }
    case "RESET": {
      return {
        past: [],
        present: action.newPresent,
        future: [],
      };
    }
    default:
      return state;
  }
};

export function useHistory<T>(initialPresent: T) {
  const [state, dispatch] = useReducer(historyReducer<T>, {
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const set = useCallback(
    (newPresent: T) => dispatch({ type: "SET", newPresent }),
    []
  );
  const reset = useCallback(
    (newPresent: T) => dispatch({ type: "RESET", newPresent }),
    []
  );

  return {
    state: state.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    history: state,
  };
}
