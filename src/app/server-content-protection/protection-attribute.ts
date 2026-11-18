import { Extension } from "@tiptap/core";

/**
 * Adds a `protection` attribute to paragraphs. The content protection policy selects
 * paragraphs by this attribute, and the demo styles them by it.
 */
export const ProtectionAttribute = Extension.create({
  name: "protectionAttribute",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          protection: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-protection"),
            renderHTML: (attributes) =>
              attributes.protection
                ? { "data-protection": attributes.protection }
                : {},
          },
        },
      },
    ];
  },
});
