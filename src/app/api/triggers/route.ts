import { NextRequest, NextResponse } from 'next/server';
import { addTaskToQueue } from '@/server/queries/mongo/smart-task';
import { TriggerAction } from '@/plugins/smart-trigger/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { applicationId, action, stageName } = body;

        // Validate required fields
        if (!applicationId || !action || !stageName) {
            return NextResponse.json(
                { error: 'Missing required fields: applicationId, action, stageName' },
                { status: 400 }
            );
        }

        // Validate action structure
        if (!action.action_type || action.action_type === null) {
            return NextResponse.json(
                { error: 'Invalid action: action_type is required' },
                { status: 400 }
            );
        }

        // Call the server function
        await addTaskToQueue(applicationId, action as TriggerAction, stageName);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding trigger:', error);
        return NextResponse.json(
            { error: 'Failed to add trigger' },
            { status: 500 }
        );
    }
}
