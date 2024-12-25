"use client"

import React, {createContext, useEffect} from 'react';
import {useOrganization, useUser} from "@clerk/nextjs";
import {useRouter} from "next/navigation";

type  Props = {
    children: React.ReactNode,
}

const OrgContext = createContext(null)

const AuthOrgProvider = ({children}: Props) => {
    const router = useRouter()
    const {user, isLoaded} = useUser();
    const {organization} = useOrganization()

    useEffect(() => {
        if (isLoaded && user?.publicMetadata.role == "admin" && !organization) {
            router.push('settings/organization')
        }
    }, [isLoaded]);

    return <OrgContext.Provider value={null}>{children}</OrgContext.Provider>;
};

export default AuthOrgProvider;