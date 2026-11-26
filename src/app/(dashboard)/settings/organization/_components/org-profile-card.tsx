"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Building2,
    Globe,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Plus,
    Save,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { update_general_settings_action } from "@/server/actions/organization_actions";
import { GeneralSettingsInput, generalSettingsSchema } from "@/zod";

type Props = {
    /** Real org settings from the DB, or null when the org has no DB row yet. */
    initial: GeneralSettingsInput | null;
    rootDomain: string;
    /** Whether the current user may edit org settings (org:admin or settings:manage). */
    canManage: boolean;
};

/**
 * Organization profile card. Shows the session org's real data and edits it
 * through the same save path as General Settings
 * (`update_general_settings_action`, same schema and permission gate) —
 * no second save implementation. Branding-only fields (primary_color,
 * font_family) are carried in the form values and preserved on save; they
 * are edited in General Settings.
 */
const OrgProfileCard = ({ initial, rootDomain, canManage }: Props) => {
    const [editing, setEditing] = useState(false);
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
        null
    );

    const form = useForm<GeneralSettingsInput>({
        resolver: zodResolver(generalSettingsSchema),
        defaultValues: initial ?? undefined,
    });

    if (!initial) {
        return (
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm p-8">
                <h3 className="text-xl font-bold text-foreground">
                    Organization profile not found
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                    This organization has no profile in Applico yet. Complete setup in{" "}
                    <Link
                        href="/settings/general-settings"
                        className="text-primary font-medium underline-offset-2 hover:underline"
                    >
                        General Settings
                    </Link>
                    .
                </p>
            </div>
        );
    }

    const companyName = form.watch("name") || initial.name;
    const subdomain = form.watch("subdomain") || initial.subdomain;
    const careerUrl = `https://${subdomain}.${rootDomain}`;

    const onSubmit = (values: GeneralSettingsInput) => {
        setMessage(null);
        startTransition(async () => {
            try {
                await update_general_settings_action(values);
                setMessage({ type: "ok", text: "Profile saved successfully." });
                form.reset(values);
                setEditing(false);
            } catch (e) {
                setMessage({
                    type: "err",
                    text: e instanceof Error ? e.message : "Failed to save profile",
                });
            }
        });
    };

    const onCancel = () => {
        form.reset();
        setMessage(null);
        setEditing(false);
    };

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-8 border-b border-border flex items-start justify-between">
                <div className="flex gap-6">
                    <div className="w-24 h-24 rounded-2xl bg-muted border border-border flex items-center justify-center relative group">
                        <Building2 className="w-10 h-10 text-muted-foreground group-hover:text-brand-600 transition-colors" />
                        <button className="absolute -bottom-2 -right-2 p-1.5 bg-card border border-border rounded-lg shadow-sm hover:bg-muted">
                            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                    </div>
                    <div className="space-y-1 py-2">
                        <h3 className="text-xl font-bold text-foreground">{companyName}</h3>
                        <p className="text-muted-foreground text-sm flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <a
                                href={careerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline underline-offset-2"
                            >
                                {subdomain}.{rootDomain}
                            </a>
                        </p>
                    </div>
                </div>
                {canManage && !editing && (
                    <button
                        onClick={() => setEditing(true)}
                        className="px-4 py-2 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 transition-all"
                    >
                        Edit Profile
                    </button>
                )}
                {canManage && editing && (
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            form="org-profile-form"
                            disabled={pending || !form.formState.isDirty}
                        >
                            {pending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save
                        </Button>
                        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                    </div>
                )}
            </div>

            <div className="p-8">
                {message && (
                    <div
                        className={`rounded-xl border px-4 py-3 text-sm mb-6 ${message.type === "ok"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-red-200 bg-red-50 text-red-800"
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                <Form {...form}>
                    <form
                        id="org-profile-form"
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                        Company Name
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            disabled={!editing}
                                            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="locations"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3" />
                                        Headquarters
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            disabled={!editing}
                                            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                        <Phone className="h-3 w-3" />
                                        Phone
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            disabled={!editing}
                                            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                        <Mail className="h-3 w-3" />
                                        Company Email
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="email"
                                            disabled={!editing}
                                            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="subdomain"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5 md:col-span-2">
                                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                        <Globe className="h-3 w-3" />
                                        Career Page
                                    </FormLabel>
                                    <FormControl>
                                        <div className="flex rounded-xl overflow-hidden border border-border bg-muted">
                                            <Input
                                                {...field}
                                                disabled={!editing}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value.toLowerCase().replace(/\s+/g, "-")
                                                    )
                                                }
                                                className="border-0 rounded-none bg-transparent focus-visible:ring-0 px-4 py-2.5 text-sm"
                                            />
                                            <div className="flex items-center px-3 text-sm text-muted-foreground border-l border-border bg-muted/80 whitespace-nowrap">
                                                .{rootDomain}
                                            </div>
                                        </div>
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground ml-1">
                                        Public jobs URL:{" "}
                                        <a
                                            href={careerUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary font-medium underline-offset-2 hover:underline"
                                        >
                                            {careerUrl}
                                        </a>
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </div>
        </div>
    );
};

export default OrgProfileCard;
