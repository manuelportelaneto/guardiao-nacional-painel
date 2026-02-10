
import React from 'react';
import { Outlet } from 'react-router-dom';
import CommandLayout from '../layout/CommandLayout';

const AdminDashboard: React.FC = () => {
    return (
        <CommandLayout>
            <Outlet />
        </CommandLayout>
    );
};

export default AdminDashboard;
