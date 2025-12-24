const express = require('express');
const multer = require('multer');
const cors = require('cors');
const btoa = require('btoa');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

// Set up the Express application
const app = express();
const port = process.env.PORT || 30000; // You can use 3000 as a standard fallback for local dev

app.use(express.static(__dirname));

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Configure Multer for file uploads
const upload = multer({
    storage: multer.memoryStorage()
});

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASSWORD
    }
});

// Environment variables for API configuration
const DOCAI_EMB_TOKEN_URL = process.env.DOCAI_EMB_TOKEN_URL;
const DOCAI_EMB_TOKEN_USER = process.env.DOCAI_EMB_TOKEN_USER;
const DOCAI_EMB_TOKEN_PASSWORD = process.env.DOCAI_EMB_TOKEN_PASSWORD;

// Hardcoded URLs moved to environment variables
const aiServiceAPIUrl = process.env.DOCAI_EMB_API_URL;
const docAIFileServiceUrl = process.env.DOCAI_EMB_API_URL + '/FileService';
const aiServiceUrl = process.env.DOCAI_EMB_API_URL + '/FileService/Files/Upload';
const aiServiceSchemasUrl = process.env.DOCAI_EMB_API_URL + '/SchemaService/Schemas?$expand=versions';
const aiServiceFileResponseUrl = process.env.DOCAI_EMB_API_URL + '/Files';
const aiServiceProcessBaseUrl = process.env.DOCAI_EMB_API_URL + '/SchemaService/SchemaVersions';

async function getBpaBearerToken() {
    const { default: fetch } = await import('node-fetch');
    const bpaOauthUrl = process.env.BPA_OAUTH_URL;
    const bpaUser = process.env.BPA_OAUTH_USER;
    // Correct the password environment variable name if needed
    const bpaPassword = process.env.BPA_OAUTH_PASSWORD;

    if (!bpaOauthUrl || !bpaUser || !bpaPassword) {
        throw new Error('Missing BPA OAuth configuration in environment variables.');
    }

    // Basic Authentication credentials
    const credentials = btoa(`${bpaUser}:${bpaPassword}`);

    try {
        const response = await fetch(bpaOauthUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded' // Required for client_credentials grant
            },
            // The grant_type is already in the URL, no need for body for this specific setup
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to fetch BPA token:', response.status, errorText);
            throw new Error(`Failed to fetch BPA token: ${response.statusText}`);
        }

        const data = await response.json();
        return data.access_token;

    } catch (error) {
        console.error('Error during BPA token fetch:', error);
        throw error; // Re-throw the error to be caught by the calling route
    }
}

async function getBearerToken() {
    const { default: fetch } = await import('node-fetch');

    // Basic Authentication credentials
    const credentials = btoa(`${DOCAI_EMB_TOKEN_USER}:${DOCAI_EMB_TOKEN_PASSWORD}`);

    try {
        const response = await fetch(DOCAI_EMB_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to fetch token:', response.status, errorText);
            throw new Error(`Failed to fetch token: ${errorText}`);
        }

        const data = await response.json();
        // Return the access token
        return data.access_token;

    } catch (error) {
        console.error('Error during token fetch:', error);
        throw error;
    }
}


// ============================================================
// MIGRATION TOOL EXTENSIONS
// ============================================================

// Helper: Get Token for Dynamic Credentials (For "New" Environment)
async function getDynamicBearerToken(authUrl, clientId, clientSecret) {
    const { default: fetch } = await import('node-fetch');
    const credentials = btoa(`${clientId}:${clientSecret}`);

    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${credentials}` }
        });
        if (!response.ok) throw new Error(`Auth Failed: ${response.statusText}`);
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Dynamic Auth Error:', error);
        throw error;
    }
}

// Generic Proxy for Migration Tool
// Handles requests to both "Old" (Env vars) and "New" (UI params) environments
app.post('/migration-proxy', async (req, res) => {
    const { default: fetch } = await import('node-fetch');

    // environment: 'old' or 'new'
    // config: { authUrl, clientId, clientSecret } (Only needed for 'new')
    // targetUrl: The full DocAI API URL
    // method: GET, POST, etc.
    // body: Payload for POST requests
    const { environment, config, targetUrl, method, body } = req.body;

    try {
        let token;

        if (environment === 'old') {
            // Use existing function for Old Env (uses .env file)
            token = await getBearerToken();
        } else {
            // Fetch token dynamically for New Env
            token = await getDynamicBearerToken(config.authUrl, config.clientId, config.clientSecret);
        }

        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(targetUrl, options);

        // Handle 204 No Content (often used for Activation/Deactivation)
        if (response.status === 204) {
            return res.status(200).json({ success: true });
        }

        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).send(errText);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error(`Migration Proxy Error [${environment}]:`, error);
        res.status(500).send(error.message);
    }
});

// GET route for specific file details
app.get('/file-details/:fileId', async (req, res) => {
    const { default: fetch } = await import('node-fetch');
    const fileId = req.params.fileId;

    if (!fileId) {
        return res.status(400).send('Missing required parameter: fileId.');
    }

    try {
        const aiServiceToken = await getBearerToken();
        const fileDetailsUrl = `${aiServiceAPIUrl}/FileService/Files/${fileId}`;

        const response = await fetch(fileDetailsUrl, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${aiServiceToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('File Details API call failed:', response.status, errorText);
            return res.status(response.status).send(`File Details API call failed: ${errorText}`);
        }

        const data = await response.json();
        // console.log("File details fetched:", data);
        // The API returns a 'value' array, we'll send back the first object
        // res.json(data.value && data.value.length > 0 ? data.value[0] : null);
        res.json(data);

    } catch (error) {
        console.error('Error during File Details API call:', error);
        res.status(500).send('Internal Server Error');
    }
});

// GET route to find the DocAI Document ID based on a File ID
app.get('/document-id/:fileId', async (req, res) => {
    const { default: fetch } = await import('node-fetch');
    const fileId = req.params.fileId;

    if (!fileId) {
        return res.status(400).send('Missing required parameter: fileId.');
    }

    try {
        const aiServiceToken = await getBearerToken();

        // Construct the URL to query the Documents endpoint, filtering by file_ID
        // Note: Use encodeURIComponent for the fileId in the filter query
        const docQueryUrl = `${aiServiceAPIUrl}/DocumentService/Documents?$filter=file_ID eq ${encodeURIComponent(fileId)}&$select=ID`;

        const response = await fetch(docQueryUrl, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${aiServiceToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DocAI Document Query API call failed:', response.status, errorText);
            return res.status(response.status).send(`DocAI Document Query API call failed: ${errorText}`);
        }

        const data = await response.json();

        // Check if we found a document
        if (data.value && data.value.length > 0) {
            // Send back the first matching document's ID
            res.json({ docAI_ID: data.value[0].ID });
        } else {
            // No document found for that file_ID
            res.status(404).json({ message: 'Document not found for the given file ID.' });
        }

    } catch (error) {
        console.error('Error during DocAI Document ID lookup:', error);
        res.status(500).send('Internal Server Error');
    }
});

// GET route to get ALL the Documents
app.get('/documents/reviewNeeded', async (req, res) => {
    const { default: fetch } = await import('node-fetch');

    try {
        const aiServiceToken = await getBearerToken(); // Assuming getBearerToken() is a function you have defined

        // Construct the URL using the documentId from the request parameters
        const ocrUrl = aiServiceAPIUrl + `/DocumentService/Documents?$filter=status eq 'reviewNeeded'`;

        const response = await fetch(ocrUrl, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${aiServiceToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OCR API call failed:', response.status, errorText);
            return res.status(response.status).send(`OCR API call failed: ${errorText}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error during OCR API call:', error);
        res.status(500).send('Internal Server Error');
    }
});
// GET route to get the OCR Response for a specific document
app.get('/document-ocr/:documentId', async (req, res) => {
    const { default: fetch } = await import('node-fetch');

    const documentId = req.params.documentId;

    if (!documentId) {
        return res.status(400).send('Missing required parameter: documentId.');
    }

    try {
        const aiServiceToken = await getBearerToken(); // Assuming getBearerToken() is a function you have defined

        // Construct the URL using the documentId from the request parameters
        const ocrUrl = aiServiceAPIUrl + `/FileService/Files/${documentId}/ocrResponse`;

        const response = await fetch(ocrUrl, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${aiServiceToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OCR API call failed:', response.status, errorText);
            return res.status(response.status).send(`OCR API call failed: ${errorText}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error during OCR API call:', error);
        res.status(500).send('Internal Server Error');
    }
});

// GET route to get the Text Response for a specific document
app.get('/document-text/:documentId', async (req, res) => {
    const { default: fetch } = await import('node-fetch');

    const documentId = req.params.documentId;

    if (!documentId) {
        return res.status(400).send('Missing required parameter: documentId.');
    }

    try {
        const aiServiceToken = await getBearerToken(); // Assuming getBearerToken() is a function you have defined

        // Construct the URL using the documentId from the request parameters
        const textUrl = aiServiceAPIUrl + `/FileService/Files/${documentId}/text`;

        const response = await fetch(textUrl, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${aiServiceToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Text API call failed:', response.status, errorText);
            return res.status(response.status).send(`Text API call failed: ${errorText}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error during Text API call:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.patch('/admin/SubmittedDocuments/:documentID', async (req, res) => {
    const documentID = req.params.documentID;
    const { status, extractedData } = req.body;

    if (!documentID || !status) {
        return res.status(400).json({ message: 'Document ID and status are required.' });
    }

    try {
        const docRef = db.collection(`artifacts/${appId}/public/data/submittedDocuments`).doc(documentID);
        await docRef.update({
            status,
            extractedData: extractedData || null,
            updatedAt: new Date().toISOString()
        });

        res.status(200).json({
            message: 'Document updated successfully.',
            documentID
        });
    } catch (error) {
        console.error("Error updating document:", error);
        if (error.code === 'not-found') {
            return res.status(404).json({ message: 'Document not found.' });
        }
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// Handle POST request to send an email
app.post('/send-email', (req, res) => {
    const { name, email, subject, message, navurl } = req.body;

    // Email body with a beautiful header and customized content
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="width: 100%; text-align: center; background-color: #f0f0f0;">
                <img src="https://placehold.co/600x200/1a3c5a/fff?text=Vertigo+Travels" alt="Vertigo Travels Header" style="width: 100%; height: auto; display: block; border-bottom: 3px solid #90dfefff;">
            </div>
            <div style="padding: 20px;">
                <h2 style="color: #1a3c5a; margin-bottom: 20px; text-align: center;">Welcome to the Vertigo Travels!</h2>
                <p>Dear ${name},</p>
                <p>${message} </p>
                <p>More details <a href="${navurl}" style="color: #E0B19A; text-decoration: none; font-weight: bold;">here</a>.</p>
            </div>
            <div style="text-align: center; padding: 20px; font-size: 12px; color: #888; border-top: 1px solid #eee;">
                &copy; 2025 Vertigo Travels. All rights reserved.
            </div>
        </div>
    `;

    const mailOptions = {
        from: `"${name}" <${email}>`,
        to: `${email}`,
        subject: `${subject}`,
        html: emailHtml
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send('Something went wrong. Please try again later.');
        } else {
            console.log('Email sent:', info.response);
            res.status(200).send('Email sent successfully!');
        }
    });
});

app.delete('/delete-file/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        if (!fileId) {
            return res.status(400).send('File ID is required for deletion.');
        }

        const aiServiceToken = await getBearerToken();
        const deleteUrl = `${docAIFileServiceUrl}/Files/${fileId}`;
        console.log(`Attempting to delete file from: ${deleteUrl}`);

        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'authorization': `Bearer ${aiServiceToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`DocAI file deletion failed for ID ${fileId}:`, response.status, errorText);
            // Forward the error status and message back to the client
            return res.status(response.status).send(`DocAI file deletion failed: ${errorText}`);
        }

        // Deletion successful (usually returns 204 No Content)
        res.status(204).send();

    } catch (error) {
        console.error('Error during file deletion API call:', error);
        res.status(500).send('Internal Server Error during file deletion.');
    }
});

// POST route to handle file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
    const { default: fetch } = await import('node-fetch');

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const aiServiceToken = await getBearerToken();

        const formData = new FormData();
        formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
        const uploadUrl = `${docAIFileServiceUrl}/Files/Upload`;
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${aiServiceToken}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API call failed:', response.status, errorText);
            return res.status(response.status).send(`API call failed: ${errorText}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error during API call:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST route to process a document
app.post('/process-document', async (req, res) => {
    const { default: fetch } = await import('node-fetch');

    const { documentTypeId, fileId } = req.body;

    if (!documentTypeId || !fileId) {
        return res.status(400).send('Missing required parameters: documentTypeId and fileId.');
    }

    try {
        const aiServiceToken = await getBearerToken();
        const aiServiceProcessUrl = `${aiServiceProcessBaseUrl}/${documentTypeId}/SchemaService.execute`;

        const requestBody = {
            fileId: fileId
        };

        const response = await fetch(aiServiceProcessUrl, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${aiServiceToken}`,
                'content-type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API call failed:', response.status, errorText);
            return res.status(response.status).send(`API call failed: ${errorText}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error during API call:', error);
        res.status(500).send('Internal Server Error');
    }
});

// GET route to get schemas
app.get('/schemas', async (req, res) => {
    const { default: fetch } = await import('node-fetch');

    try {
        const aiServiceToken = await getBearerToken();
        console.log('Bearer Token:', aiServiceToken); // Debugging line to check the token value

        const response = await fetch(aiServiceSchemasUrl, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${aiServiceToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API call failed:', response.status, errorText);
            return res.status(response.status).send(`API call failed: ${errorText}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error during API call:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/trigger-completeness-check', async (req, res) => {
    const { default: fetch } = await import('node-fetch');
    const { subscriptionId } = req.body;
    const workflowUrl = process.env.BPA_WORKFLOW_URL;
    const workflowDefinitionId = process.env.BPA_WORKFLOW_COMPLETENESS_CHECK_DEFINITION_ID;

    if (!subscriptionId) {
        return res.status(400).json({ message: 'Missing subscriptionId in request body.' });
    }
    if (!workflowUrl) {
        return res.status(500).json({ message: 'Workflow URL not configured on the server.' });
    }

    try {
        const bpaToken = await getBpaBearerToken();

        const payload = {
            definitionId: workflowDefinitionId,
            context: {
                subscriptionId: subscriptionId
            }
        };

        const response = await fetch(workflowUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${bpaToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // Try to get more specific error info from BPA
            let errorDetails = `Status: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorDetails += ` - ${JSON.stringify(errorData)}`;
            } catch (e) { /* Ignore if parsing fails */ }
            console.error('BPA Workflow API call failed:', errorDetails);
            return res.status(response.status).json({ message: `BPA Workflow API call failed: ${errorDetails}` });
        }

        // Workflow started successfully (usually returns 201 Created)
        const responseData = await response.json(); // Get response body if needed
        console.log("Workflow instance created:", responseData);
        res.status(response.status).json({ message: 'Document completeness check workflow started successfully.', data: responseData });

    } catch (error) {
        console.error('Error triggering completeness check workflow:', error);
        res.status(500).json({ message: 'Internal Server Error while triggering workflow.' });
    }
});

app.get('/environmentvariables', function (req, res) {
    const data = {
        XSUAA_AUTH_ENDPOINT: process.env.XSUAA_AUTH_ENDPOINT,
        XSUAA_AUTH_CID: process.env.XSUAA_AUTH_CID,
        XSUAA_AUTH_CSECRET: process.env.XSUAA_AUTH_CSECRET,
        DOCAI_ENDPOINT: process.env.DOCAI_ENDPOINT,
        BACKEND_CDS_ENDPOINT: process.env.BACKEND_CDS_ENDPOINT,
        S4HANA_ENDPOINT: process.env.S4HANA_ENDPOINT,
        BPA_WORKFLOW_URL_EXISTS: !!process.env.BPA_WORKFLOW_URL, // Send boolean flags
        BPA_OAUTH_URL_EXISTS: !!process.env.BPA_OAUTH_URL,
    };
    res.setHeader('Content-Type', 'application/json')
    res.status(200)
    res.send(JSON.stringify(data))
});

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});