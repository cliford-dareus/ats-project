// Function to extract Name
function extractName(text: string) {
    const nameRegex = /^[A-Za-z\s]+(?=\s+[A-Za-z\s]+)/i;
    const match = text.match(nameRegex);
    return match ? match[0].trim() : "Not Found";
}

// Function to extract Email
function extractEmail(text: string) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : "Not Found";
}

// Function to extract Phone Number
function extractPhone(text: string): string[] {
    const phoneRegex = /(?:\+?(\d{1,4}))?[-.\s]?(\(?\d{1,3}\)?)[-.\s]?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9})?/g;
    const matches = text.match(phoneRegex);
    return matches ? matches.map((match) => match.trim()) : ["Not Found"];
}

// Function to extract Skills
function extractSkills(text: string) {
    const skillsRegex = /Skills\s*([\s\S]*?)(?=\n\n|Education|Experience)/i;
    const match = text.match(skillsRegex);
    return match ? match[1].split(",").map(skill => skill.trim()) : [];
}

// Function to extract Education
function extractEducation(text: string) {
    const educationRegex = /Education\s*([\s\S]*?)(?=\n\n|Experience|Skills)/i;
    const match = text.match(educationRegex);
    return match ? match[1].trim() : "Not Found";
}

// Function to extract Experience
function extractExperience(text: string) {
    const experienceRegex = /Experience\s*([\s\S]*?)(?=\n\n|Education|Skills)/i;
    const match = text.match(experienceRegex);
    return match ? match[1].trim() : "Not Found";
}

// Main function to parse the resume
export function parseResume(text: string) {
    return {
        name: extractName(text),
        email: extractEmail(text),
        phone: extractPhone(text),
        skills: extractSkills(text),
        education: extractEducation(text),
        experience: extractExperience(text),
    };
}