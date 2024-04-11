> [!IMPORTANT]
> Repository Under Construction - Please visit back for more updates
# Augment your SAP BTP Use Cases with AI Foundation: SAP HANA Cloud, Vector Engine
[![License: Apache2](https://img.shields.io/badge/License-Apache2-green.svg)](https://opensource.org/licenses/Apache-2.0)
[![REUSE status](https://api.reuse.software/badge/github.com/SAP-samples/btp-generative-ai-hub-use-cases)](https://api.reuse.software/info/github.com/SAP-samples/btp-generative-ai-hub-use-cases)
## Citizen Reporting app for Public Administrations

This repository aims to showcase a BTP-based use case empowered by Generative AI Hub so that can inspire you in building similar use cases. 
More details about the use case can be found [here](https://partneredge.sap.com/en/library/education/products/btp/build/e_ep_use-cases_ai-foundation.html?#accordion-panel-section-libraryItem-descriptionSection-accordionitem_694022185).
The use case is around a fictitious city called "Sagenai City" facing challenges in managing and tracking maintenance in public areas. The city wants to improve the way they handle reported issues from the citizens, by analyzing social media posts & making informed decisions and so effectively tracking & managing issues in public spaces.

For this proof-of-concept, we have developed a prototype leveraging SAP Generative AI Hub to analyze social media posts & give relevant insights and prioritize maintenance requests, which in return will offer efficient resolution to incidents, and provide improved visibility on the city’s infrastructure status.

<img width="1082" alt="GenAIUseCase" src="https://github.wdf.sap.corp/storage/user/54234/files/1bb88cf3-71dd-4af3-b982-0528d1077aa4">

You can get the source code for the different modules implemented as part of our proof of concept in the folders shared in this repository:

File or Folder | Purpose
---------|----------
[`cap-app/`](cap-app) | NodeJS (with TypeScript) CAP orchestrator app including SAP HANA Cloud, Vector Engine, Generative AI Hub integration, SAP S/4HANA Cloud Maintenance Notifications creation and Reddit APIs integration.
[`build-app/`](build-app) | SAP Build Apps package containing the prototyped User Interface
[`python-app/`](python-app) | A Python microservice app deployed on Cloud Foundry runtime. Simple Implementation of Retrieval Augmented Generation (RAG) using SAP HANA Vector Engine, Langchain and SAP Generative AI Hub SDK.
[`python-helper/`](python-helper) | Python scripts integrating with SAP's Generative AI Hub showing how to use the SAP's Generative AI Hub SDK along side with hana-ml to perform Embeddings & Similarity Search functions. The helper file helps to preload the HDI with vector data.
[`rag-getting-started/`](rag-getting-started) | This repository provides some code examples that help you getting started with the vector engine.

