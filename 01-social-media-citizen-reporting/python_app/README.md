# A Python micro-service app to consume foundation models through Generative AI Hub

The design of our citizen issue reporting application includes several components, each one responsible for a certain system integration. All the components and steps are orchestrated by the Cloud Application Programming Model (in short CAP) micro-service described [here](../orchestrator/).

<img width="1596" alt="Screenshot 2024-02-19 at 15 49 51" src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/1317854/4c970908-cc92-4cd0-9e19-35c1bf5b5666">


In this folder of the repository you can find the material to develop a specific part of our application in Python, as alternative option in addition to the JavaScript development.

In particular, with this prototype we show how we it is possible to consume Generative AI Hub in Python thanks to its [SDK](https://pypi.org/project/generative-ai-hub-sdk/), and how to implement these as a new service in Cloud Foundry.

We have to keep in mind what we want to achieve with this development: we basically want to expose on the internet a new service through an endpoint, a service that is able to extract some useful information about our fictitious city from citizen social media posts with large language models. Such a service will be, by design, consumable from a client like Postman or easily integrable in a more sophisticated application.


> [!IMPORTANT]
Please, note that this proof of concept could serve as an inspiration for you partners who are looking to develop your own solution adopting Generative AI, specifically SAP AI Core (extended service plan).

# Pre-requisites
Below there are some setup steps that are required to ensure a success deployment of the application.

* You have a productive account for SAP Business Technology Platform (SAP BTP).
* You have created a subaccount and a space on Cloud Foundry Environment.
* You have a SAP AI Core (extended service plan). For more info, please refer to this [blog](https://community.sap.com/t5/technology-blogs-by-sap/generative-ai-hub-out-now/ba-p/13580462) about the availability of SAP Generative AI Hub. As of the date of this repository, it is still not available for trial.
* You have deployed at least one model in AI Core to be consumed through Generative AI Hub. More details can be found in this tutorial: 
[Prompt LLMs in the generative AI hub in SAP AI Core & Launchpad](https://developers.sap.com/tutorials/ai-core-generative-ai.html)
and in this demo:

    [![Watch the video](https://img.youtube.com/vi/iq-sWQbOlho/maxresdefault.jpg)](https://youtu.be/iq-sWQbOlho)

* Python is installed locally. In this prototype, we use Python version 3.11.x.
* The Cloud Foundry CLI is installed locally.

To learn more about how to [Consume Generative AI Models](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/consume-generative-ai-models-using-sap-ai-core).


# Getting Started

Below you can find a description of the material in this folder:

File or Folder | Purpose
---------|----------
`app/` | It contains the [Python application code](./app/issue_reporting_app.py) with all the logic and the Python code for the [serving application](./app/server.py), as this application will be a web server utilizing the Flask web framework.
`Procfile` | It specifies the commands that are executed by the app on startup, for instance the app's web server.
`manifest.yml` | Configuration describing your application and how it will be deployed to Cloud Foundry
`requirements.txt` | List of paskages and dependencies needed to run the server and execute the Python class methods.
`runtime.txt` | It specifies the Python runtime version that your application will run on.
`README.md` | This getting started guide


# Description

For a description of the logic implemented in the core Python class, please have a look at this demo:

[![Watch the video](https://img.youtube.com/vi/1hk0E6Lsejs/maxresdefault.jpg)](https://youtu.be/1hk0E6Lsejs)

We can use the Cloud Foundry runtime to deploy this Python class as a new service. In order to do that, we need to write some additional code for the Flask web server that will serve and expose on the internet our Python class through an endpoint.

1. We need a requirement.txt file where to specify all the packages dependencies required to make our class work in the container will be created at the deployment time.

2. We need also a manifest.yml file which represents the configuration describing the application and now it will be deployed to Cloud Foundry. There we specify the name of the app, the computing resource needed to run it and the other SAP BTP services we might want to bind, for example a HANA Cloud DB.

3. We need to add a runtime.txt that specifies the Python runtime version that the application will run on.

4. We need to create a Procfile that specifies the commands that are executed by the app on startup, for instance the app's web server.


# Steps to Deploy

Below the list of commands to deploy the Python application from command line with CF CLI.

1. Open a command-line console.
2. Set the Cloud Foundry API endpoint for your subaccount. Execute (using your actual region URL):

    ```shell
    cf api https://api.cf.<YOUR-REGION>.hana.ondemand.com
    ```

3. Log in to SAP BTP, Cloud Foundry environment:

    ```shell
    cf login
    ```

4. When prompted, enter your user credentials: the email and password you have used to register your productive SAP BTP account.

5. Choose the org name and space where you want to create your application.

6. Deploy the application on Cloud Foundry. To do that, execute:

    ```shell
    cf push --random-route
    ```

    Make sure you always execute cf push in the directory where the manifest.yml file is located!

7. When the staging and deployment steps are completed, the application should be successfully started and its details displayed in the command console.

8. Keep note of the generated URL of the application (see routes). The complete URL can be built by checking the application route by adding the endpoint specified in the server code. These details can be also checked from the BTP subaccount.

<img width="1661" alt="Screenshot 2024-02-19 at 17 39 50" src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/1317854/4933a444-8350-4700-8d82-e5a9374df214">



## Parameters to be defined

In order to make the python application work and establish a connection to AI Core and access the models there, we need to provide the AI Core connection credentials. We can simply create the needed environment variables for our application once it is deployed in Cloud Foundry. Below the variables to create, the values come from the AI Core service key previously created in the SAP BTP subaccount:

* AICORE_CLIENT_ID: This represents the client ID.
* AICORE_CLIENT_SECRET: This stands for the client secret.
* AICORE_AUTH_URL: This is the URL used to retrieve a token using the client ID and secret.
* AICORE_BASE_URL: This is the URL of the service (with suffix /v2).
* AICORE_RESOURCE_GROUP: This represents the resource group that should be used.

<img width="1082" alt="Screenshot 2024-02-19 at 17 38 06" src="https://github.com/SAP-samples/btp-generative-ai-hub-use-cases/assets/1317854/544982f4-c133-4c7a-a283-25d1658ee49d">

