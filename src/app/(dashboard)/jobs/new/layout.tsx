import React from 'react';

const Layout = ({children}: {children: React.ReactNode}) => {
    return (
        <div className="container mx-auto">
            <div className='max-w-7xl mx-auto h-[calc(100vh_-_100px)] overflow-hidden'>
                {children}
            </div>
        </div>
    );
};

export default Layout;
