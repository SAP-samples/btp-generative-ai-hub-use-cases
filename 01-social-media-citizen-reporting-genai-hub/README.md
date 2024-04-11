> [!IMPORTANT]
> Repository Under Construction - Please visit back for more updates
# Augment your SAP BTP Use Cases with AI Foundation: Generative AI Hub
## Citizen Reporting app for Public Administrations

This repository aims to showcase a BTP-based use case empowered by Generative AI Hub so that can inspire you in building similar use cases. 
The use case is around a fictitious city called "Sagenai City" facing challenges in managing and tracking maintenance in public areas. The city wants to improve the way they handle reported issues from the citizens, by analyzing social media posts & making informed decisions and so effectively tracking & managing issues in public spaces.

For this proof-of-concept, we have developed a prototype leveraging SAP Generative AI Hub to analyze social media posts & give relevant insights and prioritize maintenance requests, which in return will offer efficient resolution to incidents, and provide improved visibility on the city’s infrastructure status.

<img width="1082" alt="GenAIUseCase" src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/18447094/4c4414be-fcb6-4e85-a100-09e1575c6ed3">

Let’s imagine the following business scenario to realize the power behind leveraging Generative AI Capabilities:

Step1: John reports an incident thru a post on the city’s community page based in Reddit Platform, to raise attention to the community members.

Step2: The citizen reporting app receives the post as to notify the responsible persons from the public administration office through the app.

Step3: Afterwards, the post is processed & analyzed by the corresponding Large Language Model through SAP Generative AI Hub in order to extract key points behind the incident and derive insights as the following: summarize the issue, identify the issue type, its urgency level, plus determine the incident’s location address, and finally analyze the sentiment behind the post.

Step4: After then Mary a Maintenance Manager, reviews the incident details which were extracted and summarized earlier by Generative AI. She then decides whether to approve or reject the incident and takes the necessary actions with the help of SAP S/4HANA Cloud accordingly.

As a result, Mary will save time thru the reporting process thanks to the powerful text analysis by Generative AI which in return empower her to do her job easier & better!

You can get the source code for the different modules implemented as part of our proof of concept in the folders shared in this repository:

File or Folder | Purpose
---------|----------
`orchestrator/` | JavaScript CAP orchestrator app including Generative AI Hub integration, SAP S/4HANA Cloud Maintenance Notifications creation and Reddit APIs integration.
`promt_enginnering/` | prompt to be sent to Generative AI
`python_app/` | Python application integrating with SAP's Generative AI Hub showing how to use the SAP's Generative AI Hub SDK
`sap_build_app/` | SAP Build Apps package containing the prototyped User Interface

