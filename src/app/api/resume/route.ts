import pdfParse from "pdf-parse";
import {NextResponse} from "next/server";
// import {parseResume} from "@/lib/crude-parsing";
import {GoogleGenerativeAI} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});
        const data = await req.json();
        const buffer = Buffer.from(data.file, "base64");
        const parsed = await pdfParse(buffer);
        const extractedText = parsed.text;

        const prompt = `Extract the following details from this resume:
                          - Name
                          - Contact Information
                          - Skills
                          - Work Experience
                          - Education
                          Resume Text: ${extractedText}`;
        //
        const response = await model.generateContent(prompt);
        const result = response.response.text();

        // TODO: Parse the result for key values needed for creating a candidate
        // const parsedData = parseResume(extractedText);
        // TODO: Compare the ai result with the parsed data
        // TODO: if they are similar, return the parsed data
        // TODO: create a candidate
        // TODO: return the candidate

        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({error: e}, {status: 500});
    }
}



