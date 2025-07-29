import {NextRequest, NextResponse} from 'next/server';
import {CACHE_TAGS, revalidateDbCache} from '@/lib/cache';

export async function POST(req: NextRequest) {
    const body = await req.json();

    try {
        revalidateDbCache({
            id: body.jobId,
            tag: CACHE_TAGS.applications,
        });

        return NextResponse.json({success: true});
    } catch (error) {
        console.error('Revalidation error:', error);
        return NextResponse.json({error: 'Revalidation failed'}, {status: 500});
    }
}
