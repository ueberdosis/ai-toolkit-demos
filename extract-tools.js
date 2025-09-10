#!/usr/bin/env node

/**
 * TipTap AI Toolkit Tool Definitions Extractor
 * 
 * This script extracts the actual tool definitions from @tiptap-pro/ai-toolkit-ai-sdk
 * and formats them for use in other providers (like our Python FastAPI backend).
 * 
 * Usage:
 *   node extract-tools.js
 *   node extract-tools.js --python  # Output Python-ready format
 *   node extract-tools.js --help    # Show help
 */

const { toolDefinitions } = require('@tiptap-pro/ai-toolkit-ai-sdk');

function showHelp() {
    console.log(`
TipTap AI Toolkit Tool Definitions Extractor

Usage:
  node extract-tools.js [options]

Options:
  --python, -p    Output in Python-ready format for FastAPI backend
  --raw, -r       Output raw tool definitions (default)
  --help, -h      Show this help message

Examples:
  node extract-tools.js              # Show raw definitions
  node extract-tools.js --python     # Show Python format
  node extract-tools.js -p > tools.json  # Save Python format to file
`);
}

function convertToPythonFormat(tools) {
    const pythonTools = [];

    for (const [toolName, toolDef] of Object.entries(tools)) {
        // Convert Zod schema to OpenAI function calling format
        const parameters = convertZodToOpenAI(toolDef.inputSchema);
        
        pythonTools.push({
            type: "function",
            function: {
                name: toolName,
                description: toolDef.description,
                parameters: parameters
            }
        });
    }

    return pythonTools;
}

function convertZodToOpenAI(zodSchema) {
    if (!zodSchema || !zodSchema.def) {
        return { type: "object", properties: {}, required: [] };
    }

    const def = zodSchema.def;
    
    if (def.type === "object" && def.shape) {
        const properties = {};
        const required = [];

        for (const [key, value] of Object.entries(def.shape)) {
            properties[key] = convertZodTypeToOpenAI(value);
            
            // In Zod, if a field doesn't have .optional(), it's required
            // This is a simplified check - in practice you'd need more complex logic
            if (!value.def?.typeName?.includes("Optional")) {
                required.push(key);
            }
        }

        return {
            type: "object",
            properties,
            required
        };
    }

    return { type: "object", properties: {}, required: [] };
}

function convertZodTypeToOpenAI(zodType) {
    if (!zodType || !zodType.def) {
        return { type: "string" };
    }

    const def = zodType.def;

    switch (def.type) {
        case "string":
            return { type: "string", description: def.description || "" };
        
        case "number":
            return { type: "number", description: def.description || "" };
        
        case "boolean":
            return { type: "boolean", description: def.description || "" };
        
        case "enum":
            return {
                type: "string",
                enum: Object.values(def.entries || {}),
                description: def.description || ""
            };
        
        case "array":
            return {
                type: "array",
                items: convertZodTypeToOpenAI(def.element),
                description: def.description || ""
            };
        
        case "object":
            return convertZodToOpenAI(zodType);
        
        default:
            return { type: "string", description: def.description || "" };
    }
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    const tools = toolDefinitions();
    
    if (args.includes('--python') || args.includes('-p')) {
        console.log('# Python-ready TipTap AI Toolkit Tool Definitions');
        console.log('# Generated on:', new Date().toISOString());
        console.log('# Copy this to backend/ai_integration.py get_tool_definitions() function\n');
        
        const pythonTools = convertToPythonFormat(tools);
        console.log(JSON.stringify(pythonTools, null, 4));
    } else {
        console.log('=== TipTap AI Toolkit Tool Definitions ===');
        console.log('Generated on:', new Date().toISOString());
        console.log('Package version: @tiptap-pro/ai-toolkit-ai-sdk');
        console.log('\nRaw tool definitions:');
        console.log(JSON.stringify(tools, null, 2));
    }
}

if (require.main === module) {
    main();
}

module.exports = { convertToPythonFormat, convertZodToOpenAI };
