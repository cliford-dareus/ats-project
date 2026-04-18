import AuthDropdown from '@/components/auth-dropdown';
import {User} from '@clerk/nextjs/server';
import React from 'react';

type Props = {
    user: User | null;
};

const Header = ({user}: Props) => {
    return (
        <div className="flex flex-col">
            <div className="bg-gray-800 text-white p-4">
                <h1 className="text-2xl font-bold">My Website</h1>
            </div>
            <AuthDropdown user={user}/>
        </div>
    );
};

export default Header;
