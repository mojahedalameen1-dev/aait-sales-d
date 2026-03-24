import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_URL } from '../utils/apiConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(API_URL('/api/auth/me'), {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                } else {
                    // Token expired or invalid
                    logout();
                }
            } catch (err) {
                console.error('Verify token error:', err);
                setError('حدث خطأ في الاتصال بالخادم');
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    const login = async (username, password) => {
        setError(null);
        try {
            const response = await fetch(API_URL('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'فشل تسجيل الدخول');
            }

            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser(data.user);
            return { success: true, isAdmin: data.user.isAdmin };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const apiFetch = async (url, options = {}) => {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
            logout();
            throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
        }

        return response;
    };

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
    };

    const value = {
        user,
        token,
        loading,
        error,
        login,
        logout,
        apiFetch,
        updateUser,
        isAdmin: user?.isAdmin || user?.role === 'admin' || false,
        isSalesLead: user?.role === 'salesLead' || false,
        role: user?.role || 'developer'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
