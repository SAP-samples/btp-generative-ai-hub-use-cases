# A micro-service CAP app for an Use Case adopting SAP AI Core, SAP Generative AI Hub (AI Foundation), SAP S/4HANA Cloud and Reddit (Social Media)
To orchestrate the flow (as illustrated in the solution architecture diagram below) going from the retrieving posts from a social media platform (Reddit), processing through extraction & summarising capabilities of the LLM of SAP Generative AI Hub, through all the way to the final outcome – which could be a Maintenance Notification transaction in SAP S/4HANA Cloud – we develop and deploy a Cloud Application Programming Model (in short CAP) micro-service to facilitate with these process flows. 

This micro-service endpoint will actually represent the single entry point for the whole process flow end-to-end, as described above and elaborated in the Business Scenario shown below.
It orchestrates APIs from various SAP BTP services such as the SAP AI Core service for Generative AI Hub API and the SAP S/4HANA Cloud OData API for creating Maintenance Notifications, as well as external third-party services from Reddit. The integration with these services is made possible through the SAP Destination service, ensuring secure connectivity. The SAP Cloud Identity service is used for managing authorization and authentication across different components, including SAP S/4HANA Cloud. The incidents created are stored in SAP HANA Cloud using the Cloud Application Programming Model. Overall, this micro-service plays a crucial role in enabling seamless communication and integration between various services and components within the Citizen Reporting app architecture.

> [!IMPORTANT]
Please note that this proof of concept could serve as an inspiration for you partners who are looking to develop your own solution adopting Generative AI, specifically SAP AI Core (extended edition).

## Business Scenario
[<img src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/b7834d78-7abd-4e1e-a04b-ef665f0c80ee"/>](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/b7834d78-7abd-4e1e-a04b-ef665f0c80ee)

## Solution Architecture
[<img src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/a826c07b-304e-4849-9ac0-493a739536d6"/>](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/a826c07b-304e-4849-9ac0-493a739536d6)

## Pre-requisites
Below are some setup steps that are required to ensure a success deployment of the application.

### **(i) Obtain a SAP BTP Productive Account with SAP AI Core (extended edition)**. 
For more info, please refer to this [blog](https://community.sap.com/t5/technology-blogs-by-sap/generative-ai-hub-out-now/ba-p/13580462) about the availability of SAP Generative AI Hub.
As of the date of this repository, it is still not available for trial.

### **(ii) Set Up SAP HANA Cloud** 
Please complete this [tutorial](https://developers.sap.com/group.hana-cloud-setup.html).

### **(iii) Create Destinations in your SAP BTP Subaccount**
In order for this application to work, you are required to create 4 destinations of which the application requires to communicate with.

#### **(a) Connecting to a `S/4HANA Cloud System` via SAP BTP Connectivity Destination**
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

_Please note that the above destination name `S4HC_GENAI` is being used (thus please **DO NOT** change) and defined inside [package.json](package.json) for the app and will be used in the **Custom Logic** file on S/4HANA Maintenance Notification `Line 35` located in [orchestrator/srv/service.js](srv/service.js)._ <p>
Prior to that, please make sure you've done your own testing of calling the API with Postman to ensure that your credentials works.


- destinations to create: GENAICORE | REDDIT_API | REDDIT_API_AUTH | S4HC_GENAI

## Parameters to be defined
deploymentUrl in manifest.yml: retrieve from AI Core
destinations name to follow suit: GENAICORE | REDDIT_API | REDDIT_API_AUTH | S4HC_GENAI

# Steps to Deploy
cds add hana
cds add cf-manifest (manifest file has been generated already, so skipping step)
cds add cf-manifest --force (to bring in hana db service)
npm install (this will install all libs & dependencies defined in package.json)
cds build --production
cf push
first time deployment might fail as hana db not created.
run this command manually
cf create-service hana hdi-shared social-citizen-genai-db
(details in service-manifest.yml)
cf push again once service is created

### Automate creation of services below
After deployment, it will fail, bind the following services
- destination
- xsuaa (required for cloud sdk s4 modules)
Above services can be configured automatically create and bind to app.

# Pending ToDo / Improvements
- parameterise credentials & apis (currently is hardcoded into function)
- use llm_commons/generative-ai-hub-sdk libraries to access LLMs - pending: available for JS? Released to partners before our session?

# Things to take note
NodeJS Buildpack version has to be modified in manifest.yml
buildpack: https://github.com/cloudfoundry/nodejs-buildpack.git#v1.8.15

# Getting Started

Welcome to your new project.

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`package.json` | project metadata and configuration
`readme.md` | this getting started guide


## Next Steps

- Open a new terminal and run `cds watch` 
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start adding content, for example, a [db/schema.cds](db/schema.cds).


## Learn More

Learn more at https://cap.cloud.sap/docs/get-started/.

