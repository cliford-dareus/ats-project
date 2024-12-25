"use client"

import React, {createContext, useEffect} from 'react';
import {useUser} from "@clerk/nextjs";
import {useRouter} from "next/navigation";

type  Props = {
    children: React.ReactNode,
}

const OrgContext = createContext(null)

const AuthOrgProvider = ({children}: Props) => {
    const router = useRouter()
    const {user, isLoaded} = useUser();

    useEffect(() => {
        if (isLoaded && user?.publicMetadata.role == "admin" && user.organizationMemberships.length === 0) {
            router.push('settings/organization')
        }
    }, [isLoaded]);

    return <OrgContext.Provider value={null}>{children}</OrgContext.Provider>;
};

export default AuthOrgProvider;