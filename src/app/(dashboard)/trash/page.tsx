import React from 'react';
import Link from 'next/link';
import { AlertTriangle, BriefcaseBusiness, FileText, RotateCcw, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { get_trash_action } from '@/server/actions/trash-actions';
import { hasPermission } from '@/server/permissions';
import type { TrashItem, TrashItemType } from '@/server/queries/drizzle/trash';
import { EmptyTrashButton, TrashItemActions } from './_components/trash-item-actions';

const TYPE_META: Record<TrashItemType, { label: string; plural: string; icon: typeof BriefcaseBusiness }> = {
    job: { label: 'Job', plural: 'Jobs', icon: BriefcaseBusiness },
    candidate: { label: 'Candidate', plural: 'Candidates', icon: Users },
    application: { label: 'Application', plural: 'Applications', icon: FileText },
};

const FILTERS = [
    { id: 'all', label: 'All Items' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'candidates', label: 'Candidates' },
    { id: 'applications', label: 'Applications' },
] as const;

type TrashFilter = (typeof FILTERS)[number]['id'];

const formatDeletedAt = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const TrashSection = ({
    type,
    items,
    canManage,
}: {
    type: TrashItemType;
    items: TrashItem[];
    canManage: boolean;
}) => {
    const meta = TYPE_META[type];
    const Icon = meta.icon;
    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Icon size={20} />
                    {meta.plural}
                    <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
                {items.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                            <div className="font-medium truncate">{item.title}</div>
                            <div className="text-sm text-muted-foreground truncate">{item.subtitle}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                Deleted {formatDeletedAt(item.deletedAt)}
                            </div>
                        </div>
                        <TrashItemActions type={item.type} id={item.id} title={item.title} canManage={canManage} />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

const TrashPage = async ({ searchParams }: { searchParams: Promise<{ type?: string }> }) => {
    const params = await searchParams;
    const rawFilter = params.type;
    const activeFilter: TrashFilter =
        rawFilter === 'jobs' || rawFilter === 'candidates' || rawFilter === 'applications' ? rawFilter : 'all';

    const result = await get_trash_action();

    if ('error' in result) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-2">Trash</h1>
                <p className="text-muted-foreground">{result.message}</p>
            </div>
        );
    }

    const { items, counts, visibleTypes } = result;
    const total = counts.jobs + counts.candidates + counts.applications;

    // Restoring / permanently deleting need the same :delete permission as
    // deleting did — checked here so the buttons only render for those who
    // may use them (the server actions re-check on every call).
    const canManage = {
        job: await hasPermission('job:delete'),
        candidate: await hasPermission('candidate:delete'),
        application: await hasPermission('application:delete'),
    };
    const canEmpty = canManage.job || canManage.candidate || canManage.application;

    const countsByFilter: Record<TrashFilter, number> = {
        all: total,
        jobs: counts.jobs,
        candidates: counts.candidates,
        applications: counts.applications,
    };

    const visibleSections: { type: TrashItemType; items: TrashItem[] }[] = (
        [
            { type: 'job', items: items.jobs },
            { type: 'candidate', items: items.candidates },
            { type: 'application', items: items.applications },
        ] as { type: TrashItemType; items: TrashItem[] }[]
    ).filter(
        (section) =>
            visibleTypes.includes(section.type) &&
            (activeFilter === 'all' ||
                (activeFilter === 'jobs' && section.type === 'job') ||
                (activeFilter === 'candidates' && section.type === 'candidate') ||
                (activeFilter === 'applications' && section.type === 'application')),
    );

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Trash</h1>
                    <p className="text-muted-foreground">Restore deleted items or delete them forever</p>
                </div>
                <div className="flex gap-2">
                    {total > 0 && <EmptyTrashButton disabled={!canEmpty} />}
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                {FILTERS.map((filter) => (
                    <Link
                        key={filter.id}
                        href={filter.id === 'all' ? '/trash' : `/trash?type=${filter.id}`}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            activeFilter === filter.id
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-muted'
                        }`}
                    >
                        {filter.label} ({countsByFilter[filter.id]})
                    </Link>
                ))}
            </div>

            {total === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trash2 size={20} />
                            Deleted Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12">
                            <Trash2 size={48} className="mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No items in trash</h3>
                            <p className="text-muted-foreground">
                                Jobs, candidates and applications you delete will appear here.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                visibleSections.map((section) =>
                    section.items.length > 0 ? (
                        <TrashSection
                            key={section.type}
                            type={section.type}
                            items={section.items}
                            canManage={canManage[section.type]}
                        />
                    ) : null,
                )
            )}

            <div className="mt-6 p-4 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-orange-500 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-orange-800 dark:text-orange-200">No automatic deletion</h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                            Items stay in Trash until you restore them or delete them forever.
                            Restoring a job or candidate also restores the applications that
                            were moved to Trash with it. Deleting forever cannot be undone.
                        </p>
                    </div>
                </div>
            </div>

            {!canManage.job && !canManage.candidate && !canManage.application && total > 0 && (
                <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
                    <RotateCcw size={14} />
                    You can view Trash, but restoring or permanently deleting items needs a delete permission.
                </p>
            )}
        </div>
    );
};

export default TrashPage;
