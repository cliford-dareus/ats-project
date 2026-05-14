// Static manifest of every plugin the platform supports.
// This is the source of truth for what can be enabled per org.
// Safe to import on the SERVER — no class instances, no EventEmitter.
// ─────────────────────────────────────────────────────────────────────────────

import type { PluginManifestEntry } from "@/lib/plugin-interfaces";

export const AVAILABLE_PLUGINS: PluginManifestEntry[] = [
    {
        id: "openai-scoring",
        name: "OpenAI Resume Scoring",
        description: "Uses GPT-4o to score resumes 0–100 on fit, skills, and experience.",
        capabilities: ["llm_scoring", "analytics"],
        providerColor: "#10a37f",
        icon: "Zap"
    },
    {
        id: "anthropic-screening",
        name: "Claude Candidate Screening",
        description: "Uses Claude to generate structured interview questions and stage-aware insights.",
        capabilities: ["llm_scoring", "communication"],
        providerColor: "#c96442",
        icon: "Zap"
    },
    {
        id: "calendly",
        name: "Calendly",
        description: "Auto-send scheduling links when a candidate enters phone screen or interview stages.",
        capabilities: ["calendar_integration"],
        providerColor: "#006bff",
        icon: "Zap"
    },
    {
        id: "checkr",
        name: "Checkr Background Check",
        description: "Automatically initiate background checks when a candidate receives an offer.",
        capabilities: ["background_check", "compliance"],
        providerColor: "#7c3aed",
        icon: "Zap"
    },
    {
        id: "slack-notify",
        name: "Slack Notifications",
        description: "Post to Slack channels when candidates move stages or key events fire.",
        capabilities: ["communication"],
        providerColor: "#4a154b",
        icon: "Zap"
    },
    {
        id: "resend",
        name: "Resend",
        description: "Post to Resend when candidates move stages or key events fire.",
        capabilities: ["communication"],
        providerColor: "#000000",
        icon: "Zap"
    },
];

export const PLUGIN_MAP = new Map(
    AVAILABLE_PLUGINS.map((p) => [p.id, p])
);
