import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CACHE_TAGS, revalidateDbCache } from '@/lib/cache';
import { assertJobBelongsToOrg, canMoveApplication } from '@/server/permissions';

export async function POST(req: NextRequest) {
    try {
        // Auth + tenant from session only — cache revalidation is privileged:
        // without this, any caller could flush another org's cached data.
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Least-privilege permission for this endpoint: it revalidates the
        // applications cache for a job, an operation tied to moving
        // applications. (No in-app callers exist yet — this is the narrowest
        // permission that fits the operation.)
        const canMove = await canMoveApplication();
        if (!canMove) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const jobId = (body as { jobId?: unknown } | null)?.jobId;
        if (typeof jobId !== 'number' || !Number.isInteger(jobId) || jobId <= 0) {
            return NextResponse.json(
                { error: 'jobId must be a positive integer' },
                { status: 400 }
            );
        }

        // The job must belong to the caller's org — otherwise a user could
        // revalidate (and probe the existence of) another org's jobs.
        try {
            await assertJobBelongsToOrg(jobId, orgId);
        } catch {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        revalidateDbCache({
            id: String(jobId),
            tag: CACHE_TAGS.applications,
            orgId,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Revalidation error:', error);
        return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
    }
}
