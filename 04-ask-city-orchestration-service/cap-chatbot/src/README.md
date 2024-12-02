# Getting Started

Welcome to the btp-cap-genai-orchestration sample project about citizen reporting app.

It contains these folders and files, following our recommended project layout:

| File or Folder | Purpose                              |
| -------------- | ------------------------------------ |
| `app/`         | content for UI frontends goes here   |
| `db/`          | your domain models and data go here  |
| `srv/`         | your service models and code go here |
| `package.json` | project metadata and configuration   |
| `readme.md`    | this getting started guide           |

## Pre-requisites
- You have provisioned an SAP AI Core instance and SAP AI Launchpad with [SAP Generative AI Hub](https://help.sap.com/docs/ai-launchpad/sap-ai-launchpad/generative-ai-hub) enabled.
- You have created a [model deployment](https://help.sap.com/docs/ai-launchpad/sap-ai-launchpad/activate-generative-ai-hub-for-sap-ai-launchpad) in your SAP Generative AI Hub, such as gpt-4o etc.
- You have created a deployment of [Orchestration Service](https://help.sap.com/docs/ai-launchpad/sap-ai-launchpad/create-deployment-for-orchestration) in your SAP AI Core instance.
- You have provisioned SAP Business Application Studio in your SAP BTP and created a new Dev space for Full-stack Business Application Development. or you can use Visual Studio Code to local development.
- [Only required for Production Development] You have provisioned SAP Build Work Zone, Standard Edition in your SAP BTP Account as per [this document](https://help.sap.com/docs/build-work-zone-standard-edition/rise-grow-standard-edition-enablement/getting-started-with-sap-build-work-zone-standard-edition)

## Download, Install and Run in Development Environment

- Download the sample project from github with command below:
```sh
git clone https://github.com/SAP-samples/btp-generative-ai-hub-use-cases.git
cd btp-cap-genai-orchestration/cap-chatbot/src
```

- Install typescript and tsx package globally with command below
```sh
npm i -g typescript ts-node
npm i -g tsx
```
More info, refer here.
https://cap.cloud.sap/docs/node.js/typescript

- Install the dependences and configure the environment variable for AICORE_SERVICE_KEY(For development mode only). Please download the service key of your SAP AI Core Instance from BTP Cockpit and replace below
```sh
npm install
export AICORE_SERVICE_KEY='{
  "serviceurls": {
    "AI_API_URL": "<YOUR_AI_API_URL>"
  },
  "appname": "<YOUR_APP_NAME>",
  "clientid": "<YOUR_CLIENT_ID>",
  "clientsecret": "<YOUR_CLIENT_SECRET>",
  "identityzone": "<YOUR_IDENTITY_ZONE>",
  "identityzoneid": "<YOUR_IDENTITY_ZONE_ID>",
  "url": "<YOUR_URL>"
}'
```

- To run the sample code, please run the command below
```sh
npm run watch
```

- To debug, please attach to node after running `npm run watch`

- To edit the source code, for example, [db/schema.cds](db/schema.cds) etc.

## Acknowledgement and Credit
This sample is a fork of [btp-cap-rag-ai-workshop](https://github.com/mauriciolauffer/btp-cap-rag-ai-workshop/tree/main) by our SAP colleague [Mauricio Lauffer](https://github.com/mauriciolauffer/btp-cap-rag-ai-workshop/commits?author=mauriciolauffer). The original sample is a full-stack CAP sample application of RAG(Retrieval Augmented Generation) with SAP HANA Cloud, Vector Engine and SAP Generative AI Hub using cap-llm-plugin. It offers a document upload capability, allow the end user to upload document for embedding and storing in SAP HANA Cloud, and a nice chat interface to chat over the custom knowledge base in SAP HANA Cloud. It encompasses a typical RAG solution with text chunking, embedding, vector DB, and query, in which you have the full control of the whole process, it also comes alone with the responsibility of handling the complexity. <br/>
<br/>
In this fork, we have just replaced the RAG part with the Orchestration Service through [@sap-ai-sdk/orchestration](https://www.npmjs.com/package/@sap-ai-sdk/orchestration) including Grounding for out-of-box RAG capability, Prompt Template, Data Masking for data privacy, and Content Filter for security etc. In addition, we have also referred to SAP official [cap sample](https://github.com/SAP/ai-sdk-js/tree/main/sample-cap) of ai-sdk-js.
