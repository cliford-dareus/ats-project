"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { organization_member, users_table } from "@/drizzle/schema";
import { requirePermission } from "@/server/permissions";

export type OrgMemberDTO = {
    id: string;
    name: string;
    email: string;
    username: string | null;
    image_url: string | null;
    role: string;
};

/** Members of the session org only (used for @mentions and interviewer pickers). */
export const get_org_members_action = async (): Promise<OrgMemberDTO[]> => {
    const { orgId } = await requirePermission("member:view");

    return db
        .select({
            id: users_table.id,
            name: users_table.name,
            email: users_table.email,
            username: users_table.username,
            image_url: users_table.image_url,
            role: organization_member.role,
        })
        .from(organization_member)
        .innerJoin(users_table, eq(users_table.id, organization_member.user_id))
        .where(eq(organization_member.organization_id, orgId))
        .orderBy(asc(users_table.name));
};
