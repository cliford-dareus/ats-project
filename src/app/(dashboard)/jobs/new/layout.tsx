import React from 'react';

const Layout = ({children}: {children: React.ReactNode}) => {
    return (
        <div className="container mx-auto py-6 px-4">
            <div className='max-w-2xl mx-auto'>
                {children}
            </div>
        </div>
    );
};

export default Layout;
