# Smart Advisory Companion: A Node.js Microservice on Cloud Foundry

This project showcases a simple Node.js application, deployed on Cloud Foundry, designed to demonstrate a streamlined user journey for advisory request support. Acting as a smart advisory companion, it empowers users by delivering actionable insights directly related to their requests.

Leveraging a standalone Node.js architecture, chosen for its seamless integration with our existing Python-based proxy APIs, which will be elaborated in the pre-requisites.

> [!IMPORTANT]
Please note that this proof of concept could serve as an inspiration for you partners who are looking to develop your own solution adopting Generative AI, specifically SAP AI Core (extended service plan).

## Business Scenario
[<img src="https://github.com/user-attachments/assets/3a28e5de-8c1d-4a76-a189-fd5f2eaeb589"/>](https://github.com/user-attachments/assets/3a28e5de-8c1d-4a76-a189-fd5f2eaeb589)

Key functionalities include similarity searches, knowledge base exploration for past requests, and cluster analysis insights for managers. This application is a foundational piece in an evolving use case story, with plans to integrate advanced AI agents, SAP Joule, SAP Knowledge Graph, and other innovative technologies. Stay tuned for future updates as we enhance this smart advisory companion.

## Persona
[<img src="https://github.com/user-attachments/assets/e8369e6a-9d35-43f3-aceb-4d19ad6623c0"/>](https://github.com/user-attachments/assets/e8369e6a-9d35-43f3-aceb-4d19ad6623c0)

## Solution Architecture
tbc
<!-- [<img src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/a826c07b-304e-4849-9ac0-493a739536d6"/>](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/8436161/a826c07b-304e-4849-9ac0-493a739536d6) -->

## Pre-requisites
Below are some setup steps that are required to ensure a success deployment of the application.
- make sure the backend python endpoint is up and running.

## Steps to Deploy
- npm install
- to run locally: node app.js
- cf login
- cf push ui5node-poc-embedding -k 256MB -m 256MB
- cf set-env ui5node-poc-embedding PY_ENDPOINT e.g. https://indbasd-asdembedding.cfapps.eu12.hana.ondemand.com
- cf restart ui5node-poc-embedding