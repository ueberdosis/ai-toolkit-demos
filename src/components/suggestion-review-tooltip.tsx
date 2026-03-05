import {
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type SuggestionReviewTooltipProps = {
  referenceElement: HTMLElement;
  onAccept: () => void;
  onReject: () => void;
  text?: string;
};

export function SuggestionReviewTooltip({
  referenceElement,
  onAccept,
  onReject,
  text,
}: SuggestionReviewTooltipProps) {
  const arrowRef = useRef<HTMLDivElement | null>(null);

  const { refs, floatingStyles, middlewareData, placement } = useFloating({
    open: true,
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(12),
      flip({ padding: 12 }),
      shift({ padding: 12 }),
      arrow({ element: arrowRef }),
    ],
  });

  useEffect(() => {
    refs.setReference(referenceElement);
  }, [referenceElement, refs]);

  const staticSide = {
    top: "bottom",
    right: "left",
    bottom: "top",
    left: "right",
  }[placement.split("-")[0]] as "bottom" | "left" | "top" | "right";

  return createPortal(
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="max-w-72 rounded-[18px] border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-[0_18px_42px_rgba(15,23,42,0.16)]"
    >
      {text && <p className="mb-2 leading-relaxed text-slate-600">{text}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-emerald-300 focus-visible:outline-offset-2"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={onReject}
          className="rounded-md bg-rose-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-rose-300 focus-visible:outline-offset-2"
        >
          Reject
        </button>
      </div>

      <div
        ref={arrowRef}
        className="absolute h-2.5 w-2.5 rotate-45 border-r border-b border-slate-200 bg-white"
        style={{
          left:
            middlewareData.arrow?.x != null
              ? `${middlewareData.arrow.x}px`
              : "",
          top:
            middlewareData.arrow?.y != null
              ? `${middlewareData.arrow.y}px`
              : "",
          [staticSide]: "-5px",
        }}
      />
    </div>,
    document.body,
  );
}
