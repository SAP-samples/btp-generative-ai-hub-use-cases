from langchain.chains import RetrievalQA
from flask import Blueprint, request, jsonify
import os
import configparser

# For consuming SAP Generative AI Hub EMBEDDINGS model
from gen_ai_hub.proxy.langchain.init_models import init_embedding_model

# HANADB Client to initiate DB connection
from hdbcli import dbapi

#Langchain to work with HANA Vector Engine
from langchain_community.vectorstores.hanavector import HanaDB

# For consuming SAP Generative AI Hub CHAT COMPLETITION model
from gen_ai_hub.proxy.langchain.init_models import init_llm

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
    
print('TCM: Connecting to HANA Cloud DB')
# Now we connect to the HANA Cloud instance
conn = dbapi.connect(
    address=hanaURL,
    port=hanaPort,
    user=hanaUser,
    password=hanaPW
)

get_direct_answer_blueprint = Blueprint('get-direct-answer', __name__)
@get_direct_answer_blueprint.route('/get-direct-answer', methods=['GET'])
def get_direct_answer():
    try:
        mytable = request.get_json()['myTable']
        
        # We initialize the Embeddings model from our Generative AI Hub
        embed = init_embedding_model('text-embedding-ada-002')
        
        # And create a LangChain VectorStore interface for the HANA database and 
        # specify the table (collection) to use for accessing the vector embeddings
        db = HanaDB(
            embedding=embed, connection=conn, table_name=mytable
        )
        
        llm = init_llm('gpt-35-turbo', max_tokens=300, temperature=0.0)
        query = request.get_json()['query']
        qa_chain = RetrievalQA.from_chain_type(
            llm,
            retriever=db.as_retriever()
        )
        response = qa_chain({"query": query})
        print(response['result'])

        return jsonify({'answer': response['result']}),200
    
    except Exception as e:
        return jsonify({'message': str(e)}), 500