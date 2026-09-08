import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { candidates, organization } from "@/drizzle/schema";
import { canCreateCandidate } from "@/server/permissions";
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";

interface CandidateData {
  name: string;
  email: string;
  phone: string;
  location?: string;
  experience?: string;
  skills?: string;
  education?: string;
  notes?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // Tenant from session only
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canCreate = await canCreateCandidate();
    if (!canCreate) {
      return NextResponse.json(
        { error: "You do not have permission to import candidates" },
        { status: 403 }
      );
    }

    // Resolve org subdomain for required candidate columns (never from client)
    const [org] = await db
      .select({
        clerk_id: organization.clerk_id,
        subdomain: organization.subdomain,
      })
      .from(organization)
      .where(eq(organization.clerk_id, orgId))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { candidates: candidateData } = body;

    if (!candidateData || !Array.isArray(candidateData)) {
      return NextResponse.json(
        { error: "Invalid request body. Expected candidates array." },
        { status: 400 }
      );
    }

    if (candidateData.length === 0) {
      return NextResponse.json(
        { error: "No candidates provided for import" },
        { status: 400 }
      );
    }

    if (candidateData.length > 1000) {
      return NextResponse.json(
        { error: "Too many candidates. Maximum 1000 candidates per import." },
        { status: 400 }
      );
    }

    const validCandidates: CandidateData[] = [];
    const errors: ValidationError[] = [];
    let imported = 0;
    let failed = 0;

    const validateCandidate = (
      candidate: CandidateData,
      index: number
    ): ValidationError[] => {
      const candidateErrors: ValidationError[] = [];

      if (!candidate.name || candidate.name.trim() === "") {
        candidateErrors.push({
          row: index + 1,
          field: "name",
          message: "Name is required",
        });
      }

      if (!candidate.email || candidate.email.trim() === "") {
        candidateErrors.push({
          row: index + 1,
          field: "email",
          message: "Email is required",
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) {
        candidateErrors.push({
          row: index + 1,
          field: "email",
          message: "Invalid email format",
        });
      }

      if (!candidate.phone || candidate.phone.trim() === "") {
        candidateErrors.push({
          row: index + 1,
          field: "phone",
          message: "Phone is required",
        });
      } else if (
        !/^[\+]?[1-9][\d]{0,15}$/.test(
          candidate.phone.replace(/[\s\-\(\)]/g, "")
        )
      ) {
        candidateErrors.push({
          row: index + 1,
          field: "phone",
          message: "Invalid phone format",
        });
      }

      return candidateErrors;
    };

    for (let i = 0; i < candidateData.length; i++) {
      const candidate = candidateData[i];
      const candidateErrors = validateCandidate(candidate, i);

      if (candidateErrors.length > 0) {
        errors.push(...candidateErrors);
        failed++;
      } else {
        validCandidates.push(candidate);
      }
    }

    const emailSet = new Set<string>();
    const duplicateEmails = new Set<string>();

    validCandidates.forEach((candidate, index) => {
      const email = candidate.email.toLowerCase().trim();
      if (emailSet.has(email)) {
        duplicateEmails.add(email);
        errors.push({
          row: index + 1,
          field: "email",
          message: `Duplicate email in import batch: ${candidate.email}`,
        });
        failed++;
      } else {
        emailSet.add(email);
      }
    });

    const uniqueValidCandidates = validCandidates.filter(
      (c) => !duplicateEmails.has(c.email.toLowerCase().trim())
    );

    if (uniqueValidCandidates.length > 0) {
      const emails = uniqueValidCandidates.map((c) =>
        c.email.toLowerCase().trim()
      );

      // Duplicate check scoped to THIS org only
      const existingRows = await db
        .select({ email: candidates.email })
        .from(candidates)
        .where(
          and(
            eq(candidates.organization, orgId),
            inArray(candidates.email, emails)
          )
        );

      const existingEmailSet = new Set(
        existingRows.map((e) => e.email.toLowerCase())
      );

      const finalValidCandidates = uniqueValidCandidates.filter((candidate) => {
        const email = candidate.email.toLowerCase().trim();
        if (existingEmailSet.has(email)) {
          errors.push({
            row:
              candidateData.findIndex(
                (c: CandidateData) =>
                  c.email?.toLowerCase().trim() === email
              ) + 1,
            field: "email",
            message: `Email already exists in this organization: ${candidate.email}`,
          });
          failed++;
          return false;
        }
        return true;
      });

      if (finalValidCandidates.length > 0) {
        try {
          const batchSize = 100;
          for (let i = 0; i < finalValidCandidates.length; i += batchSize) {
            const batch = finalValidCandidates.slice(i, i + batchSize);

            const candidateInserts = batch.map((candidate) => ({
              name: candidate.name.trim(),
              email: candidate.email.toLowerCase().trim(),
              phone: candidate.phone.trim(),
              location: (candidate.location ?? "").trim() || "Unknown",
              address: "",
              city: "",
              state: "",
              zip_code: "",
              cv_path: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
              subdomain: org.subdomain,
              organization: orgId, // session org only
              status: "ACTIVE" as const,
            }));

            await db.insert(candidates).values(candidateInserts);
            imported += batch.length;
          }
        } catch (dbError) {
          console.error("Database error during import:", dbError);
          return NextResponse.json(
            {
              error: "Database error occurred during import",
              imported: 0,
              failed: candidateData.length,
              errors: [
                {
                  row: 0,
                  field: "database",
                  message: "Failed to save candidates to database",
                },
              ],
            },
            { status: 500 }
          );
        }
      }
    }

    revalidateDbCache({
      tag: CACHE_TAGS.candidates,
      id: orgId,
    });

    return NextResponse.json({
      success: true,
      imported,
      failed,
      errors,
      message: `Successfully imported ${imported} candidates. ${failed} failed.`,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        imported: 0,
        failed: 0,
        errors: [
          {
            row: 0,
            field: "server",
            message: "An unexpected error occurred",
          },
        ],
      },
      { status: 500 }
    );
  }
}
