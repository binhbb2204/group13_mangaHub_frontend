import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/api';
import { 
  Lock, ShieldCheck, Save, AlertCircle, CheckCircle2, 
  LayoutGrid, Eye, EyeOff, Loader2, User, Wifi, WifiOff,
  Server, Activity, BarChart3, Radio, MessageSquare
} from 'lucide-react';

const Settings = () => {
  // Navigation and UI State
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [showPassword, setShowPassword] = useState({}); 

  // Sync State
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState(null);

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

  const hasChanges = 
    formData.username !== originalUser.username || 
    formData.email !== originalUser.email;

  // Fetch Sync Status
  const fetchSyncStatus = async () => {
    try {
      setSyncLoading(true);
      const response = await axiosInstance.get('/sync/status');
      setSyncStatus(response.data);
      
      if (response.data?.payload?.connection_status === 'connected' && !connectionDetails) {
        setConnectionDetails({
          session_id: response.data.payload.session_id,
          server_address: response.data.payload.server_address,
          connected_at: new Date().toISOString(),
          device_name: window.location.hostname || 'web-client',
          device_type: 'web',
          username: localStorage.getItem('username') || 'User'
        });
      }
    } catch (err) {
      setSyncStatus({
        type: 'status_response',
        payload: { connection_status: 'disconnected' }
      });
      setConnectionDetails(null);
    } finally {
      setSyncLoading(false);
    }
  };

  // Connect to Sync Server
  const handleConnectSync = async () => {
    try {
      setConnecting(true);
      setStatus({ type: '', message: '' });
      
      const hostname = window.location.hostname || 'web-client';
      const response = await axiosInstance.post('/sync/connect', {
        device_type: 'web',
        device_name: hostname
      });
      
      setConnectionDetails({
        session_id: response.data.session_id,
        server_address: response.data.server_address,
        connected_at: response.data.connected_at || new Date().toISOString(),
        device_name: hostname,
        device_type: 'web',
        username: localStorage.getItem('username') || 'User'
      });
      
      setStatus({ type: 'success', message: 'Connected to sync server successfully!' });
      setTimeout(() => fetchSyncStatus(), 500);
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.error || 'Failed to connect' 
      });
    } finally {
      setConnecting(false);
    }
  };

  // AUTO-CONNECT LOGIC
  useEffect(() => {
    if (activeTab === 'sync') {
      fetchSyncStatus();
      // Auto-trigger connection if not connected and not currently connecting
      if (!connectionDetails && !connecting) {
        handleConnectSync();
      }

      const interval = setInterval(fetchSyncStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleDisconnectSync = async () => {
    try {
      setConnecting(true);
      await axiosInstance.post('/sync/disconnect');
      setConnectionDetails(null);
      setSyncStatus(null);
      setStatus({ type: 'success', message: 'Disconnected' });
      setTimeout(() => fetchSyncStatus(), 500);
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to disconnect' });
    } finally {
      setConnecting(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

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

  const apiCall = async (endpoint, payload) => {
    return axiosInstance.post(`/auth/${endpoint}`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setStatus({ type: '', message: '' });
    let successCount = 0;
    let errors = [];

    try {
      if (formData.username !== originalUser.username) {
        try {
          const res = await apiCall('update-username', { new_username: formData.username });
          if (res.data.username) {
            localStorage.setItem('username', res.data.username);
            setOriginalUser(prev => ({ ...prev, username: res.data.username }));
            successCount++;
          }
        } catch (err) {
          errors.push("Failed to update username");
        }
      }

      if (formData.email !== originalUser.email) {
        try {
          const res = await apiCall('update-email', { new_email: formData.email });
          if (res.data.email) {
            localStorage.setItem('email', res.data.email);
            setOriginalUser(prev => ({ ...prev, email: res.data.email }));
            successCount++;
          }
        } catch (err) {
          errors.push("Failed to update email");
        }
      }

      if (errors.length > 0) {
        setStatus({ type: 'error', message: errors.join(', ') });
      } else if (successCount > 0) {
        setStatus({ type: 'success', message: 'Profile updated!' });
        window.dispatchEvent(new Event("storage"));
      }
    } catch (err) {
      setStatus({ type: 'error', message: "An error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      setStatus({ type: 'error', message: "Passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      await apiCall('change-password', { 
        current_password: formData.current_password, 
        new_password: formData.new_password 
      });
      setStatus({ type: 'success', message: 'Password changed!' });
      setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch (err) {
      setStatus({ type: 'error', message: "Failed to change password" });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = connectionDetails !== null;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Settings</h1>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1 space-y-2">
            <button onClick={() => setActiveTab('account')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'account' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-600'}`}><LayoutGrid size={20} /><span>Account</span></button>
            <button onClick={() => setActiveTab('security')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-600'}`}><ShieldCheck size={20} /><span>Security</span></button>
            <button onClick={() => setActiveTab('sync')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'sync' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-600'}`}><Wifi size={20} /><span>Sync</span></button>
          </div>

          <div className="md:col-span-3 space-y-6">
            {status.message && (
              <div className={`p-4 rounded-xl flex items-start gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} border`}>
                <p className="font-medium text-sm">{status.message}</p>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="bg-white rounded-2xl border p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b"><User size={20} /><h2 className="text-lg font-bold">Profile</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-bold mb-2">Name</label><input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" /></div>
                  <div><label className="block text-sm font-bold mb-2">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" /></div>
                </div>
                <div className="mt-8 pt-6 flex justify-end gap-3">
                  <button onClick={handleCancel} disabled={loading || !hasChanges} className="px-6 py-2.5 rounded-lg text-sm font-bold bg-slate-100">Cancel</button>
                  <button onClick={handleSaveProfile} disabled={loading || !hasChanges} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 flex items-center gap-2">{loading && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl border p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b"><Lock size={20} /><h2 className="text-lg font-bold">Security</h2></div>
                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  <input type={showPassword.current ? "text" : "password"} name="current_password" value={formData.current_password} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" placeholder="Current Password" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type={showPassword.new ? "text" : "password"} name="new_password" value={formData.new_password} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" placeholder="New Password" />
                    <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg" placeholder="Confirm Password" />
                  </div>
                  <div className="pt-4 flex justify-end"><button type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600">Update Password</button></div>
                </form>
              </div>
            )}

            {activeTab === 'sync' && (
              <div className="bg-white rounded-2xl border p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b"><Wifi size={20} /><div><h2 className="text-lg font-bold">TCP Sync</h2><p className="text-sm text-gray-500">Auto-connecting...</p></div></div>

                {(connecting || (syncLoading && !connectionDetails)) ? (
                  <div className="flex flex-col items-center py-12 gap-4"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /><p className="text-sm text-gray-500">Connecting...</p></div>
                ) : isConnected ? (
                  <>
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-900 font-bold mb-2">✓ Connected</p>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>Server: <span className="font-mono">{connectionDetails.server_address}</span></p>
                        <p>Session ID: <span className="font-mono text-xs">{connectionDetails.session_id}</span></p>
                      </div>
                    </div>

                    {syncStatus?.payload && (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="p-4 bg-indigo-50 rounded-lg text-center"><Radio className="w-5 h-5 text-indigo-600 mx-auto mb-2" /><p className="text-2xl font-bold">{syncStatus.payload.devices_online || 0}</p><p className="text-xs">Online</p></div>
                          <div className="p-4 bg-blue-50 rounded-lg text-center"><MessageSquare className="w-5 h-5 text-blue-600 mx-auto mb-2" /><p className="text-2xl font-bold">{syncStatus.payload.messages_sent || 0}</p><p className="text-xs">Sent</p></div>
                          <div className="p-4 bg-purple-50 rounded-lg text-center"><MessageSquare className="w-5 h-5 text-purple-600 mx-auto mb-2" /><p className="text-2xl font-bold">{syncStatus.payload.messages_received || 0}</p><p className="text-xs">Received</p></div>
                          <div className="p-4 bg-green-50 rounded-lg text-center"><BarChart3 className="w-5 h-5 text-green-600 mx-auto mb-2" /><p className="text-sm font-bold">{syncStatus.payload.network_quality || 'Good'}</p><p className="text-xs">{syncStatus.payload.rtt_ms}ms</p></div>
                        </div>

                        {/* RESTORED LAST SYNC BLOCK */}
                        {syncStatus.payload.last_sync && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
                            <p className="text-sm font-bold text-blue-900 mb-2">Last Sync:</p>
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">{syncStatus.payload.last_sync.manga_title}</span>
                              {' - '}Chapter {syncStatus.payload.last_sync.chapter}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              {formatTimestamp(syncStatus.payload.last_sync.timestamp)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-end"><button onClick={handleDisconnectSync} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 flex items-center gap-2"><WifiOff size={18} /> Disconnect</button></div>
                  </>
                ) : (
                  <div className="text-center py-12"><WifiOff className="w-8 h-8 text-gray-400 mx-auto mb-4" /><h3 className="font-bold">Disconnected</h3><button onClick={handleConnectSync} className="mt-4 px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold">Reconnect</button></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;