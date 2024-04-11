from flask import Blueprint, request, jsonify

import os
import configparser

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

insert_txt_as_vector_blueprint = Blueprint('insert-txt-as-vector', __name__)

@insert_txt_as_vector_blueprint.route('/insert-txt-as-vector', methods=['POST'])
def insert_txt_as_vector():
    text = request.get_json()['text']
    textList = [text]
    myTable = request.get_json()['myTable']
    myVectorColumn = request.get_json()['myVectorColumn']
    myTextColumn = request.get_json()['myTextColumn']

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
            embedding=embed, connection=conn, table_name=myTable, content_column=myTextColumn, vector_column=myVectorColumn
        )

        # add the text
        db.add_texts(textList)
        return jsonify({'message': 'Done'}),200
    except Exception as e:
        return jsonify({'message': str(e)}), 500