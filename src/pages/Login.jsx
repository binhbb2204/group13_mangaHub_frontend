import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import axiosInstance from '../utils/api';
import mangaImg from '../img/manga.png'; 

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const SIDE_IMAGE_URL = mangaImg; 
  
  const [formData, setFormData] = useState({
    identifier: '', 
    password: '',
    rememberMe: false
  });
  
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const isEmail = formData.identifier.includes('@');
    const loginPayload = {
      password: formData.password,
      [isEmail ? 'email' : 'username']: formData.identifier
    };

    try {
      const baseURL = axiosInstance.defaults.baseURL || '';
      const response = await axios.post(`${baseURL}/auth/login`, loginPayload);
      const data = response.data;

      if (data.error || (data.details && !data.token)) {
        throw { response: { data: { details: data.details, error: data.error } } };
      }

      if (!data.token) throw new Error('Login failed: No token received');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('username', data.username);
      localStorage.setItem('email', data.email);
      
      if (formData.rememberMe) localStorage.setItem('rememberMe', 'true');

      console.log('Login successful:', data);
      navigate('/');
      
    } catch (err) {
      let errorMessage = 'Login failed';
      if (err.response?.data?.details) errorMessage = err.response.data.details;
      else if (err.response?.data?.error) errorMessage = err.response.data.error;
      else if (err.response?.data?.message) errorMessage = err.response.data.message;
      else if (err.message) errorMessage = err.message;
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-10 pt-24 bg-white">
      
      {error && (
        <div className="fixed top-24 right-4 z-50 animate-slide-in">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg max-w-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button onClick={() => setError('')} className="ml-4 flex-shrink-0 text-red-500 hover:text-red-700">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card - Matched Height 600px */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto md:h-[600px] border border-gray-100">
        
        {/* Left Side: Blue/Image Panel */}
        <div className={`w-full md:w-1/2 relative h-40 md:h-full overflow-hidden flex flex-col justify-center items-center text-center p-8 ${SIDE_IMAGE_URL ? 'bg-transparent' : 'bg-blue-700'}`}>
           {SIDE_IMAGE_URL && (
             <>
               <img 
                 src={SIDE_IMAGE_URL} 
                 alt="Manga Hub" 
                 className="absolute inset-0 w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-black opacity-50"></div>
             </>
           )}
           <div className="relative z-10 text-white flex flex-col items-center justify-center h-full">
             <h1 className="text-3xl font-bold mb-2 drop-shadow-md">Manga Hub</h1>
             <p className="text-blue-100 text-base font-light drop-shadow-sm">Your Portal to a World of Manga.</p>
           </div>
        </div>

        {/* Right Side: Form - justified start with padding-top-12 */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-start pt-12 bg-white">
          <div className="max-w-xs mx-auto w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Join Manga Hub</h2>
            <p className="text-gray-500 text-center mb-6 text-xs">Login to your account.</p>

            {/* Tab Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <Link 
                to="/register" 
                className="flex-1 text-center py-2 rounded-md text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Register
              </Link>
              <div 
                className="flex-1 text-center py-2 rounded-md text-xs font-bold bg-white text-gray-900 shadow-sm cursor-default"
              >
                Login
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide">Username or Email</label>
                <input
                  type="text"
                  name="identifier" 
                  value={formData.identifier}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400 text-sm"
                  placeholder="Enter email or username"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400 text-sm"
                    placeholder="Enter password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-500 font-medium">Remember me</span>
                </label>
                <a href="#" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Forgot Password?</a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed mt-6 text-sm"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;