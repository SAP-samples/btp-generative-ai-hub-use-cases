> [!NOTE]
> This documentation is currently under construction. Sections may be incomplete or subject to change.

# Vertigo Travels UI Deployment Guide

## 1. Overview

This project showcases a simple Node.js application, deployed on Cloud Foundry, designed to demonstrate a streamlined user journey for the travel agency use case -- Vertigo Travels. The application handles the end-to-end process of a traveler (Mary) subscribing to a course and submitting documents, and a back-office employee (Barry) approving the subscription, which then integrates with S/4HANA Cloud.

> [!WARNING]
> **Prototype & Support Disclaimer**
>
> This prototype serves as an inspiration for you to develop your own solution.
>
> We are not in a position to, and at our own discretion, will not maintain this repository. This version is published **as-is** without any guarantee of future updates or support.

This application is intentionally built as a **simple, single-page HTML file (`index.html`) served by a single Node.js proxy (`app.js`)**.

This "vanilla" JavaScript approach was chosen for maximum flexibility:

* **Rapid Prototyping:** Developers can easily take this code and use code-generation LLMs (Large Language Models) to quickly transform the UI into a different design or add new features.
* **Frontend Agnostic:** The backend logic in `app.js` is completely decoupled from the frontend. This allows developers to easily replace the `index.html` file with their frontend of choice, such as:
    * **SAPUI5** (using UI5 Web Components)
    * **React**
    * **Angular**
    * **Vue.js**

The `app.js` proxy handles all complex authentication and API calls, allowing any frontend framework to consume the data from simple, relative-path API routes (e.g., `/schemas`, `/upload`).

### Table of Contents

1.  [Overview](#1-overview)
2.  [Business Scenario](#2-business-scenario)
3.  [Solution Architecture](#3-solution-architecture)
4.  [Prerequisites](#4-prerequisites)
5.  [Local Development & Testing](#5-local-development--testing)
6.  [Production Deployment (SAP BTP)](#6-production-deployment-sap-btp-cloud-foundry)
7.  [Environment Variables Guide](#7-environment-variables-guide)
8.  [Key Features Showcase](#8-key-features-showcase)
9.  [Ideas for Improvement](#9-ideas-for-improvement)

## 2. Business Scenario



The business scenario begins when a traveler, **Mary**, subscribes to a course on the Vertigo Travels website. This action creates a pre-subscription in the Vertigo Travel BTP Extension, which stores her information and documents. A back-office employee, **Barry**, then reviews these documents. If the documents are all good, the subscription is finalized, customer information is posted to SAP S/4HANA Cloud, and an invoice is generated. If documents are missing, Mary receives an automated email reminder.

## 3. Solution Architecture

The diagram below illustrates the complete solution architecture, showing how this Node.js UI application acts as the "head" for a collection of backend services on SAP BTP.



The key components are:
* **Node.js UI & Proxy:** This application (`app.js`), which serves the static `index.html` file and proxies all API calls.
* **SAP CAP Service:** The core backend data model (Courses, Travelers, Subscriptions) running on BTP.
* **SAP HANA Cloud:** The persistence layer for the CAP service.
* **SAP Document AI:** Used for document extraction and processing.
* **SAP Build Process Automation:** Used to orchestrate document-checking workflows.
* **SAP S/4HANA Cloud:** Used for Business Partner and Sales Order creation during the payment process.

---

## 4. Prerequisites

### Backend Service Prerequisites

Before deploying this UI, the following backend components **must** be deployed and accessible:

* **SAP CAP CDS Backend:** A CAP CDS data model for Vertigo Travels must be deployed to your BTP subaccount, using **SAP HANA Cloud** as its database. This application's proxy (`app.js`) connects to this CAP service (via `BACKEND_CDS_ENDPOINT`) for all core business data.
* **SAP S/4HANA Cloud Access:** This application requires access to an S/4HANA Cloud system for the Business Partner & Sales Order integration.
    * *(Note: The S/4HANA integration is currently required for the payment workflow. Future development aims to make this integration optional.)*
* **Service Credentials:** You must have generated service keys or credentials for all required services (DocAI, BPA, XSUAA, S/4HANA, etc.).

### Local Development Prerequisites

* **Node.js:** A stable (LTS) version is recommended (e.g., 18.x or 20.x).
* **npm:** Node.js's package manager (comes with Node.js).

---

## 5. Local Development & Testing

You can run the full application on your local machine for testing.

1.  **Install Dependencies:**
    Open a terminal in the project's root folder and run:
    ```bash
    npm install
    ```

2.  **Create `.env` File:**
    This application requires a `.env` file in the root directory to store all your secret credentials.
    * A template file named `.env_sample` is included in this repository.
    * **You can copy and rename this file to `.env`** to get started.
    * Fill in all the required values in the `.env` file by following the [Environment Variables Guide](#7-environment-variables-guide).

    **Example `.env` file structure:**
    ```
    # Server Port
    PORT=30000

    # Mailer Service Configuration
    MAILER_USER=your-email@gmail.com
    MAILER_PASSWORD=your-gmail-app-password
    
    # ... all other variables ...
    ```

3.  **Run the Application:**
    Once your `.env` file is saved, run:
    ```bash
    node app.js
    ```

4.  **Access the App:**
    Open your browser and navigate to `http://localhost:30000` (or the `PORT` you specified).

---

## 6. Production Deployment (SAP BTP, Cloud Foundry)

This guide assumes you are deploying to an SAP BTP, Cloud Foundry environment.

1.  **Log in to Cloud Foundry:**
    Open your terminal and log in to your BTP subaccount.
    ```bash
    cf login -a <YOUR_CF_API_ENDPOINT> -o <YOUR_ORG> -s <YOUR_SPACE>
    ```

2.  **Edit `manifest.yml`:**
    This is the **most important step**. The `manifest.yml` file tells Cloud Foundry how to deploy your app and what environment variables to inject.
    * A template file named `manifest_sample.yml` is included in this repository.
    * **You can copy and rename this file to `manifest.yml`** to get started.
    * You **must** populate the `env:` block with all the required credentials from your BTP services. Find the values by creating **Service Keys** for each of your BTP service instances (XSUAA, DocAI, BPA).

    **Example `manifest.yml` template:**
    ```yaml
    applications:
    - name: vertigo-travels-ui
      memory: 256M
      disk_quota: 512M
      buildpack: nodejs_buildpack
      command: npm start
      env:
        NODE_ENV: production
        
        # --- SAP CAP Backend (XSUAA) ---
        XSUAA_AUTH_ENDPOINT: "https://<your-uaa-url>.authentication.eu10.hana.ondemand.com"
        XSUAA_AUTH_CID: "sb-vertigo-travels-cap-sadevmain-dev!t141280"
        XSUAA_AUTH_CSECRET: "your-xsuaa-client-secret$..."
        BACKEND_CDS_ENDPOINT: "https://<your-cap-app-url>.cfapps.eu10.hana.ondemand.com"
        
        # --- SAP Document AI ---
        DOCAI_ENDPOINT: "https://<your-docai-url>.eu10.doc.cloud.sap"
        DOCAI_EMB_TOKEN_URL: "https://<your-docai-auth-url>[.authentication.sap.hana.ondemand.com/oauth/token?grant_type=client_credentials](https://.authentication.sap.hana.ondemand.com/oauth/token?grant_type=client_credentials)"
        DOCAI_EMB_TOKEN_USER: "sb-your-docai-client-id!b242056|dox-xsuaa-std-internal-production!b14483"
        DOCAI_EMB_TOKEN_PASSWORD: "your-docai-client-secret$..."
        DOCAI_EMB_API_URL: "[https://aiservices-dox.cfapps.sap.hana.ondemand.com/document-ai/v1](https://aiservices-dox.cfapps.sap.hana.ondemand.com/document-ai/v1)"
        
        # --- SAP Build Process Automation (BPA) ---
        BPA_WORKFLOW_URL: "[https://spa-api-gateway-bpi-eu-prod.cfapps.eu10.hana.ondemand.com/workflow/rest/v1/workflow-instances](https://spa-api-gateway-bpi-eu-prod.cfapps.eu10.hana.ondemand.com/workflow/rest/v1/workflow-instances)"
        BPA_OAUTH_URL: "https://<your-bpa-auth-url>[.authentication.eu10.hana.ondemand.com/oauth/token?grant_type=client_credentials](https://.authentication.eu10.hana.ondemand.com/oauth/token?grant_type=client_credentials)"
        BPA_OAUTH_USER: "sb-your-bpa-client-id!b378765|xsuaa!b120249"
        BPA_OAUTH_PASSWORD: "your-bpa-client-secret$..."
        BPA_WORKFLOW_COMPLETENESS_CHECK_DEFINITION_ID: "eu10.your-bpa-tenant.vertigotravelsautomation.submittedDocumentsCompletenessCheck"
        
        # --- Other Services ---
        S4HANA_ENDPOINT: "https://<your-s4-system>.s4hana.ondemand.com"
        MAILER_USER: "your-email@gmail.com"
        MAILER_PASSWORD: "your-gmail-app-password"

    ```

3.  **Deploy the App:**
    From your project's root directory, run:
    ```bash
    cf push
    ```
    Cloud Foundry will now deploy your application using the variables defined in the manifest.

---

## 7. Environment Variables Guide

Use this table to find the values for your `.env` file (local) or `manifest.yml` (production).

### General

| Variable | Example Value (Anonymized) | How to Find This |
| :--- | :--- | :--- |
| `PORT` | `30000` | The port your Node.js server will run on. `30000` is fine for local. |
| `NODE_ENV` | `production` | Set to `production` for BTP deployment. |

### Mailer (Nodemailer)

| Variable | Example Value (Anonymized) | How to Find This |
| :--- | :--- | :--- |
| `MAILER_USER` | `your-demo-email@gmail.com` | Your Gmail account. |
| `MAILER_PASSWORD` | `keabosyzpcfsweiz` | **Important:** This is an **App Password** generated from your Google Account settings, *not* your regular password. |

### SAP CAP Backend (XSUAA)

| Variable | Example Value (Anonymized) | How to Find This |
| :--- | :--- | :--- |
| `BACKEND_CDS_ENDPOINT` | `https://my-cap-app.cfapps.eu10...` | The application URL of your **deployed CAP backend service**. |
| `XSUAA_AUTH_ENDPOINT` | `https://my-sub.authentication.eu10...` | From the **service key** of your CAP app's XSUAA instance. Look for the `url` property. |
| `XSUAA_AUTH_CID` | `sb-vertigo-travels-cap-dev!t123...` | From the **service key** of your CAP app's XSUAA instance. Look for the `clientid` property. |
| `XSUAA_AUTH_CSECRET` | `faca4588...$VDwfP89gbW...` | From the **service key** of your CAP app's XSUAA instance. Look for the `clientsecret` property. |

### SAP S/4HANA

| Variable | Example Value (Anonymized) | How to Find This |
| :--- | :--- | :--- |
| `S4HANA_ENDPOINT` | `https://my301481.s4hana.ondemand.com` | The URL of your S/4HANA system's OData or API endpoint. |

### SAP Document AI

| Variable | Example Value (Anonymized) | How to Find This |
| :--- | :--- | :--- |
| `DOCAI_ENDPOINT` | `https://my-docai-sub.eu10.doc.cloud.sap` | From your DocAI service subscription, this is the main URL for the UI / Workspace. |
| `DOCAI_EMB_TOKEN_URL` | `https://...authentication.sap.hana...` | From the **service key** of your DocAI service instance. Look for `uaa.url` and append `/oauth/token?grant_type=client_credentials`. |
| `DOCAI_EMB_TOKEN_USER` | `sb-3eb75...|dox-xsuaa-std...` | From the **service key** of your DocAI service instance. Look for the `uaa.clientid` property. |
| `DOCAI_EMB_TOKEN_PASSWORD` | `eb025e5d...$h71Zowd...` | From the **service key** of your DocAI service instance. Look for the `uaa.clientsecret` property. |
| `DOCAI_EMB_API_URL` | `https://aiservices-dox.cfapps...` | From the **service key** of your DocAI service instance. Look for the `serviceurls.DOCUMENT_AI_API_URL` property. |

### SAP Build Process Automation (BPA)

| Variable | Example Value (Anonymized) | How to Find This |
| :--- | :--- | :--- |
| `BPA_WORKFLOW_URL` | `https://spa-api-gateway-bpi-eu-prod...` | The API endpoint for triggering a workflow. This is typically found in your BPA service's API documentation. |
| `BPA_OAUTH_URL` | `https://my-bpa-sub.authentication.eu10...` | From the **service key** of your BPA service instance. Look for `uaa.url` and append `/oauth/token?grant_type=client_credentials`. |
| `BPA_OAUTH_USER` | `sb-57ebf...|xsuaa!b120249` | From the **service key** of your BPA service instance. Look for the `uaa.clientid` property. |
| `BPA_OAUTH_PASSWORD` | `467bfb...$pUK9E9ma...` | From the **service key** of your BPA service instance. Look for the `clientsecret` property. |
| `BPA_WORKFLOW_COMPLETENESS_CHECK_DEFINITION_ID` | `eu10.my-sub.workflow-name...` | The technical ID of your deployed workflow definition in SAP Build Process Automation. |

---

## 8. Key Features Showcase

Here are some of the core functionalities of the application.

### Traveler Experience

| Screenshot | Description |
| :--- | :--- |
| ![Traveler View: Course Catalog](https://placehold.co/600x400/eeeeee/222222?text=Course+Catalog+Screenshot) | **Course Catalog:** Travelers can browse all available courses, view prices, and see required documents before subscribing. |
| ![Traveler View: My Subscriptions](https://placehold.co/600x400/eeeeee/222222?text=My+Subscriptions+Screenshot) | **My Subscriptions:** Travelers can track the status of their subscriptions (e.g., `DocsPending`, `DepositPaid`), see document statuses, and pay their deposit or remaining balance. |
| ![Traveler View: My Profile](https://placehold.co/600x400/eeeeee/222222?text=My+Profile+Screenshot) | **My Profile:** Travelers can update their personal information and submit documents for special entitlements. |

### Admin Experience

| Screenshot | Description |
| :--- | :--- |
| ![Admin View: Manage Travelers](https://placehold.co/600x400/eeeeee/222222?text=Admin+Traveler+Mgmt+Screenshot) | **Manage Travelers:** Admins have a central dashboard to view all travelers, expand their subscriptions, and manage document approvals. |
| ![Admin View: Document Review](https://placehold.co/600x400/eeeeee/222222?text=Admin+Doc+Review+Screenshot) | **Document Review:** Admins can review individual documents, see the data extracted by SAP Document AI, and approve or reject submissions. |
| ![Admin View: Pending Documents](httpsD://placehold.co/600x400/eeeeee/222222?text=Admin+Pending+Docs+Screenshot) | **Pending Documents:** A dedicated view allows admins to see and categorize unassigned documents that have been ingested via email or mobile scans. |

---

## 9. Ideas for Improvement

This prototype provides a solid foundation, but there are many ways to enhance it. Here are a few ideas to consider for a production-grade solution:

*(This section is a placeholder. Please feel free to furnish it with more specific ideas.)*

* **Enhanced Error Handling:** Implement more robust error handling and user-facing feedback on the frontend for failed API calls (e.g., "S/4HANA connection failed, please try again later.").
* **UI/UX Refinements:** Convert the UI to a modern framework like SAPUI5 (using UI5 Web Components), React, or Vue for a more dynamic and responsive user experience.
* **Deeper S/4HANA Integration:** Expand the S/4HANA integration to include invoice status checks from S/4, or pull course "materials" and availability directly from the S/4 system.
* **Security Hardening:** Implement security best practices on the Node.js proxy, such as rate-limiting (to prevent API abuse), CSRF token protection, and more granular content security policies.
* **Make S/4HANA Optional:** As noted in the prerequisites, refactor the payment workflow to not depend on S/4HANA, allowing for deployments without an S/4 system.