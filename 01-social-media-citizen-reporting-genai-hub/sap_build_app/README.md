# SAP Build App
Go to your SAP Build Code lobby and import the following [mtar file](CitizenReportAppJacob.mtar).
![SAP Systems appear in SAP Build App](https://github.com/user-attachments/assets/4ffc0cc1-b8c4-4ddf-aad9-de178d9ef4ad)

> [!IMPORTANT]
Please ensure that you have completed the pre-requisites prior doing so.


## Pre-requisites
Make sure you have already deployed the Orchestrator CAP CDS service and it's up and running.

Because the SAP Build App will be using the deployed CAP CDS service urls and defined it as endpoints in your Destination as part of your SAP BTP Subaccount.
![SAP Systems appear in SAP Build App](https://github.com/user-attachments/assets/02e665db-ae7f-4d59-b19e-edab08b3477a)

The endpoints defined in the Destination will be used by the SAP Build App.
![CAP CDS endpoints defined in Destinations](https://github.com/user-attachments/assets/5c69028d-7847-4b4d-8221-5e6837ee4976)

Do note that the destinations used are different from the ones defined for the Orchestrator CAP CDS.
For it to appear in SAP Systems, you have to ensure that the additional properties are properly defined in each destination. 

For simplicity, you may import the following destinations and change the URL accordingly. Make sure the end path is correct. e.g. /manager-api

[ReportCitizenApp-RedditAPI](ReportCitizenApp-RedditAPI)

[ReportCitizenApp-ManagerAPI](ReportCitizenApp-ManagerAPI)

[ReportCitizenApp-Notification-API](ReportCitizenApp-Notification-API)