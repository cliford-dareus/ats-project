// Short labels for the dotted action strings. Includes the Trash agent's
// delete/restore actions so their entries render here too.
export const ACTION_LABELS: Record<string, string> = {
    "job.created": "Job created",
    "job.published": "Job published",
    "job.draft_saved": "Draft saved",
    "job.deleted": "Job deleted",
    "job.restored": "Job restored",
    "job.permanently_deleted": "Job permanently deleted",
    "application.stage_moved": "Stage moved",
    "application.deleted": "Application deleted",
    "application.restored": "Application restored",
    "application.permanently_deleted": "Application permanently deleted",
    "candidate.status_changed": "Status changed",
    "candidate.deleted": "Candidate deleted",
    "candidate.restored": "Candidate restored",
    "candidate.permanently_deleted": "Candidate permanently deleted",
    "interview.scheduled": "Interview scheduled",
    "interview.rescheduled": "Interview rescheduled",
    "interview.cancelled": "Interview cancelled",
    "interview.feedback_submitted": "Feedback submitted",
    "plugin.installed": "Plugin installed",
    "plugin.enabled": "Plugin enabled",
    "plugin.disabled": "Plugin disabled",
    "plugin.uninstalled": "Plugin uninstalled",
    "plugin.settings_saved": "Plugin settings saved",
    "plugin.credentials_updated": "Plugin credentials updated",
    "plugin.dispatch_failed": "Plugin dispatch failed",
    "automation.execution_failed": "Automation failed",
    "twilio_sms_sent": "SMS sent",
    "twilio_sms_consent_recorded": "SMS consent recorded",
    "twilio_sms_consent_revoked": "SMS consent revoked",
};

export const time_ago = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
