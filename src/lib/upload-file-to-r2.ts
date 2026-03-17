import {r2Client} from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function uploadResumeToR2(file: File, candidateName: string): Promise<string> {
  const key = `resumes/${Date.now()}-${candidateName.toLowerCase().replace(/\s+/g, '-')}.pdf`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type || 'application/pdf',
  });

  await r2Client.send(command);
  return key; // we store the key (private + signed URLs later)
};
