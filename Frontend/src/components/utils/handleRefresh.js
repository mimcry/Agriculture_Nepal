import { useAtom } from 'jotai';
import { isLoggedInAtom } from '../../state/authAtom';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes/routes';
import toast from 'react-hot-toast';
const useTokenExpiry = () => {
  const navigate = useNavigate();
  const [_, setAuthenticated] = useAtom(isLoggedInAtom);

  // Handle token expiry
  const handleTokenExpiry = async () => {
    console.log('Token expired or invalid. Please log in again.');
    const res = await handleRefresh();
    if (res && res.accessToken) {
      console.log('Access token refreshed successfully:', res.accessToken);
      localStorage.setItem('access_token', res.accessToken);
    } else {
      console.log('Refresh token expired or invalid. Logging out...');
      handleLogout();
      toast.error('Session expired. Please log in again.');
    }
  };

  // Handle refresh token request
  const handleRefresh = async () => {
    try {
      const refresh_token = localStorage.getItem('refresh_token');
      const response = await fetch('http://localhost:8000/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refresh_token }),
      });

      // Assuming the response contains the new accessToken
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate(routes.login);
  };

  return { handleTokenExpiry, handleLogout };
};

export default useTokenExpiry;
