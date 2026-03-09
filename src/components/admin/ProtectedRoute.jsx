import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute
 * Guards all child routes by checking for a valid admin session in localStorage.
 * If no session is found, redirects to /admin/login and remembers the intended path.
 */
const ProtectedRoute = () => {
    const location = useLocation();
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');

    const isAuthenticated = token && user;

    if (!isAuthenticated) {
        // Redirect to login, preserving the page they tried to access
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
