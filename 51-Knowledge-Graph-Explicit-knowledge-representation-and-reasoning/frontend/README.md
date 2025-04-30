# Smart Advisory Companion: A Node.js Microservice on Cloud Foundry

### Note: This repository requires a deployment of our previous use case as some functionalities from [btp-generative-ai-hub-use-cases/50-indb-embeddings](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/tree/main/50-indb-embeddings) co-exists with this use case. Thus, it is required for the backend to be deployed. More details below.

## Explicit knowledge representation and reasoning with Knowledge Graphs

This project showcases a simple Node.js application, deployed on Cloud Foundry, designed to demonstrate a streamlined user journey for advisory request support. Acting as a smart advisory companion, it empowers users by delivering actionable insights directly related to their requests.

Leveraging a standalone Node.js architecture, chosen for its seamless integration with our existing Python-based proxy APIs, which will be elaborated in the pre-requisites.

> [!IMPORTANT]
Please note that this proof of concept serves as an inspiration for you partners who are looking to develop your own solution adopting Generative AI, specifically SAP AI Core (extended service plan).

## Business Scenario
[<img src="https://github.com/user-attachments/assets/70434c77-f9a4-4fa2-8f25-5964bcf3191f"/>](https://github.com/user-attachments/assets/70434c77-f9a4-4fa2-8f25-5964bcf3191f)

### What if John or Mary wants to ask something like:

“Tell me the SAP employees who delivered a service of type “SAP BTP Technical Advisory” regarding “Multi-tenancy” ?

#### Enhanced Advisory Buddy:  Querying in natural language
[<img src="https://github.com/user-attachments/assets/e8131894-dacb-4561-bcc5-4d7beeced8cf"/>](https://github.com/user-attachments/assets/e8131894-dacb-4561-bcc5-4d7beeced8cf)

#### Enhanced Advisory Buddy: KG Engine and Vector Engine
[<img src="https://github.com/user-attachments/assets/1d630344-c6c2-4ee8-8756-d0c07e43470e"/>](https://github.com/user-attachments/assets/1d630344-c6c2-4ee8-8756-d0c07e43470e)

## Persona
[<img src="https://github.com/user-attachments/assets/1c66cbb1-dbff-4815-badb-5055555a09eb"/>](https://github.com/user-attachments/assets/1c66cbb1-dbff-4815-badb-5055555a09eb)

[<img src="https://github.com/user-attachments/assets/9bf672c1-a8a0-4a5f-a131-c7334d72a0c6"/>](https://github.com/user-attachments/assets/9bf672c1-a8a0-4a5f-a131-c7334d72a0c6)

## Solution Architecture
[<img src="https://github.com/user-attachments/assets/9b1aa4fe-2026-4c26-9f24-a0ab516882f7"/>](https://github.com/user-attachments/assets/9b1aa4fe-2026-4c26-9f24-a0ab516882f7)

## Pre-requisites
Below are some setup steps that are required to ensure a success deployment of the application. As this KG use case is a build-up from previous use case, there is a dependency of deploying the indb-embedding use case. For more info, please refer to [btp-generative-ai-hub-use-cases/50-indb-embeddings](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/tree/main/50-indb-embeddings).
1. there's a dependency of deploying this backend [btp-generative-ai-hub-use-cases/50-indb-embeddings/backend](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/tree/main/50-indb-embeddings), as some of the pages are showing features of the indb-embedding use case.
2. make sure this current use case's backend [btp-generative-ai-hub-use-cases/51-Knowledge-Graph-Explicit-knowledge-representation-and-reasoning/backend](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/tree/main/51-Knowledge-Graph-Explicit-knowledge-representation-and-reasoning/backend) is deployed & running.

Later on, you will be using these 2 different endpoints to define in your User Defined variables in CF (for CF deployment) & local deployment (.env file).<br>
e.g.<br>
PY_ENDPOINT="https://indb-embedding-x.cfapps.eu12.hana.ondemand.com"<br>
KG_ENDPOINT="https://kgwebinar-x.cfapps.eu12.hana.ondemand.com"

## Steps to Run Locally (for development purpose)
- create an .env file in root level
- in the .env file, have the following values<br>
PY_ENDPOINT="https://indb-embedding-x.cfapps.eu12.hana.ondemand.com"<br>
KG_ENDPOINT="https://kgwebinar-x.cfapps.eu12.hana.ondemand.com"
- you may refer to .env_sample.
- npm install
- to run locally: node app.js

## Steps to Deploy (in BTP Cloud Foundry)
- cf login
- cf push ui5node-poc-knowledgegraph -k 256MB -m 256MB
- cf set-env ui5node-poc-knowledgegraph PY_ENDPOINT https://indb-embedding-x.cfapps.eu12.hana.ondemand.com
- cf set-env ui5node-poc-knowledgegraph KG_ENDPOINT https://kgwebinar-x.cfapps.eu12.hana.ondemand.com
- cf restart ui5node-poc-knowledgegraph