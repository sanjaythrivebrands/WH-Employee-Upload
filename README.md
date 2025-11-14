# Employee Document Upload Portal

A simple portal where HR can enter employee details and upload documents. The system automatically creates OneDrive folders for each employee and stores all metadata in an Excel file.

## Features

- **Employee Information Form**: Capture employee details including name, mobile, DOB, UAN, email, and address
- **Document Upload**: Upload multiple documents (Aadhaar Card, PAN Card, Bank Passbook, and additional documents)
- **OneDrive Integration**: Automatically creates folders and uploads files to OneDrive
- **Excel Tracking**: Maintains a centralized Excel file with all employee metadata
- **File Preview**: View uploaded files with name and size before submission
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Project Structure

```
WH Employee Upload/
├── frontend/          # React frontend application
├── backend/           # Node.js + Express backend API
├── brain/             # Project documentation and knowledge base
└── README.md          # This file
```

## Prerequisites

- Node.js (v18 or higher - required for native fetch API support)
- npm or yarn
- Microsoft Azure AD App Registration with Graph API permissions
- OneDrive access (personal or business)

## Setup Instructions

### 1. Microsoft Azure AD App Registration

Before setting up the application, you need to create an Azure AD app registration:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - Name: `Employee Upload Portal`
   - Supported account types: Choose based on your needs
   - Redirect URI: Leave blank for now
5. Click **Register**
6. Note down the **Application (client) ID** and **Directory (tenant) ID**
7. Go to **Certificates & secrets** > **New client secret**
8. Create a secret and note it down (you won't be able to see it again)
9. Go to **API permissions** > **Add a permission** > **Microsoft Graph**
10. Add the following **Application permissions**:
    - `Files.ReadWrite.All`
    - `Sites.ReadWrite.All` (if using SharePoint/OneDrive for Business)
11. Click **Grant admin consent** for your organization

### 2. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `env.example`):
```bash
cp env.example .env
```

4. Edit `.env` and add your Azure credentials:
```env
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here

# Optional: Specify OneDrive drive ID (leave empty for default)
ONEDRIVE_DRIVE_ID=

# Optional: Specify root folder ID where employee folders should be created
# Leave empty to use root folder, or specify a folder ID
ONEDRIVE_ROOT_FOLDER_ID=

PORT=5000
```

5. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000` by default.

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, if backend is on different URL):
```env
REACT_APP_API_URL=http://localhost:5000
```

4. Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000` by default.

## Usage

1. Open the application in your browser (usually `http://localhost:3000`)
2. Fill in the employee details:
   - **Employee Name** (required)
   - **Mobile Number** (required)
   - **Date of Birth** (required)
   - **UAN Number** (optional)
   - **Email** (optional)
   - **Address** (optional)
3. Upload documents:
   - Aadhaar Card (PDF or image)
   - PAN Card (PDF or image)
   - Bank Passbook (PDF or image)
   - Additional documents (multiple files allowed)
4. Review the file previews showing file names and sizes
5. Click **Submit** to upload
6. Wait for the success message

## How It Works

1. **Form Submission**: When you submit the form, all data is sent to the backend API
2. **Folder Creation**: The backend creates a folder in OneDrive using the employee's name
3. **File Upload**: All uploaded documents are uploaded to the created folder
4. **Excel Update**: Employee metadata is appended to `Employee-Data.xlsx` in OneDrive
5. **Response**: The frontend displays a success or error message

## API Endpoints

### `POST /api/upload`

Uploads employee data and documents to OneDrive.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `employeeName` (required)
  - `mobileNumber` (required)
  - `dateOfBirth` (required)
  - `uanNumber` (optional)
  - `email` (optional)
  - `address` (optional)
  - `aadhaarCard` (file, optional)
  - `panCard` (file, optional)
  - `bankPassbook` (file, optional)
  - `additionalDocs` (files, optional, multiple)

**Response:**
```json
{
  "success": true,
  "message": "Employee data and documents uploaded successfully",
  "folderName": "John Doe",
  "filesUploaded": 3
}
```

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Finding OneDrive Folder ID (Optional)

If you want to store employee folders in a specific OneDrive folder:

1. Navigate to the folder in OneDrive
2. Copy the folder ID from the URL
3. Add it to `.env` as `ONEDRIVE_ROOT_FOLDER_ID`

Example URL: `https://onedrive.live.com/?id=root&cid=ABC123...`
The folder ID is the part after `cid=`

## Troubleshooting

### Backend Issues

- **Authentication Error**: Verify your Azure credentials in `.env`
- **Permission Denied**: Ensure admin consent is granted for API permissions
- **Folder Creation Failed**: Check if the OneDrive root folder ID is correct

### Frontend Issues

- **Connection Error**: Verify the backend is running and `REACT_APP_API_URL` is correct
- **CORS Error**: Ensure the backend CORS is configured correctly

### File Upload Issues

- **File Size**: Maximum file size is 10MB per file
- **File Type**: Only PDF, JPEG, JPG, and PNG files are allowed
- **Upload Timeout**: Large files may take time; ensure stable connection

## Development

### Backend Development

Run with auto-reload:
```bash
cd backend
npm run dev
```

### Frontend Development

The React app runs in development mode with hot-reload:
```bash
cd frontend
npm start
```

## Production Deployment

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Serve the built files using a static file server or integrate with your backend

3. Set production environment variables

4. Use a process manager like PM2 for the backend:
```bash
npm install -g pm2
pm2 start backend/server.js
```

## Security Notes

- Never commit `.env` files to version control
- Keep your Azure client secret secure
- Use HTTPS in production
- Implement rate limiting for production use
- Consider adding authentication/authorization for the portal

## License

ISC

## Support

For issues or questions, please refer to the documentation in the `/brain` folder.

