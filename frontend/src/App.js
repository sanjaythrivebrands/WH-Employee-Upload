import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [formData, setFormData] = useState({
    employeeName: '',
    mobileNumber: '',
    dateOfBirth: '',
    uanNumber: '',
    email: '',
    address: ''
  });

  const [files, setFiles] = useState({
    aadhaarCard: null,
    panCard: null,
    bankPassbook: null,
    additionalDocs: []
  });

  const [filePreviews, setFilePreviews] = useState({
    aadhaarCard: null,
    panCard: null,
    bankPassbook: null,
    additionalDocs: []
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileChange = (fieldName, e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (fieldName === 'additionalDocs') {
      setFiles(prev => ({
        ...prev,
        additionalDocs: [...prev.additionalDocs, ...selectedFiles]
      }));
      setFilePreviews(prev => ({
        ...prev,
        additionalDocs: [
          ...prev.additionalDocs,
          ...selectedFiles.map(file => ({
            name: file.name,
            size: file.size
          }))
        ]
      }));
    } else {
      const file = selectedFiles[0];
      setFiles(prev => ({
        ...prev,
        [fieldName]: file
      }));
      setFilePreviews(prev => ({
        ...prev,
        [fieldName]: {
          name: file.name,
          size: file.size
        }
      }));
    }
  };

  const removeFile = (fieldName, index = null) => {
    if (fieldName === 'additionalDocs' && index !== null) {
      setFiles(prev => ({
        ...prev,
        additionalDocs: prev.additionalDocs.filter((_, i) => i !== index)
      }));
      setFilePreviews(prev => ({
        ...prev,
        additionalDocs: prev.additionalDocs.filter((_, i) => i !== index)
      }));
    } else {
      setFiles(prev => ({
        ...prev,
        [fieldName]: null
      }));
      setFilePreviews(prev => ({
        ...prev,
        [fieldName]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.employeeName || !formData.mobileNumber || !formData.dateOfBirth) {
      setUploadStatus({
        type: 'error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    // Check if at least one file is uploaded
    const hasFiles = files.aadhaarCard || files.panCard || files.bankPassbook || files.additionalDocs.length > 0;
    if (!hasFiles) {
      setUploadStatus({
        type: 'error',
        message: 'Please upload at least one document'
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const formDataToSend = new FormData();
      
      // Append form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Append files
      if (files.aadhaarCard) {
        formDataToSend.append('aadhaarCard', files.aadhaarCard);
      }
      if (files.panCard) {
        formDataToSend.append('panCard', files.panCard);
      }
      if (files.bankPassbook) {
        formDataToSend.append('bankPassbook', files.bankPassbook);
      }
      files.additionalDocs.forEach(file => {
        formDataToSend.append('additionalDocs', file);
      });

      const response = await axios.post(`${API_BASE_URL}/api/upload`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadStatus({
        type: 'success',
        message: response.data.message || 'Upload successful!'
      });

      // Reset form
      setFormData({
        employeeName: '',
        mobileNumber: '',
        dateOfBirth: '',
        uanNumber: '',
        email: '',
        address: ''
      });
      setFiles({
        aadhaarCard: null,
        panCard: null,
        bankPassbook: null,
        additionalDocs: []
      });
      setFilePreviews({
        aadhaarCard: null,
        panCard: null,
        bankPassbook: null,
        additionalDocs: []
      });

      // Clear file inputs
      document.querySelectorAll('input[type="file"]').forEach(input => {
        input.value = '';
      });

    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.error || error.message || 'An error occurred during upload'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            Employee Document Upload Portal
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Upload employee details and documents securely
          </p>

          {uploadStatus && (
            <div className={`mb-6 p-4 rounded-lg ${
              uploadStatus.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              {uploadStatus.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Name */}
            <div>
              <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-2">
                Employee Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="employeeName"
                name="employeeName"
                value={formData.employeeName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter employee name"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="mobileNumber"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter mobile number"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* UAN Number */}
            <div>
              <label htmlFor="uanNumber" className="block text-sm font-medium text-gray-700 mb-2">
                UAN Number
              </label>
              <input
                type="text"
                id="uanNumber"
                name="uanNumber"
                value={formData.uanNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter UAN number (optional)"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address (optional)"
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter address (optional)"
              />
            </div>

            {/* Document Uploads Section */}
            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Document Uploads</h2>
              
              {/* Aadhaar Card */}
              <div className="mb-4">
                <label htmlFor="aadhaarCard" className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhaar Card (PDF/Image)
                </label>
                <input
                  type="file"
                  id="aadhaarCard"
                  name="aadhaarCard"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('aadhaarCard', e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {filePreviews.aadhaarCard && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-700">{filePreviews.aadhaarCard.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({formatFileSize(filePreviews.aadhaarCard.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('aadhaarCard')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* PAN Card */}
              <div className="mb-4">
                <label htmlFor="panCard" className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Card (PDF/Image)
                </label>
                <input
                  type="file"
                  id="panCard"
                  name="panCard"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('panCard', e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {filePreviews.panCard && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-700">{filePreviews.panCard.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({formatFileSize(filePreviews.panCard.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('panCard')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Bank Passbook */}
              <div className="mb-4">
                <label htmlFor="bankPassbook" className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Passbook (PDF/Image)
                </label>
                <input
                  type="file"
                  id="bankPassbook"
                  name="bankPassbook"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('bankPassbook', e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {filePreviews.bankPassbook && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-700">{filePreviews.bankPassbook.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({formatFileSize(filePreviews.bankPassbook.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('bankPassbook')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Additional Documents */}
              <div className="mb-4">
                <label htmlFor="additionalDocs" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Documents (PDF/Image) - Multiple files allowed
                </label>
                <input
                  type="file"
                  id="additionalDocs"
                  name="additionalDocs"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={(e) => handleFileChange('additionalDocs', e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {filePreviews.additionalDocs.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {filePreviews.additionalDocs.map((preview, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-700">{preview.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({formatFileSize(preview.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile('additionalDocs', index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isUploading}
                className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                  isUploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }`}
              >
                {isUploading ? 'Uploading...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;

