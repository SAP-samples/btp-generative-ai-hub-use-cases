# In-Database Embeddings Backend

This is the backend component for the "In-Database Embeddings" project, part of the [SAP BTP Generative AI Hub Use Cases](https://github.com/SAP-samples/btp-generative-ai-hub-use-cases) (folder `50-indb-embeddings/backend`). It demonstrates how to use SAP HANA Cloud’s in-database text embeddings, performing semantic similarity search and RAG (Retrieval-Augmented Generation).

---

##  Prerequisites

- SAP BTP with Cloud Foundry
- Git
- SAP HANA Cloud instance with Vector Engine
- SAP AI Core / Generative AI Hub access

---

##  Clone the Repository

```bash
git clone https://github.com/SAP-samples/btp-generative-ai-hub-use-cases.git
cd btp-generative-ai-hub-use-cases/50-indb-embeddings/backend

```

After cloning the repository, you can directly deploy the backend to Cloud Foundry with:

```bash
cf push indb-embeddings-backend
```

> **Note 1:** After `cf push`, the app may remain stuck in the **"instance starting"** stage.  
> This usually happens because the required environment variables are not set.  
> 
> The repository includes a `set-env.rb` file with **sample commands** for setting environment variables.  
> These are **examples only** — you must update them with your own credentials and configuration before running.  
> 
> Example workflow:
> 
> 1. Open `set-env.rb` and replace the placeholder values with your actual credentials.  
> 2. Copy and paste the updated `cf set-env ...` commands into your terminal.  
> 3. Restart the app to apply the changes:
> 
> ```bash
> cf restart indb-embeddings-backend
> ```

> **Note 2:** Make sure to adjust the Python version in the `runtime.txt` file to a version supported by Cloud Foundry at deploying time.

> **Note 3:** Keep the memory limit set to at least `4G` in the `manifest.yml`.  
> Deployments using **uWSGI** require significant memory during the staging process on Cloud Foundry, and lower values may cause staging failures.
