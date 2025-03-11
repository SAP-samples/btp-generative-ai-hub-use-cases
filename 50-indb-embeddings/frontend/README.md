# Smart Advisory Companion: A Node.js Microservice on Cloud Foundry

This project showcases a simple Node.js application, deployed on Cloud Foundry, designed to demonstrate a streamlined user journey for advisory request support. Acting as a smart advisory companion, it empowers users by delivering actionable insights directly related to their requests.

Leveraging a standalone Node.js architecture, chosen for its seamless integration with our existing Python-based proxy APIs, which will be elaborated in the pre-requisites.

> [!IMPORTANT]
Please note that this proof of concept could serve as an inspiration for you partners who are looking to develop your own solution adopting Generative AI, specifically SAP AI Core (extended service plan).

## Business Scenario
[<img src="https://github.com/user-attachments/assets/fee45f2b-cb0d-48cb-8d68-00824aaee706"/>](https://github.com/user-attachments/assets/fee45f2b-cb0d-48cb-8d68-00824aaee706)
[<img src="https://github.com/user-attachments/assets/05d75d3f-9081-4ed8-b0fc-9c3362550894"/>](https://github.com/user-attachments/assets/05d75d3f-9081-4ed8-b0fc-9c3362550894)

Key functionalities include similarity searches, knowledge base exploration for past requests, and cluster analysis insights for managers. This application is a foundational piece in an evolving use case story, with plans to integrate advanced AI agents, SAP Joule, SAP Knowledge Graph, and other innovative technologies. Stay tuned for future updates as we enhance this smart advisory companion.

## Persona
[<img src="https://github.com/user-attachments/assets/86472bb0-0417-4ef6-9308-d363f828fc6c"/>](https://github.com/user-attachments/assets/86472bb0-0417-4ef6-9308-d363f828fc6c)

## Solution Architecture
[<img src="https://github.com/user-attachments/assets/f7ac1a4d-e12a-426f-a978-867fabc585cb"/>](https://github.com/user-attachments/assets/f7ac1a4d-e12a-426f-a978-867fabc585cb)

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