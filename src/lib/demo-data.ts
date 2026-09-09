export type StageId = "new" | "screening" | "phone" | "offer";

export type Candidate = {
    id: string;
    name: string;
    role: string;
    location: string;
    stage: StageId;
    score: number;
    applied: string;
    email: string;
    summary: string;
    notes: string[];
};

export const STAGES: { id: StageId; label: string; hint: string }[] = [
    { id: "new", label: "New", hint: "Inbox" },
    { id: "screening", label: "Screening", hint: "Review" },
    { id: "phone", label: "Phone", hint: "Interview" },
    { id: "offer", label: "Offer", hint: "Close" },
];

export const CANDIDATES: Candidate[] = [
    {
        id: "maya",
        name: "Maya Chen",
        role: "Senior Frontend Engineer",
        location: "Miami, FL",
        stage: "screening",
        score: 92,
        applied: "2d ago",
        email: "maya.chen@example.com",
        summary:
            "Eight years shipping product UI. Strong TypeScript, design-system work, and a calm interview presence.",
        notes: ["React / Next.js", "Design systems", "Staff-track"],
    },
    {
        id: "jordan",
        name: "Jordan Hale",
        role: "School IT Specialist",
        location: "Hialeah, FL",
        stage: "new",
        score: 81,
        applied: "4h ago",
        email: "jordan.hale@example.com",
        summary:
            "Campus IT lead with device fleet, identity, and parent-facing systems experience.",
        notes: ["Google Workspace", "Device MDM", "Helpdesk"],
    },
    {
        id: "priya",
        name: "Priya Shah",
        role: "Operations Coordinator",
        location: "Remote",
        stage: "phone",
        score: 88,
        applied: "1w ago",
        email: "priya.shah@example.com",
        summary:
            "Ops generalist who has run hiring calendars, vendor onboarding, and weekly reporting.",
        notes: ["Calendars", "Vendors", "Reporting"],
    },
    {
        id: "luis",
        name: "Luis Ortega",
        role: "Senior Frontend Engineer",
        location: "Tampa, FL",
        stage: "offer",
        score: 95,
        applied: "3w ago",
        email: "luis.ortega@example.com",
        summary:
            "Staff engineer from a 40-person product team. Built their internal hiring board before applying here.",
        notes: ["TypeScript", "Hiring systems", "Mentorship"],
    },
    {
        id: "nora",
        name: "Nora Whitfield",
        role: "Operations Coordinator",
        location: "Fort Lauderdale, FL",
        stage: "screening",
        score: 76,
        applied: "5d ago",
        email: "nora.w@example.com",
        summary:
            "Former office manager. Clear writer, reliable with follow-through, new to structured ATS work.",
        notes: ["Writing", "Scheduling", "Onboarding"],
    },
    {
        id: "eli",
        name: "Eli Brooks",
        role: "School IT Specialist",
        location: "Miami, FL",
        stage: "phone",
        score: 84,
        applied: "6d ago",
        email: "eli.brooks@example.com",
        summary:
            "Network and classroom AV. Comfortable with after-hours coverage during enrollment week.",
        notes: ["Networking", "AV", "On-call"],
    },
];

export const JOBS = [
    {
        title: "Senior Frontend Engineer",
        dept: "Product",
        open: 1,
        applicants: 48,
        stageMix: [18, 16, 9, 5],
    },
    {
        title: "School IT Specialist",
        dept: "Campus",
        open: 2,
        applicants: 31,
        stageMix: [14, 9, 6, 2],
    },
    {
        title: "Operations Coordinator",
        dept: "People",
        open: 1,
        applicants: 22,
        stageMix: [8, 7, 5, 2],
    },
];

export const EMAIL_TEMPLATES = [
    {
        id: "screen",
        name: "Screening invite",
        subject: "Next step — {{role}} at {{org}}",
        body: "Hi {{first}},\n\nThank you for applying to {{role}}. We'd like a 20-minute screen this week. Reply with two times that work, and we'll send a calendar hold.\n\n— {{recruiter}}",
    },
    {
        id: "reject",
        name: "Kind close",
        subject: "Your application to {{org}}",
        body: "Hi {{first}},\n\nWe're moving forward with other candidates for {{role}}. Grateful you took the time — we'll keep your profile for future roles that fit more closely.\n\n— {{org}} hiring",
    },
    {
        id: "offer",
        name: "Offer follow-up",
        subject: "Offer details — {{role}}",
        body: "Hi {{first}},\n\nSharing the written offer we discussed. Take the week. I'm around for questions on compensation, start date, or the team.\n\n— {{recruiter}}",
    },
];

export const FAQS = [
    {
        q: "Who is Koze for?",
        a: "Small and mid-sized organizations that hire without a fifty-person recruiting department — schools, studios, clinics, and product teams that still need a real pipeline.",
    },
    {
        q: "What does it actually do?",
        a: "Job postings, a candidate pipeline (New → Screening → Phone → Offer), profiles and resumes, bulk import, automated and mass email, interview holds, reports, and AI-assisted resume review.",
    },
    {
        q: "Is the AI a black box?",
        a: "No. Google Gemini is used to extract and summarize resumes so reviewers start from a structured profile — not a raw PDF. Humans still move stages and send mail.",
    },
    {
        q: "Can more than one team use it?",
        a: "Yes. Organizations are first-class. Switch between campuses or companies without mixing candidate data.",
    },
    {
        q: "Is it open source?",
        a: "The product lives at github.com/cliford-dareus/ats-project. Built by Cliford Dareus in Miami. Star it, fork it, or write if you want to run it with your team.",
    },
];
