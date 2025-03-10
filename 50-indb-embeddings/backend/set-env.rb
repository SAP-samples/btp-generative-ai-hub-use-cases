cf set-env indb-embedding-v2 DB_ADDRESS yourinstance.hna0.prod-eu10.hanacloud.ondemand.com
cf set-env indb-embedding-v2 DB_PORT 443
cf set-env indb-embedding-v2 DB_USER DBUSER
cf set-env indb-embedding-v2 DB_PASSWORD yourpwd
cf set-env indb-embedding-v2 AICORE_AUTH_URL 'https://yourinstance.authentication.eu10.hana.ondemand.com/oauth/token'
cf set-env indb-embedding-v2 AICORE_CLIENT_ID 'yourcid'
cf set-env indb-embedding-v2 AICORE_CLIENT_SECRET 'yourcs'
cf set-env indb-embedding-v2 AICORE_BASE_URL 'https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2'
cf set-env indb-embedding-v2 AICORE_RESOURCE_GROUP 'default'
cf restage indb-embedding-v2