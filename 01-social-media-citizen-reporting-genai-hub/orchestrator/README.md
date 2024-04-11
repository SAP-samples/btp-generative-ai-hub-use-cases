# A micro-service CAP app for an Use Case adopting SAP AI Core, SAP Generative AI Hub (AI Foundation), SAP S/4HANA Cloud and Reddit (Social Media)
To orchestrate the flow (as illustrated in the solution architecture diagram below) going from the retrieving posts from a social media platform (Reddit), processing through extraction & summarising capabilities of the LLM of SAP Generative AI Hub, through all the way to the final outcome – which could be a Maintenance Notification transaction in SAP S/4HANA Cloud – we develop and deploy a Cloud Application Programming Model (in short CAP) micro-service to facilitate with these process flows. 

This micro-service endpoint will actually represent the single entry point for the whole process flow end-to-end, as described above and elaborated in the Business Scenario shown below.
It orchestrates APIs from various SAP BTP services such as the SAP AI Core service for Generative AI Hub API and the SAP S/4HANA Cloud OData API for creating Maintenance Notifications, as well as external third-party services from Reddit. The integration with these services is made possible through the SAP Destination service, ensuring secure connectivity. The SAP Cloud Identity service is used for managing authorization and authentication across different components, including SAP S/4HANA Cloud. The incidents created are stored in SAP HANA Cloud using the Cloud Application Programming Model. Overall, this micro-service plays a crucial role in enabling seamless communication and integration between various services and components within the Citizen Reporting app architecture.

> [!IMPORTANT]
Please note that this proof of concept could serve as an inspiration for you partners who are looking to develop your own solution adopting Generative AI, specifically SAP AI Core (extended service plan).

## Business Scenario
[<img src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/b7834d78-7abd-4e1e-a04b-ef665f0c80ee"/>](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/b7834d78-7abd-4e1e-a04b-ef665f0c80ee)

## Solution Architecture
[<img src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/a826c07b-304e-4849-9ac0-493a739536d6"/>](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/a826c07b-304e-4849-9ac0-493a739536d6)

## Pre-requisites
Below are some setup steps that are required to ensure a success deployment of the application.

### **(i) Obtain a SAP BTP Productive Account with SAP AI Core (extended service plan)**. 
For more info, please refer to this [blog](https://community.sap.com/t5/technology-blogs-by-sap/generative-ai-hub-out-now/ba-p/13580462) about the availability of SAP Generative AI Hub.
As of the date of this repository, it is still not available for trial.

### **(ii) Create a Deployment for a Generative AI Model** 
Please complete this setup in [SAP Help Portal](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-deployment-for-generative-ai-model-in-sap-ai-core).

Following the documentation above, once the model has been successfully deployed, you can extract the **Deployment ID** either via the API or using the SAP AI Launchpad.
![Deployment of the Generative AI Model](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/f32fa518-72b3-4866-97b1-1bf9589d50d9)

Define the deploymentUrl by replacing the placeholder `_DEPLOYMENT_URL_AI_CORE_` in [orchestrator/manifest.yml](manifest.yml#L18), following this format `/v2/inference/deployments/d8919eac2fb5c98b5/chat/completions?api-version=2023-05-15`.

To learn more about how to [Consume Generative AI Models](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/consume-generative-ai-models-using-sap-ai-core).

### **(iii) Set Up SAP HANA Cloud** 
Please complete this [tutorial](https://developers.sap.com/group.hana-cloud-setup.html).

### **(iv) Create Destinations in your SAP BTP Subaccount**
In order for this application to work, you are required to create 4 destinations of which the application requires to communicate with.

#### **(a) Connecting to a `SAP S/4HANA Cloud System` via SAP BTP Connectivity Destination**
> SAP BTP Cockpit > Connectivity > Destinations > **New Destination**

In this step, you will require a S/4HANA Cloud instance for this to work. You will be using a technical user with the right authorisation to Manage Maintenance Order in your S/4HANA Cloud tenant. This will be triggered in the app itself part of the Create Maintenance Notification function.

> **Name**: `S4HC_GENAI`

> **Type**: HTTP

> **Description**: S4HC Test Tenant for SAP Generative AI Hub Webinar

> **URL**: https://`<tenant>`.s4hana.ondemand.com

> **Proxy Type**: Internet

> **Authentication**: BasicAuthentication

> **User**: make sure this is a technical user setup with the right authorisation to manage maintenance order service

> **Password**: xxxx

![S4HANA Destination in SAP BTP Cockpit](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/bbd79580-f795-41d8-8bd8-5281268edbb0)

_Please note that the above destination name `S4HC_GENAI` is being used (thus please **DO NOT** change) and defined inside [package.json](package.json#L82) for the app and will be used in the **Custom Logic** file on S/4HANA Maintenance Notification `Line 35` located in [orchestrator/srv/service.js](srv/service.js#L35)._ <p>
Prior to that, please make sure you've done your own testing of calling the API with Postman to ensure that your credentials works.

#### **(b) Create a Destination in SAP BTP, using your SAP AI Core (extended service plan) Service key credentials**

In this step, you will require an instance of SAP AI Core in your SAP BTP account for this to work. 

![AICORE Instance in SAP BTP Cockpit](https://user-images.githubusercontent.com/8436161/169442399-70a1197b-af35-4e7b-8f95-565a585aa677.gif)

Create a service key where you will use the OAuth credentials provided, and entered the value into the Destination config.

> SAP BTP Cockpit > Connectivity > Destinations > **New Destination**

Copy and Paste the relevant property value (from Service Key above) such as, **`clientid, clientsecret, url, ai_api_url`** into the config of **SAP BTP Connectivity Destination**.

> **Name**: `GENAICORE`

> **Type**: HTTP

> **Description**: AI Core Runtime API for GenAI Hub

> **URL**: `ai_api_url`

> **Proxy Type**: Internet

> **Authentication**: OAuth2ClientCredentials

> **Client ID**: `clientid`

> **Client Secret**: `clientsecret`

> **Token Service URL Type**: Dedicated

> **Token Service URL**: `url`/oauth/token **(NOT referring to the ai_api_url, make sure to append /oauth/token at the end of the URL path.)**

> **Token Service User**: <LEAVE_EMPTY>

> **Token Service Password**: <LEAVE_EMPTY>

![AICORE Destination in SAP BTP Cockpit](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/7068b0ea-5815-4647-b64d-351d1585acad)

_Please note that the above destination name `GENAICORE` is being used (thus please **DO NOT** change) and defined in the **Custom Logic** file on `getDestination()` method located in [orchestrator/srv/service.js](srv/service.js#L190)._

#### **(c) Create a Destination in SAP BTP, pointing to Reddit auth & service API**
_Please note that Reddit was solely chosen as the choice of various social media platforms and it is not the recommended choice from SAP, as it is only used for the intent to mimic a forum of a ficticious city reporting issues, based on the elaborated use case._

For more information on how to utilise Reddit API, please visit this [video](https://www.youtube.com/watch?v=x9boO9x3TDA).

**REDDIT_API_AUTH: Reddit API Auth Access Key Destination**
![Reddit API Auth Access Key Destination](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/079de28c-b97f-415f-85f1-b9f0154c9f77)

**REDDIT_API: Reddit API Destination**
![Reddit API Destination](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/f77ced50-f820-4659-b7ae-25cb56b89fad)

_Please note that the above destination name `REDDIT_API_AUTH` & `REDDIT_API` are being used (thus please **DO NOT** change) and defined in the **Custom Logic** file on `getDestination()` method located in [orchestrator/srv/service.js](srv/service.js#L291)._

## Steps to Deploy
> [!IMPORTANT]
Please make sure you have completed all the steps explained in the prerequisites section above.

1. Create the required BTP services
- cf create-service hana hdi-shared social-citizen-genai-db
- cf create-service destination lite social-citizen-destination
- cf create-service xsuaa application social-citizen-xsuaa
2. cds build --production
3. cf login
4. cf push