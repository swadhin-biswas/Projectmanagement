import React, { useState, useEffect } from 'react';
import authAPI from '../../lib/authAPI'; // Adjust the import based on your project structure

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const userData = await authAPI.getProfile();
        setProfile(userData);
        setFormData({
          fullName: userData.fullName,
          email: userData.email,
          department: userData.department || ''
        });
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load profile data');
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await authAPI.updateProfile(formData);
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to update profile');
      setIsLoading(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-blue-900 text-white p-6">
            <h1 className="text-2xl font-bold">Profile</h1>
            <p className="text-blue-100">Manage your account information</p>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
                {successMessage}
              </div>
            )}

            {!isEditing ? (
              <div>
                <div className="mb-8 flex items-center">
                  <div className="bg-blue-900 text-white rounded-full h-20 w-20 flex items-center justify-center text-2xl font-bold mr-4">
                    {profile?.fullName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{profile?.fullName}</h2>
                    <p className="text-gray-600">{profile?.email}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="border-b border-gray-200 pb-2">
                    <p className="text-sm text-gray-500 font-medium">Department</p>
                    <p className="text-gray-800">{profile?.department || 'Not specified'}</p>
                  </div>
                  <div className="border-b border-gray-200 pb-2">
                    <p className="text-sm text-gray-500 font-medium">Role</p>
                    <p className="text-gray-800">{profile?.role || 'Not specified'}</p>
                  </div>
                  <div className="border-b border-gray-200 pb-2">
                    <p className="text-sm text-gray-500 font-medium">Account Status</p>
                    <p className="text-gray-800">
                      {profile?.isApproved ? (
                        <span className="text-green-600">Approved</span>
                      ) : (
                        <span className="text-red-600">Pending Approval</span>
                      )}
                    </p>
                  </div>
                  <div className="border-b border-gray-200 pb-2">
                    <p className="text-sm text-gray-500 font-medium">Joined</p>
                    <p className="text-gray-800">
                      {new Date(profile?.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-4 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-900 focus:border-blue-900"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-900 focus:border-blue-900"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                      Department
                    </label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-900 focus:border-blue-900"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;