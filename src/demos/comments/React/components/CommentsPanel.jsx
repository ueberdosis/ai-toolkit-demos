import { SegmentedControl } from "../../../../components/segmented-control";
import { ThreadsList } from "./ThreadsList.jsx";

const VIEW_OPTIONS = [
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
];

export const CommentsPanel = ({
  provider,
  threads,
  showUnresolved,
  onShowUnresolvedChange,
}) => (
  <div className="flex h-full flex-col overflow-hidden">
    <div className="space-y-4 border-b border-slate-200 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-950">Comments</h2>
        <p className="mt-1 text-xs text-slate-500">
          Select text in the document to start a new thread.
        </p>
      </div>

      <SegmentedControl
        options={VIEW_OPTIONS}
        value={showUnresolved ? "open" : "resolved"}
        onChange={(value) => onShowUnresolvedChange(value === "open")}
      />
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <ThreadsList provider={provider} threads={threads} />
    </div>
  </div>
);
