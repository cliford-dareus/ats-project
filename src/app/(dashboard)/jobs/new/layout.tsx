import React from 'react';

const Layout = ({children}: {children: React.ReactNode}) => {
    return (
        <div className="p-4 w-full max-w-xl mx-auto">
            {children}
        </div>
    );
};

export default Layout;