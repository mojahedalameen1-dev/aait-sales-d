import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { user, loading, isAdmin } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0A0F1E]">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        // If we reach here and there's no user, it means something in App.jsx 
        // didn't catch it, or it's a fallthrough. We redirect to login to be safe.
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin) {
        // If user is not admin and route is adminOnly, show a custom unauthorized message or redirect
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">غير مصرح لك بالوصول</h2>
                <p className="text-gray-400">هذه المنطقة مخصصة للمشرفين فقط.</p>
                <button 
                    onClick={() => window.location.href = '/'} 
                    className="mt-6 btn-primary"
                >
                    العودة للرئيسية
                </button>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
