'use client';

import React, {useEffect} from 'react';
import {useOrganization, useOrganizationList} from '@clerk/nextjs'
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {Check, ChevronsUpDown} from "lucide-react";
import {cn} from "@/lib/utils";
import {OrganizationMembershipResource} from "@clerk/types";

const OrgMembersParams = {
    memberships: {
        pageSize: 2,
        keepPreviousData: true,
    },
};

const OrganizationSwitcher = () => {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState('');
    const {isLoaded: loaded, memberships} = useOrganization(OrgMembersParams);
    const { isLoaded, setActive, userMemberships } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });

    useEffect(() => {
        if(loaded && memberships !== null) {
            setValue((memberships.data as OrganizationMembershipResource[])[0]?.organization.name as string);
        }
    }, [loaded, memberships]);

    if (!isLoaded) {
        return <p>Loading</p>
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    // variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="bg-transparent gap-4 shadow-none text-black hover:bg-muted"
                >
                    {value
                        ? userMemberships.data.find((framework) => framework.organization.name === value)?.organization.name
                        : "Select framework..."}
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search organizations..." />
                    <CommandList>
                        <CommandEmpty>No framework found.</CommandEmpty>
                        <CommandGroup>
                            {userMemberships.data.map((framework) => (
                                <CommandItem
                                    key={framework.id}
                                    value={framework.organization.name}
                                    onSelect={(currentValue) => {
                                        setValue(currentValue)
                                        setActive({ organization: framework.organization.id})
                                        setOpen(false)
                                    }}
                                >
                                    {framework.organization.name}
                                    <Check
                                        className={cn(
                                            "ml-auto",
                                            value === framework.organization.name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default OrganizationSwitcher;