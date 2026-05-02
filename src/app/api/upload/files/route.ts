import {NextResponse} from "next/server";
import {uploadFileToSupabase} from "@/lib/upload-file-to-supabase";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import { candidates } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import mongodb from "@/lib/mongodb";
import Attachment from "@/models/attachments";

export async function POST(req: Request) {
    try {
        await mongodb();

        const formData = await req.formData();
        const file = formData.get("my-file") as File;
        const candidateId = formData.get("candidate_id") as string;
        const attachmentType = formData.get("attachment_type") as string;

        if(!candidateId || !attachmentType || !file) {
            return NextResponse.json({error: "No candidate id or attachment type provided"}, {status: 400});
        };

        const user = await currentUser();
        if (!user) {
            return NextResponse.json({error: "User not found"}, {status: 400});
        };

        const candidate = await db.select().from(candidates).where(eq(candidates.id, Number(candidateId)));
        if (!candidate) {
            return NextResponse.json({error: "Candidate not found"}, {status: 400});
        };

        const fileUrl = await uploadFileToSupabase(file);

        await Attachment.create({
            file_name: file.name,
            file_url: fileUrl,
            candidate_id: Number(candidateId),
            attachment_type: attachmentType,
        });

        return NextResponse.json({});
    } catch (e) {
        return NextResponse.json({error: e}, {status: 500});
    }
};
