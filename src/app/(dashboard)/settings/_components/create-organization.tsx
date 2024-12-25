'use client'

import React, {FormEvent, useState} from 'react';
import {useOrganizationList, useUser} from "@clerk/nextjs";
import {Input} from "@/components/ui/input";


const CreateOrganization = () => {
    const user = useUser();
    const [orgName, setOrgName] = useState<string>("")
    const {createOrganization, setActive} = useOrganizationList();

    if (!user) return

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            if (createOrganization) {
                const new_org = await createOrganization({name: orgName});
                await setActive({organization: new_org.id})
            }
        } catch (err) {
            console.log(err)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <Input value={orgName} onChange={e => setOrgName(e.target.value)}/>
        </form>
    );
};

export default CreateOrganization;