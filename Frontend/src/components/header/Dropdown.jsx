import React, { useState, useEffect } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { CgProfile, CgSupport, CgLogOut } from 'react-icons/cg'; // Example icons
import { Link, useNavigate } from 'react-router-dom'; // Adjust based on your router
import { routes } from '../../routes/routes';
import { useAtom } from 'jotai';
import { userIdAtom, accessTokenAtom } from '../../state/authAtom';
import useTokenExpiry from '../utils/handleRefresh';
import avatar from '../Images/avatar.jpg';
const MyDropdown = ({ user }) => {
  const { handleTokenExpiry } = useTokenExpiry();
  const [id] = useAtom(userIdAtom);
  const [access_token, setAccessToken] = useAtom(accessTokenAtom);
  const [userDetails, setUserDetails] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserDetails = async () => {
      // Ensure access_token is available
      const token =  localStorage.getItem('access_token');
      
      if (!token) {
        setError('No access token found');
        return;
      }

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/profile/${id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          console.log('Token expired or invalid. Trying to refresh...');
          handleTokenExpiry(); // Handle the refresh token logic
          return; // Prevent fetching data if token is invalid
        }

        const data = await response.json();
        setUserDetails(data);
      } catch (error) {
        console.error('Error fetching user details:', error);
        setError('Failed to load user profile');
      }
    };

    fetchUserDetails();
  }, [id, access_token]); // Add dependencies here to re-fetch data if id or access_token changes

  const control_menus = [
    {
      href: `/profile/${id}`,
      title: 'Profile',
      icon: <CgProfile className="text-2xl text-primary" />,
    },
    {
      href: '/support',
      title: 'Help & Support',
      icon: <CgSupport className="text-2xl text-primary" />,
    },
    {
      href: routes.logout,
      title: 'Logout',
      icon: <CgLogOut className="text-2xl text-primary" />,
    },
  ];

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <div className="rounded-full border relative hover:cursor-pointer">
         {userDetails?.avatar?(  <img
            src={`http://localhost:8000${userDetails?.avatar}`}
            alt="Profile Pic"
            className="rounded-full h-10 w-10"
            height={40}
            width={40}
          />):(  <img
            src={avatar}
            alt="Profile Pic"
            className="rounded-full h-10 w-10"
            height={40}
            width={40}
          />)}
        
        </div>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Content className="me-8 w-[350px] bg-white shadow-xl rounded-xl p-4 mt-3 z-20">
        <div className="flex space-x-4 py-3 hover:border-none">
        {userDetails?.avatar?(  <img
            src={`http://localhost:8000${userDetails?.avatar}`}
            alt="Profile Pic"
            className="rounded-full h-10 w-10"
            height={40}
            width={40}
          />):(  <img
            src={avatar}
            alt="Profile Pic"
            className="rounded-full h-10 w-10"
            height={40}
            width={40}
          />)}
          <h4 className="text-lg my-auto font-semibold text-black">
            Hi, {userDetails?.firstname} {userDetails?.lastname}
          </h4>
        </div>

        <hr />
        <div className="mt-2">
          {control_menus.map((menu, index) => (
            <DropdownMenuPrimitive.Item
              asChild
              key={index}
              onSelect={() => navigate(menu.href)}
              className="border border-white"
            >
              <div className="flex space-x-4 py-3 cursor-pointer transition-all duration-300 transform hover:bg-green-100 hover:pl-2">
                <span className="text-green-500"> {menu.icon}</span>
                <h4 className="text-lg">{menu.title}</h4>
              </div>
            </DropdownMenuPrimitive.Item>
          ))}
        </div>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Root>
  );
};

export default MyDropdown;
