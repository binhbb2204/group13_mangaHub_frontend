import React, { useState } from 'react';
import axiosInstance from '../utils/api';
import { 
  Lock, ShieldCheck, Save, AlertCircle, CheckCircle2, 
  LayoutGrid, Eye, EyeOff, Loader2, User 
} from 'lucide-react';

const Settings = () => {
  // Navigation and UI State
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [showPassword, setShowPassword] = useState({}); 

  // Store original values to detect changes
  const [originalUser, setOriginalUser] = useState({
    username: localStorage.getItem('username') || '',
    email: localStorage.getItem('email') || ''
  });

  // Form State Management
  const [formData, setFormData] = useState({
    username: originalUser.username,
    email: originalUser.email,
    current_password: '', 
    new_password: '',     
    confirm_password: ''  
  });

  // Change Detection Logic
  const hasChanges = 
    formData.username !== originalUser.username || 
    formData.email !== originalUser.email;

  // Input Handlers
  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (status.message) setStatus({ type: '', message: '' });
  };

  const handleCancel = () => {
    setFormData(prev => ({
      ...prev,
      username: originalUser.username,
      email: originalUser.email
    }));
    setStatus({ type: '', message: '' });
  };

  // API Request Helper
  const apiCall = async (endpoint, payload) => {
    return axiosInstance.post(
      `/auth/${endpoint}`, 
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  };

  // Profile Update Handler
  const handleSaveProfile = async () => {
    setLoading(true);
    setStatus({ type: '', message: '' });
    
    let successCount = 0;
    let errors = [];

    try {
      // Update Username
      if (formData.username !== originalUser.username) {
        try {
          const res = await apiCall('update-username', { new_username: formData.username });
          if (res.data.username) {
            localStorage.setItem('username', res.data.username);
            setOriginalUser(prev => ({ ...prev, username: res.data.username }));
            successCount++;
          }
        } catch (err) {
          errors.push(err.response?.data?.error || "Failed to update username");
        }
      }

      // Update Email
      if (formData.email !== originalUser.email) {
        try {
          const res = await apiCall('update-email', { new_email: formData.email });
          if (res.data.email) {
            localStorage.setItem('email', res.data.email);
            setOriginalUser(prev => ({ ...prev, email: res.data.email }));
            successCount++;
          }
        } catch (err) {
          errors.push(err.response?.data?.error || "Failed to update email");
        }
      }

      // Final Status Check
      if (errors.length > 0) {
        setStatus({ type: 'error', message: errors.join(', ') });
      } else if (successCount > 0) {
        setStatus({ type: 'success', message: 'Profile updated successfully!' });
        window.dispatchEvent(new Event("storage"));
      } else {
        setStatus({ type: '', message: 'No changes to save.' });
      }

    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  // Password Update Handler
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      setStatus({ type: 'error', message: "New passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      await apiCall('change-password', { 
        current_password: formData.current_password, 
        new_password: formData.new_password 
      });
      setStatus({ type: 'success', message: 'Password changed successfully!' });
      setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || "Failed to change password" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your profile and security preferences.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          
          {/* Navigation Sidebar */}
          <div className="md:col-span-1 space-y-2">
            <button 
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
                activeTab === 'account' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutGrid size={20} />
              <span>Account</span>
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
                activeTab === 'security' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShieldCheck size={20} />
              <span>Security</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Status Notifications */}
            {status.message && (
              <div className={`p-4 rounded-xl flex items-start gap-3 animate-slide-in ${
                status.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <p className="font-medium text-sm">{status.message}</p>
              </div>
            )}

            {/* Account Settings Tab */}
            {activeTab === 'account' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                
                {/* Profile Header */}
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Profile Information</h2>
                    <p className="text-sm text-gray-500">Update your account details and public profile</p>
                  </div>
                </div>

                {/* Profile Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Display Name Input */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 font-medium"
                      placeholder="Enter your username"
                    />
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 font-medium"
                      placeholder="Enter your email"
                    />
                  </div>

                </div>

                {/* Profile Actions */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={loading || !hasChanges}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading || !hasChanges}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Security Settings Tab */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                {/* Security Header */}
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
                    <p className="text-sm text-gray-500">Secure your account with a strong password</p>
                  </div>
                </div>

                {/* Password Form */}
                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  {/* Current Password Field */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPassword.current ? "text" : "password"}
                        name="current_password"
                        value={formData.current_password}
                        onChange={handleChange}
                        className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Current password"
                      />
                      <button type="button" onClick={() => togglePasswordVisibility('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.new ? "text" : "password"}
                          name="new_password"
                          value={formData.new_password}
                          onChange={handleChange}
                          className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Min 6 characters"
                        />
                        <button type="button" onClick={() => togglePasswordVisibility('new')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
                      <input
                        type="password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                          formData.confirm_password && formData.new_password !== formData.confirm_password
                            ? 'border-red-300 focus:ring-red-500 text-red-900'
                            : 'border-slate-200 focus:ring-indigo-500'
                        }`}
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !formData.current_password || !formData.new_password}
                      className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;