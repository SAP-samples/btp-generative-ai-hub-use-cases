# A micro-service CAP for an Use Case adopting Generative AI Hub & SAP HANA Cloud, Vector Engine, SAP S/4HANA Cloud and Reddit (Social Media)
To orchestrate the flow (as illustrated in the solution architecture diagram below) going from the retrieving posts from a social media platform (Reddit), processing through extraction & summarising capabilities of the LLM of SAP Generative AI Hub, through all the way to the final outcome – which could be a Maintenance Notification transaction in SAP S/4HANA Cloud – we develop and deploy a Cloud Application Programming Model (in short CAP) micro-service to facilitate with these process flows. 

This micro-service endpoint will actually represent the single entry point for the whole process flow end-to-end, as described above and elaborated in the Business Scenario shown below.
It orchestrates APIs from various SAP BTP services such as the SAP AI Core service for Generative AI Hub API and the SAP S/4HANA Cloud OData API for creating Maintenance Notifications, as well as external third-party services from Reddit. The integration with these services is made possible through the SAP Destination service, ensuring secure connectivity. The SAP Cloud Identity service is used for managing authorization and authentication across different components, including SAP S/4HANA Cloud. The incidents created are stored in SAP HANA Cloud using the Cloud Application Programming Model. Overall, this micro-service plays a crucial role in enabling seamless communication and integration between various services and components within the Citizen Reporting app architecture.

Our aim is to exemplify the utilization of CAP (Cloud Application Programming Model), LLMs (Large Language Models) and Embedding Models through Generative AI Hub in SAP AI Core. This setup empowers us to conduct a Similarity Search, leveraging the capabilities offered by the SAP HANA Cloud Vector Engine.

> [!IMPORTANT]
Please note that this proof of concept could serve as an inspiration for you partners who are looking to develop your own solution adopting Generative AI, specifically SAP AI Core (extended service plan).

## BUSINESS SCENARIO
[<img src="https://github.wdf.sap.corp/storage/user/54234/files/1bb88cf3-71dd-4af3-b982-0528d1077aa4"/>](https://github.wdf.sap.corp/storage/user/54234/files/1bb88cf3-71dd-4af3-b982-0528d1077aa4)

## SOLUTION ARCHITECTURE
[<img src="https://github.wdf.sap.corp/storage/user/54234/files/c36021ef-21ac-432b-ba9b-7a340a3b6657"/>](https://github.wdf.sap.corp/storage/user/54234/files/c36021ef-21ac-432b-ba9b-7a340a3b6657)

### PREREQUISITES

- Cloud Foundry Subaccount
- Access to Generative AI Hub (SAP AI Core with service plan `extended`)
- Access to SAP HANA Cloud Vector Engine (`QRC 1/2024` or later)

### PREPARE FOR DEPLOYMENT

1. [Create an instance of SAP AI Core ](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-service-instance) and make sure to choose the service plan `extended` to activate Generative AI Hub and continue [creating a Service Key](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-service-key).

2. [Create deployments](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-deployment-for-generative-ai-model-in-sap-ai-core) for a model support ChatCompletion (e.g, gpt-35-turbo or gpt-4) and an embedding model (text-embedding-ada-002) and note down the Deployment IDs for each. All available models are listed [here](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/models-and-scenarios-in-generative-ai-hub).

3. [Create a Destination](https://help.sap.com/docs/btp/sap-business-technology-platform/create-destination) for Generative AI Hub in the SAP BTP Cockpit of your Subaccount based on the Service Key of SAP AI Core you created in the previous step:

   ```yaml
   Name: GENERATIVE_AI_HUB
   Description: SAP AI Core deployed service (generative AI hub)
   URL: <AI-API-OF-AI-CORE-SERVICE-KEY>/v2 # make sure to add /v2!
   Type: HTTP
   ProxyType: Internet
   Authentication: OAuth2ClientCredentials
   tokenServiceURL: <TOKEN-SERVICE-URL-OF-AI-CORE-SERVICE-KEY>/oauth/token
   clientId: <YOUR-CLIENT-ID-OF-AI-CORE-SERVICE-KEY>
   clientSecret: <YOUR-CLIENT-SECRET-OF-AI-CORE-SERVICE-KEY>
   # Additional Properties:
   URL.headers.AI-Resource-Group: default # adjust if necessary
   URL.headers.Content-Type: application/json
   HTML5.DynamicDestination: true
   ```

4. [Create SAP HANA Cloud](https://help.sap.com/docs/HANA_CLOUD_ALIBABA_CLOUD/683a53aec4fc408783bbb2dd8e47afeb/7d4071a49c204dfc9e542c5e47b53156.html) with Vector Engine (QRC 1/2024 or later).

**Below are some setup steps that are required to ensure a success deployment of the application.**

### **(i) Obtain a SAP BTP Productive Account with SAP AI Core (extended service plan)**. 
For more info, please refer to this [blog](https://community.sap.com/t5/technology-blogs-by-sap/generative-ai-hub-out-now/ba-p/13580462) about the availability of SAP Generative AI Hub.
As of the date of this repository, it is still not available for trial.

### **(ii) Create a Deployment for a Generative AI Model** 
Please complete this setup in [SAP Help Portal](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-deployment-for-generative-ai-model-in-sap-ai-core).

Following the documentation above, once the model has been successfully deployed, you can extract the **Deployment ID** either via the API or using the SAP AI Launchpad.
![Deployment of the Generative AI Model](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/f32fa518-72b3-4866-97b1-1bf9589d50d9)

Define the deploymentUrl by replacing the placeholder `_DEPLOYMENT_URL_AI_CORE_` in [mta.yaml](mta.yaml#L59), following this format `/v2/inference/deployments/d8919eac2fb5c98b5/chat/completions?api-version=2023-05-15`.

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

_Please note that the above destination name `S4HC_GENAI` is being used (thus please **DO NOT** change) and defined inside [package.json](package.json#L82) for the app and will be used in the **Custom Logic** file on S/4HANA Maintenance Notification `Line 35` located in [cap-app/api/srv/service.js](api/srv/service.js#L35)._ <p>
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

_Please note that the above destination name `GENAICORE` is being used (thus please **DO NOT** change) and defined in the **Custom Logic** file on `getDestination()` method located in [cap-app/api/srv/service.js](api/srv/service.js#L190)._

#### **(c) Create a Destination in SAP BTP, pointing to Reddit auth & service API**
_Please note that Reddit was solely chosen as the choice of various social media platforms and it is not the recommended choice from SAP, as it is only used for the intent to mimic a forum of a ficticious city reporting issues, based on the elaborated use case._

For more information on how to utilise Reddit API, please visit this [video](https://www.youtube.com/watch?v=x9boO9x3TDA).

**REDDIT_API_AUTH: Reddit API Auth Access Key Destination**
![Reddit API Auth Access Key Destination](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/079de28c-b97f-415f-85f1-b9f0154c9f77)

**REDDIT_API: Reddit API Destination**
![Reddit API Destination](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/f77ced50-f820-4659-b7ae-25cb56b89fad)

_Please note that the above destination name `REDDIT_API_AUTH` & `REDDIT_API` are being used (thus please **DO NOT** change) and defined in the **Custom Logic** file on `getDestination()` method located in [cap-app/api/srv/service.js](api/srv/service.js#L291)._

### DEPLOYMENT

> [!NOTE]  
> Make sure [TypeScript support is enabled](https://cap.cloud.sap/docs/node.js/typescript), otherwise run `npm i -g typescript ts-node`

1. Run `npm install` or `yarn install` in `api` directory to install project specific dependencies.
2. Dupliate `api/.cdsrc.sample.json` to `api/.cdsrc.json` and enter the Deployment IDs for the created ChatCompletion and Embedding model from the preparation steps above. Adjust the Resource Group if necessary.
3. Run `npm run build` or `yarn build` on CLI to build the MTA.
4. Login to your subaccount with [Cloud Foundry CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html), running `cf login`.
5. Run `npm run deploy` or `yarn deploy` on CLI to deploy the API to your Subaccount.

### DEVELOPMENT

> [!NOTE]  
> Make sure [TypeScript support is enabled](https://cap.cloud.sap/docs/node.js/typescript), otherwise run `npm i -g typescript ts-node`

After succesful deployment, we can develop based on the created service instances on SAP BTP.

1. Run `npm install` or `yarn install` to install project specific dependencies.
2. Login to your subaccount with [Cloud Foundry CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html), running `cf login`.
3. [Bind services for hybrid testing](https://cap.cloud.sap/docs/advanced/hybrid-testing) and development (create Service Keys if necessary).

   ```bash
   cd api # make sure to execute in the api directory
   cf create-service-key citizen-genai-rag-uaa citizen-genai-rag-uaa-key
   cds bind -2 citizen-genai-rag-uaa
   cf create-service-key citizen-genai-rag-destination citizen-genai-rag-destination-key
   cds bind -2 citizen-genai-rag-destination
   cf create-service-key citizen-genai-rag-hdi-container citizen-genai-rag-hdi-container-key
   cds bind -2 citizen-genai-rag-hdi-container
   ```

   After the services are bound successfuly, `api/.cdsrc-private.json` should exist with the `hybrid` profile.

4. Run `npm run watch:api` or `yarn watch:api` from project root to start CAP backend.
5. Duplicate `api/test/requests.sample.http` to `api/test/requests.http` and enter UAA details from the Service Key of the `citizen-genai-rag-uaa` instance to execute the requests.

#### if UI is attached (tbd)

1. Duplicate `router/dev/default-services.sample.json` to `router/dev/default-services.json` and enter UAA details from the Service Key of the `citizen-genai-rag-uaa` instance.
2. Run `npm run watch` or `yarn watch` from project root to start the Approuter and CAP backend.

### MANUAL CDS DEPLOYMENT TO SAP HANA CLOUD

1. Duplicate `api/default-env.sample.json` to `api/default-env.json` and enter the credentials from the Service Key of the `citizen-genai-rag-hdi-container` instance.
2. Run `cds deploy -2 hana` in `api`.

## ACKNOWLEDGEMENTS
**Huge efforts and big thanks to the team who have developed the [Reference repository](https://github.com/SAP-samples/btp-cap-genai-rag/blob/cap-citizen-genai-rag/README.md):**
- [Adi Pleyer](https://github.com/AdiPleyer)
- [Iyad Al Hafez](https://github.com/Iyad-Alhafez)
- [Julian Schambeck](https://github.com/julian-schambeck)
- [Kay Schmitteckert](https://github.com/kay-schmitteckert)
- [Martin Frick](https://github.com/martinfrick) 
- Karen Detken
- Hyun Lee

**Special thanks to SAP HANA Product Team for the review & advisory**
1. Markus Fath
2. Mathias Kemeter
3. Thomas Hammer
4. Shabana Samsudheen