import type { Suggestion } from "@tiptap-pro/extension-tracked-changes";

type JsonNode = {
  type?: string;
  text?: string;
  attrs?: {
    alt?: string;
  };
  content?: JsonNode[];
};

function getTextFromNodeJson(node: JsonNode): string {
  if (node.type === "text") {
    return node.text || "";
  }

  if (!node.content || node.content.length === 0) {
    return node.attrs?.alt || "";
  }

  return node.content.map(getTextFromNodeJson).join("");
}

function buildNodesPreview(nodes?: JsonNode[]): string {
  if (!nodes || nodes.length === 0) {
    return "";
  }

  return nodes
    .map((node) => {
      const text = getTextFromNodeJson(node);
      return text ? `"${text}"` : "";
    })
    .filter(Boolean)
    .join(" + ");
}

export function getSuggestionNodeLabels(suggestion: Suggestion) {
  const deletedNodes = (suggestion.deletedNodes ?? []) as JsonNode[];
  const insertedNodes = (suggestion.insertedNodes ?? []) as JsonNode[];
  const types = [...deletedNodes, ...insertedNodes]
    .map((node) => node.type)
    .filter((type): type is string => Boolean(type));

  return [...new Set(types)];
}

export function getSuggestionPreview(suggestion: Suggestion) {
  const prefix =
    suggestion.type === "add"
      ? "+"
      : suggestion.type === "delete"
        ? "-"
        : suggestion.type === "markChange"
          ? "◊"
          : suggestion.type === "sink"
            ? "⇥"
            : suggestion.type === "lift"
              ? "⇤"
              : "~";

  if (
    suggestion.type === "markChange" &&
    Array.isArray(suggestion.markChanges) &&
    suggestion.markChanges.length > 0
  ) {
    const markChangesText = suggestion.markChanges
      .map(
        (markChange) =>
          `${markChange.operation === "added" ? "+" : "-"}${markChange.markName}`,
      )
      .join(", ");

    return `${prefix} ${markChangesText} on "${suggestion.text}"`;
  }

  if (suggestion.type === "sink") {
    return `${prefix} indent "${suggestion.text}"`;
  }

  if (suggestion.type === "lift") {
    return `${prefix} outdent "${suggestion.text}"`;
  }

  const insertedPreview = buildNodesPreview(
    suggestion.insertedNodes as JsonNode[] | undefined,
  );
  const deletedPreview = buildNodesPreview(
    suggestion.deletedNodes as JsonNode[] | undefined,
  );

  if (suggestion.type === "replace") {
    const displayText = insertedPreview || suggestion.text;
    const wasText = deletedPreview || suggestion.replacedText;
    const replacementText = wasText ? ` (was: ${wasText})` : "";
    return `${prefix} ${displayText}${replacementText}`;
  }

  if (suggestion.type === "add") {
    return `${prefix} ${insertedPreview || `"${suggestion.text}"`}`;
  }

  if (suggestion.type === "delete") {
    return `${prefix} ${deletedPreview || `"${suggestion.text}"`}`;
  }

  return `${prefix} "${suggestion.text}"`;
}

export function getUniqueSuggestions(suggestions: Suggestion[]) {
  return Array.from(
    new Map(
      suggestions.map((suggestion) => [suggestion.id, suggestion]),
    ).values(),
  );
}
