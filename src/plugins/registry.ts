// Static manifest of every plugin the platform supports.
// This is the source of truth for what can be enabled per org.
// Safe to import on the SERVER — no class instances, no EventEmitter.
// ─────────────────────────────────────────────────────────────────────────────

import type { PluginManifestEntry } from "@/lib/plugin-interfaces";

export const AVAILABLE_PLUGINS: PluginManifestEntry[] = [
    // NOTE: every plugin in this manifest now has a real provider
    // (factory + config UI) — see hasProvider. No "Coming soon"
    // entries remain. Do not set hasProvider here until the provider +
    // config UI actually exist.
    {
        id: "openai-scoring",
        name: "OpenAI Resume Scoring",
        description: "Uses GPT-4o to score resumes 0–100 on fit, skills, and experience.",
        capabilities: ["llm_scoring", "analytics"],
        providerColor: "#10a37f",
        icon: "Zap",
        hasProvider: true,
    },
    {
        id: "anthropic-screening",
        name: "Claude Candidate Screening",
        description: "Uses Claude to generate structured interview questions and stage-aware insights.",
        capabilities: ["llm_scoring", "communication"],
        providerColor: "#c96442",
        icon: "Zap",
        hasProvider: true,
    },
    {
        id: "calendly",
        name: "Calendly",
        description: "Book interviews through Calendly: pick one of your real event types in the schedule modal and Applico books the candidate into that slot via the Calendly API. No Google Calendar event is created on this path, and holds are not available — bookings go straight to the candidate's slot.",
        capabilities: ["calendar_integration"],
        providerColor: "#006bff",
        icon: "Zap",
        hasProvider: true,
    },
    {
        id: "checkr",
        name: "Checkr Background Check",
        description: "Automatically initiate background checks when a candidate receives an offer.",
        capabilities: ["background_check", "compliance"],
        providerColor: "#7c3aed",
        icon: "Zap",
        hasProvider: true,
    },
    {
        id: "slack-notify",
        name: "Slack Notifications",
        description: "Post to Slack channels when candidates move stages or key events fire.",
        capabilities: ["communication"],
        providerColor: "#4a154b",
        icon: "Zap",
        hasProvider: true,
    },
    {
        id: "resend",
        name: "Resend",
        description: "Sends a branded confirmation email when a candidate applies.",
        capabilities: ["communication"],
        providerColor: "#000000",
        icon: "Zap",
        hasProvider: true,
    },
    {
        id: "google",
        name: "Google",
        description: "Uses Gemini to score resumes 0–100 on fit, skills, and experience.",
        capabilities: ["llm_scoring"],
        providerColor: "#4285F4",
        icon: "Zap",
        hasProvider: true,
    },
    {
        id: "indeed",
        name: "Indeed",
        description: "Publishes open roles to Indeed through your public XML feed — no API key needed. Publish a job and it appears in the feed Indeed crawls.",
        capabilities: ["syndication"],
        providerColor: "#2557a7",
        icon: "Zap",
        hasProvider: true,
    },
    {
        id: "linkedin",
        name: "LinkedIn",
        description: "Prepare LinkedIn posts for open roles by hand — LinkedIn has no free job-posting API, so Applico never posts automatically.",
        capabilities: ["syndication"],
        providerColor: "#0A66C2",
        icon: "Zap",
        hasProvider: true,
    }
];

export const PLUGIN_MAP = new Map(
    AVAILABLE_PLUGINS.map((p) => [p.id, p])
);
