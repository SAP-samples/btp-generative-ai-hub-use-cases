# Setup environment

1. Create a python environment

```
pip install --user virtualenv
python -m venv gen-ai-hub
source gen-ai-hub/bin/activate
pip install hana-ml
pip install shapely
pip install jupyterlab
pip install notebook
pip install --user ipykernel
python -m ipykernel install --user --name=gen-ai-hub
```

Download the following packages from github. SAP VPN required.
```
pip install git+https://github.wdf.sap.corp/AI/ai-api-client-sdk.git@v2.0.0#egg=ai-api-client-sdk
pip install git+https://github.wdf.sap.corp/AI/ai-core-sdk.git@v2.0.0#egg=ai-core-sdk
pip install git+https://github.wdf.sap.corp/AI/generative-ai-hub-sdk.git#egg=gen-ai-hub
```

After downloading the gen_ai_hub SDK, you need to create a folder named .aicore_llm in your home directory and inside you need to create a config.json file like this:

```
{
    "AICORE_LLM_AUTH_URL": " ... ",
    "AICORE_LLM_CLIENT_ID": " ... ",
    "AICORE_LLM_CLIENT_SECRET": " ... ",
    "AICORE_LLM_API_BASE": " ... ",
    "AICORE_LLM_RESOURCE_GROUP": " ... "
}
```