export const DEPARTMENTS = [
    "Finance",
    "IT",
    "Legal",
    "Marketing",
    "Customer Service",
    "Sales",
    "Recruiting",
    "Training and Development",
    "Compensation and Benefits",
    "Health and Safety",
    "HR Administration",
    "Performance Management",
    "Employee Relations"
];

export const CITIES = ["New York", "San Francisco", "Los Angeles", "Chicago", "Houston", "Philadelphia", "Phoenix", "San Antonio", "Dallas", "Austin", "Jacksonville", "San Jose", "Columbus", "Indianapolis", "Fort Worth", "Charlotte", "Detroit", "El Paso", "Memphis", "Seattle", "Denver", "Washington", "Boston", "Nashville", "Baltimore", "Oklahoma City", "Louisville", "Portland", "Las Vegas", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento", "Kansas City", "Mesa", "Atlanta", "Colorado Springs", "Miami", "Omaha", "Raleigh", "Long Beach", "Virginia Beach", "Oakland", "Minneapolis", "Tulsa", "Arlington", "New Orleans", "Wichita", "Honolulu", "Cleveland", "Aurora", "Santa Ana", "Riverside", "Corpus Christi", "St. Louis", "Lexington", "Anchorage", "Pittsburgh", "Newark", "Plano", "Bakersfield", "Buffalo", "Fort Wayne", "Henderson", "Chandler", "Greensboro", "Lincoln", "St. Petersburg", "Glendale", "Chula Vista", "Orlando", "Jersey City", "Fort Lauderdale", "Norfolk", "Durham", "Madison", "Laredo", "Winston-Salem", "Garland", "Reno", "Richmond", "San Bernardino", "Boise", "Chesapeake", "Gilbert", "Scottsdale", "North Las Vegas", "Fremont", "Baton Rouge", "San Diego", "Spokane", "Modesto", "Tacoma", "Oxnard", "Irvine", "Hialeah"];

export const TABLE_HEADER = {
    "jobs": ["JOB TITLE", "LOCATION", "TYPE", "APPLICATION NO.", "PUBLISHED AT", "STATUS"]
} as { [key: string]: string[] };

export const TABLE_HEADER_MAP = {
    "jobs": ["name", "location", "type", "application_count", "created_at", "status"]
} as { [key: string]: string[] };

export const SYSTEM_TEMPLATES: Omit<
    EmailTemplateDTO,
    "_id" | "organizationId" | "createdAt" | "updatedAt"
>[] = [
        {
            templateId: "interview_invite",
            name: "Interview Invitation",
            subject: "You're invited to interview for {{jobTitle}}",
            body: `Hi {{candidateName}},\n\nWe're excited to invite you to interview for the {{jobTitle}} role at {{companyName}}.\n\nPlease use the scheduling link we'll send separately to pick a time that works for you.\n\nBest regards,\n{{senderName}}\n{{companyName}} Talent Team`,
            isDefault: true,
            isSystem: true,
        },
        {
            templateId: "application_submitted",
            name: "Application Received",
            subject: "We received your application for {{jobTitle}}",
            body: `Hi {{candidateName}},\n\nThank you for applying for {{jobTitle}} at {{companyName}}. We've received your application and our team will review it shortly.\n\nWe typically respond within 5–7 business days.\n\nBest,\nThe {{companyName}} Talent Team`,
            isDefault: true,
            isSystem: true,
        },
        {
            templateId: "application_rejected",
            name: "Application Update",
            subject: "Update on your application for {{jobTitle}}",
            body: `Hi {{candidateName}},\n\nThank you for your interest in the {{jobTitle}} role at {{companyName}}. After careful review, we've decided to move forward with other candidates at this time.\n\nWe appreciate the time you invested and wish you the best in your search.\n\nBest regards,\n{{companyName}} Talent Team`,
            isDefault: true,
            isSystem: true,
        },
        {
            templateId: "information_request",
            name: "Information Request",
            subject: "Quick follow-up on your application",
            body: `Hi {{candidateName}},\n\nThanks again for applying to {{jobTitle}}. Could you please share a bit more detail about {{topic}}?\n\nReply to this email at your convenience.\n\nThanks,\n{{senderName}}`,
            isDefault: true,
            isSystem: true,
        },
        {
            templateId: "interview_reminder",
            name: "Interview Reminder",
            subject: "Reminder: Interview for {{jobTitle}} on {{interviewDate}}",
            body: `Hi {{candidateName}},\n\nThis is a friendly reminder about your upcoming interview for {{jobTitle}} on {{interviewDate}}.\n\nIf you need to reschedule, please reply as soon as possible.\n\nSee you soon,\n{{companyName}} Talent Team`,
            isDefault: true,
            isSystem: true,
        },
    ];
