import { openai } from "@ai-sdk/openai";
import { gateway } from "ai";

export function getModel() {
  return process.env.OPENAI_API_KEY && !process.env.AI_GATEWAY_API_KEY
    ? openai("gpt-6-luna")
    : gateway("openai/gpt-6-luna");
}
