import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { gateway, wrapLanguageModel } from "ai";

export function getModel() {
  return wrapLanguageModel({
    model:
      process.env.NODE_ENV !== "production" &&
      process.env.OPENAI_API_KEY &&
      !process.env.AI_GATEWAY_API_KEY
        ? openai("gpt-5.6-luna")
        : gateway("openai/gpt-5.6-luna"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });
}
