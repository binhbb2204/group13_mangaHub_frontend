import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook, FaGithub } from 'react-icons/fa';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
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
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:8080/auth/login', {
        username: formData.username,
        password: formData.password,
      });

      const data = response.data;
      
      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('username', data.username);
      localStorage.setItem('email', data.email);
      
      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      console.log('Login successful:', data);
      
      // Redirect to home page
      navigate('/');
      
    } catch (err) {
      // Handle error from backend
      let errorMessage = 'Login failed';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Floating Error Toast - Top Right */}
      {error && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
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
              <button
                onClick={() => setError('')}
                className="ml-4 flex-shrink-0 text-red-500 hover:text-red-700"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden flex">
        {/* Blue Panel - Left Side */}
        <div className="w-1/2 bg-gradient-to-br from-blue-500 to-blue-700 flex flex-col items-center justify-center text-white p-12 rounded-r-3xl">
          <h1 className="text-5xl font-bold mb-4">MANGA HUB</h1>
          <p className="text-xl text-center">Your gateway to manga universe</p>
        </div>

        {/* Login Form - Right Side */}
        <div className="w-1/2 flex flex-col items-center justify-center p-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-2">Welcome Back</h2>
          <p className="text-gray-500 mb-8">Sign in to continue</p>

          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
            <div className="relative">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-gray-300 w-full"></div>
              <span className="absolute bg-white px-4 text-gray-500 text-sm">Or continue with</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                className="flex items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FcGoogle size={24} />
              </button>
              <button
                type="button"
                className="flex items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaFacebook size={24} className="text-blue-600" />
              </button>
              <button
                type="button"
                className="flex items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaGithub size={24} />
              </button>
            </div>

            <p className="text-center text-gray-600 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;