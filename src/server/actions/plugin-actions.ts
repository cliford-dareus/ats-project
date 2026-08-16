"use server";

// Server action = auth check + delegate to DB query
import {AutomationRule, OrgPluginState} from "@/types";
import {db_get_job_automation_rules, db_get_org_plugin_state} from "@/server/queries/drizzle/plugin-queries";
import {assertJobBelongsToOrg, getAuthOrThrow} from "@/server/permissions";

export async function getJobAutomationRules(jobId: number): Promise<AutomationRule[]> {
    const {orgId} = await getAuthOrThrow();
    await assertJobBelongsToOrg(jobId, orgId);

    if (!orgId) return [];
    return db_get_job_automation_rules(jobId, orgId);
};

export async function getOrgPluginState(orgId: string): Promise<OrgPluginState> {
    const {orgId: sessionOrgId} = await getAuthOrThrow();

    if (!sessionOrgId || sessionOrgId !== orgId) {
        return { flags: {}, installed: [] };
    }
    return db_get_org_plugin_state(orgId)
};