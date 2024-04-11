import os
import configparser

from flask import Blueprint, request, jsonify

#Langchain to work with HANA Vector Engine
from langchain_community.vectorstores.hanavector import HanaDB

# For consuming SAP Generative AI Hub EMBEDDINGS model
from gen_ai_hub.proxy.langchain.init_models import init_embedding_model

# HANADB Client to initiate DB connection
from hdbcli import dbapi

# Check if the application is running on Cloud Foundry
if 'VCAP_APPLICATION' in os.environ:
    # Running on Cloud Foundry, use environment variables
    hanaURL = os.getenv('DB_ADDRESS')
    hanaPort = os.getenv('DB_PORT')
    hanaUser = os.getenv('DB_USER')
    hanaPW = os.getenv('DB_PASSWORD')
else:
    # Not running on Cloud Foundry, read from config.ini file
    config = configparser.ConfigParser()
    config.read('config.ini')
    hanaURL = config['database']['address']
    hanaPort = config['database']['port']
    hanaUser = config['database']['user']
    hanaPW = config['database']['password']

get_context_blueprint = Blueprint('get-context', __name__)

@get_context_blueprint.route('/get-context', methods=['GET'])
def get_context():
    query = request.get_json()['query']
    try:
        #Initialize DB connection
        conn = dbapi.connect(
            address=hanaURL,
            port=hanaPort,
            user=hanaUser,
            password=hanaPW
        )
        
        # We initialize the Embeddings model from our Generative AI Hub
        embed = init_embedding_model('text-embedding-ada-002')

        # And create a LangChain VectorStore interface for the HANA database and 
        # specify the table (collection) to use for accessing the vector embeddings
        db = HanaDB(
            embedding=embed, connection=conn, table_name="GENAIQA"
        )

        # Perform a query to get the two best matching document chunks 
        # from the ones that we added in the previous step.
        # By default "Cosine Similarity" is used for the search.
        docs = db.similarity_search(query, k=2)
        
        # Extract the text from the most similar chunks
        # and assign it to the context variable
        docs_texts = []
        for doc in docs:
            docs_texts.append(doc.page_content)
        # context = docs_texts[0] + ' ' + docs_texts[1]
        context = docs_texts[0]
        
        return jsonify({'query': query, 'context': context}),200
    except Exception as e:
        return jsonify({'message': str(e)}), 500