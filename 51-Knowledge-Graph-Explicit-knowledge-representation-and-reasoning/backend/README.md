# KG webinar
Simple Implementation of KG using SAP HANA Triplestore

To deploy with cf push, make sure your manifest.yml is updated with all the relevant env variables.

e.g.

env:
      DB_ADDRESS: "xxx-fdfa-4bc1-8c2d-00ba382cce0b.hana.prod-eu12.hanacloud.ondemand.com"
      DB_PASSWORD: "xxx!"
      DB_PORT: "443"
      DB_USER: "DBADMIN"
      AICORE_AUTH_URL: "https://sa-gen-ai-xxx-xxx.authentication.eu10.hana.ondemand.com/oauth/token"
      AICORE_BASE_URL: "https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2"
      AICORE_CLIENT_ID: "sb-xxx-6201-xxx40"
      AICORE_CLIENT_SECRET: "96xxxw="
      AICORE_RESOURCE_GROUP: "default"