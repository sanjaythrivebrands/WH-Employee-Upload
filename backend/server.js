const express = require('express');
const multer = require('multer');
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const ExcelJS = require('exceljs');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

// Initialize Microsoft Graph Client
let graphClient = null;

function getGraphClient() {
  if (!graphClient) {
    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET
    );

    graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
          return tokenResponse.token;
        }
      }
    });
  }
  return graphClient;
}

// Helper function to create folder in OneDrive
async function createOneDriveFolder(folderName) {
  try {
    const client = getGraphClient();
    const driveId = process.env.ONEDRIVE_DRIVE_ID || 'me';
    const rootFolderId = process.env.ONEDRIVE_ROOT_FOLDER_ID || 'root';
    
    // Check if folder already exists
    const existingFolders = await client
      .api(`/drives/${driveId}/items/${rootFolderId}/children`)
      .filter(`name eq '${folderName}' and folder ne null`)
      .get();

    if (existingFolders.value && existingFolders.value.length > 0) {
      return existingFolders.value[0].id;
    }

    // Create new folder
    const folder = await client
      .api(`/drives/${driveId}/items/${rootFolderId}/children`)
      .post({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      });

    return folder.id;
  } catch (error) {
    console.error('Error creating OneDrive folder:', error);
    throw error;
  }
}

// Helper function to upload file to OneDrive
async function uploadFileToOneDrive(folderId, fileName, fileBuffer, mimeType) {
  try {
    const client = getGraphClient();
    const driveId = process.env.ONEDRIVE_DRIVE_ID || 'me';
    
    const uploadSession = await client
      .api(`/drives/${driveId}/items/${folderId}:/${fileName}:/createUploadSession`)
      .post({
        item: {
          '@microsoft.graph.conflictBehavior': 'rename',
          name: fileName
        }
      });

    // Upload file in chunks (for files > 4MB) or directly
    const fileSize = fileBuffer.length;
    const maxChunkSize = 4 * 1024 * 1024; // 4MB chunks

    if (fileSize <= maxChunkSize) {
      // Direct upload for small files
      const response = await fetch(uploadSession.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
          'Content-Type': mimeType
        },
        body: fileBuffer
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    } else {
      // Chunked upload for large files
      let offset = 0;
      while (offset < fileSize) {
        const chunkSize = Math.min(maxChunkSize, fileSize - offset);
        const chunk = fileBuffer.slice(offset, offset + chunkSize);
        const isLastChunk = offset + chunkSize >= fileSize;
        
        const response = await fetch(uploadSession.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': chunkSize.toString(),
            'Content-Range': `bytes ${offset}-${offset + chunkSize - 1}/${fileSize}`,
            'Content-Type': mimeType
          },
          body: chunk
        });
        
        if (!response.ok && !(isLastChunk && response.status === 201)) {
          throw new Error(`Chunk upload failed: ${response.status} ${response.statusText}`);
        }
        
        offset += chunkSize;
      }
    }

    return { success: true, fileName };
  } catch (error) {
    console.error('Error uploading file to OneDrive:', error);
    throw error;
  }
}

// Helper function to create or update Excel file
async function updateExcelFile(employeeData) {
  try {
    const client = getGraphClient();
    const driveId = process.env.ONEDRIVE_DRIVE_ID || 'me';
    const rootFolderId = process.env.ONEDRIVE_ROOT_FOLDER_ID || 'root';
    const excelFileName = 'Employee-Data.xlsx';
    
    let workbook = new ExcelJS.Workbook();
    let worksheet;
    let excelFileId = null;

    // Check if Excel file exists
    try {
      const existingFiles = await client
        .api(`/drives/${driveId}/items/${rootFolderId}/children`)
        .filter(`name eq '${excelFileName}'`)
        .get();

      if (existingFiles.value && existingFiles.value.length > 0) {
        excelFileId = existingFiles.value[0].id;
        // Download existing file
        const fileContent = await client
          .api(`/drives/${driveId}/items/${excelFileId}/content`)
          .getStream();
        
        const chunks = [];
        for await (const chunk of fileContent) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        await workbook.xlsx.load(buffer);
        worksheet = workbook.getWorksheet(1) || workbook.addWorksheet('Employees');
      } else {
        worksheet = workbook.addWorksheet('Employees');
        // Add headers
        worksheet.addRow([
          'Employee Name',
          'Mobile Number',
          'Date of Birth',
          'UAN Number',
          'Email',
          'Address',
          'Uploaded Files',
          'Timestamp'
        ]);
        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      }
    } catch (error) {
      // File doesn't exist, create new
      worksheet = workbook.addWorksheet('Employees');
      worksheet.addRow([
        'Employee Name',
        'Mobile Number',
        'Date of Birth',
        'UAN Number',
        'Email',
        'Address',
        'Uploaded Files',
        'Timestamp'
      ]);
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }

    // Add new row
    const uploadedFiles = employeeData.files.map(f => f.name).join(', ');
    worksheet.addRow([
      employeeData.employeeName,
      employeeData.mobileNumber,
      employeeData.dateOfBirth,
      employeeData.uanNumber || '',
      employeeData.email || '',
      employeeData.address || '',
      uploadedFiles,
      new Date().toISOString()
    ]);

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    // Generate Excel buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Upload/Update Excel file to OneDrive
    if (excelFileId) {
      // Update existing file
      await client
        .api(`/drives/${driveId}/items/${excelFileId}/content`)
        .put(excelBuffer);
    } else {
      // Create new file
      const uploadSession = await client
        .api(`/drives/${driveId}/items/${rootFolderId}:/${excelFileName}:/createUploadSession`)
        .post({
          item: {
            '@microsoft.graph.conflictBehavior': 'fail',
            name: excelFileName
          }
        });

      const response = await fetch(uploadSession.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': excelBuffer.length.toString(),
          'Content-Range': `bytes 0-${excelBuffer.length - 1}/${excelBuffer.length}`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        body: excelBuffer
      });
      
      if (!response.ok) {
        throw new Error(`Excel file upload failed: ${response.status} ${response.statusText}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating Excel file:', error);
    throw error;
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.post('/api/upload', upload.fields([
  { name: 'aadhaarCard', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'bankPassbook', maxCount: 1 },
  { name: 'additionalDocs', maxCount: 10 }
]), async (req, res) => {
  try {
    const {
      employeeName,
      mobileNumber,
      dateOfBirth,
      uanNumber,
      email,
      address
    } = req.body;

    // Validate required fields
    if (!employeeName || !mobileNumber || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        error: 'Employee Name, Mobile Number, and Date of Birth are required'
      });
    }

    // Collect all uploaded files
    const files = [];
    if (req.files.aadhaarCard) files.push(...req.files.aadhaarCard);
    if (req.files.panCard) files.push(...req.files.panCard);
    if (req.files.bankPassbook) files.push(...req.files.bankPassbook);
    if (req.files.additionalDocs) files.push(...req.files.additionalDocs);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one document must be uploaded'
      });
    }

    // Sanitize folder name (remove special characters)
    const folderName = employeeName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (!folderName) {
      return res.status(400).json({
        success: false,
        error: 'Invalid employee name'
      });
    }

    // Create folder in OneDrive
    const folderId = await createOneDriveFolder(folderName);

    // Upload all files to OneDrive
    const uploadResults = [];
    for (const file of files) {
      const result = await uploadFileToOneDrive(
        folderId,
        file.originalname,
        file.buffer,
        file.mimetype
      );
      uploadResults.push(result);
    }

    // Update Excel file
    await updateExcelFile({
      employeeName,
      mobileNumber,
      dateOfBirth,
      uanNumber,
      email,
      address,
      files: files.map(f => ({ name: f.originalname }))
    });

    res.json({
      success: true,
      message: 'Employee data and documents uploaded successfully',
      folderName: folderName,
      filesUploaded: uploadResults.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during upload'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

