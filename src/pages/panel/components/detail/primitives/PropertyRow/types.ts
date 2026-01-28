/**
 * Types for PropertyRow component and its sub-components
 */

export interface PropertyRowProps {
  label: string;
  value: unknown;
  searchQuery?: string;
  depth?: number;
  isNested?: boolean;
  /** Whether this property is pinned */
  isPinned?: boolean;
  /** Callback to toggle pin state (only provided for pinnable properties) */
  onTogglePin?: () => void;
  /** Whether to show the pin button (only for first-level properties) */
  showPinButton?: boolean;
}

export interface PropertyRowState {
  isExpanded: boolean;
  copied: boolean;
  useJsonView: boolean;
  visibleChunks: Set<number>;
}

export interface PropertyValueProps {
  value: unknown;
  searchQuery?: string;
  displayValue: string;
  valueColorStyle: { color?: string; className: string };
}

export interface PropertyActionsProps {
  /** Whether this property is pinned */
  isPinned: boolean;
  /** Whether to show the pin button */
  showPinButton: boolean;
  /** Whether copy button should show copied state */
  copied: boolean;
  /** Callback to toggle pin state */
  onTogglePin?: () => void;
  /** Callback to copy value */
  onCopy: () => void;
  /** Whether to show JSON view toggle (for arrays) */
  showJsonViewToggle?: boolean;
  /** Whether JSON view is active */
  useJsonView?: boolean;
  /** Callback to toggle JSON view */
  onToggleJsonView?: () => void;
}
