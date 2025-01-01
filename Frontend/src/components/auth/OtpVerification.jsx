import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { userEmail } from '../../state/authAtom';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes/routes';
const OtpVerification = () => {
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isTimerActive, setIsTimerActive] = useState(true);
const [email] = useAtom(userEmail);
  const navigate = useNavigate();
console.log("user email",email);
  useEffect(() => {
    if (!isTimerActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setIsTimerActive(false);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive]);

  const handleChange = (element, index) => {
    if (isNaN(Number(element.value))) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    if (element.nextSibling && element.value !== '') {
      element.nextSibling.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    console.log('Submitted OTP:', enteredOtp);
  
    // Send OTP to the backend for verification
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email:email, // Replace with actual email from user data
          otp: enteredOtp,
        }),
      });
  
      const data = await response.json();
  
      if (response.status === 200) {
       toast.success('OTP verified successfully');
        navigate(routes.login);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('An error occurred while verifying OTP');
    }
  };
  

  const handleResend = async () => {
    setOtp(Array(6).fill(''));
    setTimeLeft(600);
    setIsTimerActive(true); 
  
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email, // Send the email of the user to the backend
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        toast.success('OTP resent successfully');
      } else {
        toast.error(data.error || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      toast.error('An error occurred while resending OTP');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br py flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Verify Your Account</h2>
        <p className="text-center text-gray-600 mb-6">Enter the 6-digit code sent to your phone</p>
        
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between mb-6">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                className="w-12 h-12 border-2 rounded-lg text-center text-xl font-bold text-gray-700 focus:border-blue-500 focus:outline-none"
              />
            ))}
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-br from-green-500 to-green-800 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition duration-300"
          >
            Verify
          </button>
        </form>
        
        <div className="mt-6 text-center">
          {isTimerActive ? (
            <p className="text-gray-600">
              Time remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="text-blue-600 font-semibold hover:text-blue-800"
            >
              Resend OTP
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
