from flask import Blueprint, request, jsonify

import os
import configparser

# Langchain to help with Text Chuncks generation
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter, HTMLHeaderTextSplitter

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

chunk_and_store_web_blueprint = Blueprint('chunk-and-store-web', __name__)
@chunk_and_store_web_blueprint.route('/chunk-and-store-web', methods=['POST'])

def chunk_and_store_web():
    urlToChunk = request.get_json()['urlToChunk']
    mytable = request.get_json()['myTable']
    
    headers2split = [
        ("h1", "Header 1"),
        ("h2", "Header 2"),
        ("h3", "Header 3"),
        ("h4", "Header 4"),
    ]

    html_splitter = HTMLHeaderTextSplitter(headers_to_split_on=headers2split)
    html_header_splits = html_splitter.split_text_from_url(urlToChunk)

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=30)

    # Split
    splits = text_splitter.split_documents(html_header_splits)
    splits[80:85]
    
    print(splits)
    # print(splits[80:85])
    
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
        # db.delete(filter={})

        # Extract the page_content from each Document object
        text_contents = [doc.page_content for doc in splits]

        # Add the text contents to the database
        db.add_texts(text_contents)
        print('TCM: Chunks added to TABLE')
        
        return jsonify({'response':'Chunks added to table: ' + mytable}),200
        
    except Exception as e:
        return jsonify({'message': str(e)}), 500