import AuthDropdown from '@/components/auth-dropdown';
import {User} from '@clerk/nextjs/server';
import React from 'react';

type Props = {
    user: User | null;
    orgId: string | null;
};

const Header = ({ user, orgId }: Props) => {
    return (
        <div className="flex flex-col">
            <div className="bg-gray-800 text-white p-4">
                <h1 className="text-2xl font-bold">My Website</h1>
            </div>
            <AuthDropdown user={user} orgId={orgId} />
        </div>
    );
};

export default Header;
