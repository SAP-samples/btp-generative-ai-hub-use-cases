# SAP HANA Cloud Vector Engine - Embed Business Context to your Generative AI Use Cases
Simple Implementation of Retrieval Augmented Generation (RAG) using SAP HANA Vector Engine, Langchain and SAP Generative AI Hub SDK.

[Watch the session replay here](https://partneredge.sap.com/en/library/education/psd/2024/mar/e_oe_te_w_PSD_WEB_00005630.html)

# Description
This repository is comprised by the backend microservices required by SAGENAICITY proof-of-concept described [here](https://partneredge.sap.com/en/library/education/psd/2024/jan/e_oe_te_w_PSD_WEB_00004648.html?source=PartnerEdge-PNL-Image-Educate%2FEnable-Global-Artificial_Intelligence-SAPPartnerEdge&campaigncode=CRM-YA23-SMS-1941768&sprinklrid=12465424311) to:
* Generate automatic replies to citizens of SAGENAICITY on social media
* Deduplicate reported issues to the SAGENAICITY administration
* more to come...

## Requirements
* SAP AI Core Extended with models ADA-002, and GPT-4 or GPT-35-Turbo models deployed.
* SAP HANA Cloud, Vector Engine.

## Deployment
Make sure your SAP BTP Subaccount has at least 2GB free runtime memory to deploy the app (staging phase needs it, then you can scale down to 128MB).  
Make sure you have the file ~/.aicore/config.json with your AI Core Extended credentials, [as per the intructions here](https://pypi.org/project/generative-ai-hub-sdk/), e.g.:

```config.json
{
    "AICORE_AUTH_URL": "https://yoursubaccount.authentication.yourregion.hana.ondemand.com/oauth/token",
    "AICORE_CLIENT_ID": "sb-f12345ad-1234-1234-aa1e-a12cb1a11223!b321321|aicore!b321",
    "AICORE_CLIENT_SECRET": "1234e123-1b2e-33dc-ad44-e123456acbdd$rw11FFoH1CLeZhi1Yg2CFyebyFwKaR-z1siTvAfgCk9=",
    "AICORE_BASE_URL": "https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2",
    "AICORE_RESOURCE_GROUP": "default"
}
```

1 - Clone this repository  
2 - Create a config.ini file within the root folder of the app with the following SAP HANA Cloud DB credentials:  

```config.ini
[database]
address = 2f2e34c5-876d-9876-a3f1-d54dfc11df42.hana.prod-eu12.hanacloud.ondemand.com
port = 443
user = DBADMIN
password = Y0urP4ssw0rd!

[reddit]
reddit_client_id = "Rq-123"
reddit_client_secret = "123-GGi4YRJQ"
reddit_user_agent = "GenAI Reporting App/0.1"
reddit_username = "username"
reddit_password = "12345"
```
This file will allow you to test the app locally.  
The .cfignore and .gitignore files will prevent it to be exposed.  
  
To run it on Cloud Foundry, after pushing the app to your account, provide both AI Core Extended and SAP HANA Cloud credentials:  
```command
cf set-env contextual-answers AICORE_AUTH_URL 'https://yoursubaccount.authentication.yourregion.hana.ondemand.com/oauth/token'
cf set-env contextual-answers AICORE_CLIENT_ID 'sb-f12345ad-1234-1234-aa1e-a12cb1a11223!b321321|aicore!b321'
cf set-env contextual-answers AICORE_CLIENT_SECRET '1234e123-1b2e-33dc-ad44-e123456acbdd$rw11FFoH1CLeZhi1Yg2CFyebyFwKaR-z1siTvAfgCk9='
cf set-env contextual-answers AICORE_BASE_URL 'https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2'
cf set-env contextual-answers AICORE_RESOURCE_GROUP 'default'
cf set-env contextual-answers DB_ADDRESS '2f2e34c5-876d-9876-a3f1-d54dfc11df42.hana.prod-eu12.hanacloud.ondemand.com'
cf set-env contextual-answers DB_PORT '443'
cf set-env contextual-answers DB_USER 'DBADMIN'
cf set-env contextual-answers DB_PASSWORD 'Y0urP4ssw0rd!'
cf set-env contextual-answers REDDIT_CLIENT_ID 'Rq-IEhjnDPf1nCCJR515ow'
cf set-env contextual-answers REDDIT_CLIENT_SECRET 'afvIvKS16qF7N9lZRmKev-GGi4YRJQ'
cf set-env contextual-answers REDDIT_USER_AGENT 'GenAI Reporting App/0.1'
cf set-env contextual-answers REDDIT_USERNAME 'username'
cf set-env contextual-answers REDDIT_PASSWORD '12345'
cf restage contextual-answers
```

#### Extra documentation
If you want to learn a more about the SAP HANA Cloud, Vector Engine, please check it out [here](https://)

## Support and Contributions
This repository is provided "as-is".  
No warranty or support is available.  
Feel free to open issues.

## License
This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the [LICENSE](LICENSES/Apache-2.0.txt) file.
