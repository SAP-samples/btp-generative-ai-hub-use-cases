from flask import Blueprint, request, jsonify

import os
import configparser

# Langchain to help with Text Chuncks generation
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

#Langchain to work with HANA Vector Engine
from langchain_community.vectorstores.hanavector import HanaDB

# HANADB Client to initiate DB connection
from hdbcli import dbapi

# For consuming SAP Generative AI Hub EMBEDDINGS model
from gen_ai_hub.proxy.langchain.init_models import init_embedding_model

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

chunk_and_store_blueprint = Blueprint('chunk-and-store', __name__)

@chunk_and_store_blueprint.route('/chunk-and-store', methods=['POST'])

def chunk_and_store():
    filepath2load = request.get_json()['filePath']
    mytable = request.get_json()['myTable']
    separator = request.get_json()['separator']
    # Let's load the file into a variable
    text_documents = TextLoader(filepath2load).load()

    # Then we configure the way we want to generate the chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0, separators=[separator])

    # And create the chunks
    text_chunks = text_splitter.split_documents(text_documents)

    try:
        print('TCM: Connecting to HANA Cloud DB')
        # Now we connect to the HANA Cloud instance
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
            embedding=embed, connection=conn, table_name=mytable
        )

        # For this example, we delete any previous content from
        # the table which might exist from previous runs.
        db.delete(filter={})

        # add the loaded document chunks
        db.add_documents(text_chunks)
        print(text_chunks)
        print('TCM: Chunks added to TABLE')
        
        return jsonify({'response':'Chunks added to table: ' + mytable}),200
    except Exception as e:
        return jsonify({'message': str(e)}), 500