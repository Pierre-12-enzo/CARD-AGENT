// components/SocketListener.jsx
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SocketListener = () => {
    const { user, socket } = useAuth();

    useEffect(() => {
        if (!socket || !user) return;

        // 🔥 License revoked - kick out
        const handleLicenseRevoked = (data) => {
            localStorage.removeItem('capmis_token');
            window.location.href = '/login?reason=license_revoked';
        };

        // 🔥 New company registration (super admin only)
        const handleNewRegistration = (data) => {
            if (user.role === 'super_admin') {
                toast.success(`${data.companyName} just registered!`, {
                    duration: 8000,
                    icon: '🆕',
                    style: {
                        borderRadius: '12px',
                        background: '#0F172A',
                        color: '#fff',
                    },
                });
            }
        };

        socket.on('license:revoked', handleLicenseRevoked);
        socket.on('company:new-registration', handleNewRegistration);

        return () => {
            socket.off('license:revoked', handleLicenseRevoked);
            socket.off('company:new-registration', handleNewRegistration);
        };
    }, [socket, user]);

    return null;
};

export default SocketListener;