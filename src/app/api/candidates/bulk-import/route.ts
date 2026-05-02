import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/drizzle/db';
import { candidates } from '@/drizzle/schema';
import { canCreateJob } from '@/server/permissions';
import { CACHE_TAGS, revalidateDbCache } from '@/lib/cache';

interface CandidateData {
    name: string;
    email: string;
    phone: string;
    location?: string;
    experience?: string;
    skills?: string;
    education?: string;
    notes?: string;
};

interface ValidationError {
    row: number;
    field: string;
    message: string;
};

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check permissions
        const canCreate = await canCreateJob(userId);
        if (!canCreate) {
            return NextResponse.json({
                error: 'You do not have permission to import candidates'
            }, { status: 403 });
        }

        const body = await request.json();
        const { candidates: candidateData } = body;

        if (!candidateData || !Array.isArray(candidateData)) {
            return NextResponse.json({
                error: 'Invalid request body. Expected candidates array.'
            }, { status: 400 });
        }

        if (candidateData.length === 0) {
            return NextResponse.json({
                error: 'No candidates provided for import'
            }, { status: 400 });
        }

        if (candidateData.length > 1000) {
            return NextResponse.json({
                error: 'Too many candidates. Maximum 1000 candidates per import.'
            }, { status: 400 });
        }

        // Validate and process candidates
        const validCandidates: CandidateData[] = [];
        const errors: ValidationError[] = [];
        let imported = 0;
        let failed = 0;

        // Validation function
        const validateCandidate = (candidate: CandidateData, index: number): ValidationError[] => {
            const candidateErrors: ValidationError[] = [];

            // Required fields validation
            if (!candidate.name || candidate.name.trim() === '') {
                candidateErrors.push({
                    row: index + 1,
                    field: 'name',
                    message: 'Name is required'
                });
            }

            if (!candidate.email || candidate.email.trim() === '') {
                candidateErrors.push({
                    row: index + 1,
                    field: 'email',
                    message: 'Email is required'
                });
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) {
                candidateErrors.push({
                    row: index + 1,
                    field: 'email',
                    message: 'Invalid email format'
                });
            }

            if (!candidate.phone || candidate.phone.trim() === '') {
                candidateErrors.push({
                    row: index + 1,
                    field: 'phone',
                    message: 'Phone is required'
                });
            } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(candidate.phone.replace(/[\s\-\(\)]/g, ''))) {
                candidateErrors.push({
                    row: index + 1,
                    field: 'phone',
                    message: 'Invalid phone format'
                });
            }

            return candidateErrors;
        };

        // Validate all candidates first
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

        // Check for duplicate emails in the batch
        const emailSet = new Set();
        const duplicateEmails: string[] = [];

        validCandidates.forEach((candidate, index) => {
            if (emailSet.has(candidate.email.toLowerCase())) {
                duplicateEmails.push(candidate.email);
                errors.push({
                    row: index + 1,
                    field: 'email',
                    message: `Duplicate email in import batch: ${candidate.email}`
                });
                failed++;
            } else {
                emailSet.add(candidate.email.toLowerCase());
            }
        });

        // Remove duplicates from valid candidates
        const uniqueValidCandidates = validCandidates.filter(
            candidate => !duplicateEmails.includes(candidate.email)
        );

        // Check for existing emails in database
        if (uniqueValidCandidates.length > 0) {
            const existingEmails = await db
                .select({ email: candidates.email })
                .from(candidates);

            const existingEmailSet = new Set(existingEmails.map(e => e.email.toLowerCase()));

            const finalValidCandidates = uniqueValidCandidates.filter(candidate => {
                if (existingEmailSet.has(candidate.email.toLowerCase())) {
                    errors.push({
                        row: candidateData.findIndex(c => c.email === candidate.email) + 1,
                        field: 'email',
                        message: `Email already exists in database: ${candidate.email}`
                    });
                    failed++;
                    return false;
                }
                return true;
            });

            // Import valid candidates in batches
            if (finalValidCandidates.length > 0) {
                try {
                    const batchSize = 100;
                    for (let i = 0; i < finalValidCandidates.length; i += batchSize) {
                        const batch = finalValidCandidates.slice(i, i + batchSize);

                        const candidateInserts = batch.map(candidate => ({
                            name: candidate.name.trim(),
                            email: candidate.email.toLowerCase().trim(),
                            phone: candidate.phone.trim(),
                            cv_path: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            status: 'Active' as const,
                        }));

                        await db.insert(candidates).values(candidateInserts);
                        imported += batch.length;
                    }
                } catch (dbError) {
                    console.error('Database error during import:', dbError);
                    return NextResponse.json({
                        error: 'Database error occurred during import',
                        imported: 0,
                        failed: candidateData.length,
                        errors: [{
                            row: 0,
                            field: 'database',
                            message: 'Failed to save candidates to database'
                        }]
                    }, { status: 500 });
                }
            }
        };

        revalidateDbCache({
            tag: CACHE_TAGS.candidates,
        });

        return NextResponse.json({
            success: true,
            imported,
            failed,
            errors,
            message: `Successfully imported ${imported} candidates. ${failed} failed.`
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            imported: 0,
            failed: 0,
            errors: [{
                row: 0,
                field: 'server',
                message: 'An unexpected error occurred'
            }]
        }, { status: 500 });
    }
};
