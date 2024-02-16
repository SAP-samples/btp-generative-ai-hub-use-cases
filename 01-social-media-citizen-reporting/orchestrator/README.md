# A micro-service for SAP AI Core, GenAI Hub, SAP S/4HANA Cloud, Reddit
To orchestrate the flow (as illustrated in the solution architecture diagram below) going from the retrieving social media (Reddit) posts, processing through extraction & summarising capabilities of the LLM of SAP GenAI Hub, through  all the way to the final outcome – which could be a Maintenance Notification transaction in SAP S/4HANA Cloud – we develop and deploy a Cloud Application Programming Model (in short CAP) micro-service. 

This micro-service endpoint will actually represent the single entry point for the whole process flow end-to-end.
It orchestrates APIs from various SAP BTP services such as the SAP AI Core service for Generative AI APIs and the SAP S/4HANA Cloud OData APIs for creating Maintenance Notifications, as well as external third-party services from Reddit. The integration with these services is made possible through the SAP Destination service, ensuring secure connectivity. The SAP Cloud Identity service is used for managing authorization and authentication across different components, including SAP S/4HANA Cloud. The incidents created are stored in SAP HANA Cloud using the Cloud Application Programming Model. Overall, this micro-service plays a crucial role in enabling seamless communication and integration between various services and components within the Citizen Reporting app architecture.

## Business Scenario
[<img src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/b7834d78-7abd-4e1e-a04b-ef665f0c80ee"/>](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/b7834d78-7abd-4e1e-a04b-ef665f0c80ee)

## Solution Architecture
[<img src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/a826c07b-304e-4849-9ac0-493a739536d6"/>](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/a826c07b-304e-4849-9ac0-493a739536d6)

# Pre-requisites
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

