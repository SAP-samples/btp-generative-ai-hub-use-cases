import os
import configparser
import pandas as pd

from flask import Flask, request, jsonify
from flask_cors import CORS
from hana_ml import dataframe

from hana_ml.text.pal_embeddings import PALEmbeddings


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

connection = dataframe.ConnectionContext(hanaURL, hanaPort, hanaUser, hanaPW)

app = Flask(__name__)
CORS(app)

@app.route('/generate_text_embeddings_my_knowledgebase', methods=['POST'])
def update_embeddings_in_db():
    try:
        # Run a lightweight query to get only the TEXT_IDs that need embeddings:
        sql_select_ids = """
            SELECT ID FROM DBUSER.KNOWLEDGE_BASE_MANUAL WHERE TOPIC_EMBEDDING IS NULL
        """
        text_id_df = connection.sql(sql_select_ids).collect()
        
        if text_id_df.empty:
            return jsonify({"message": "No records found without embeddings."}), 200
        
        # Ensure it's now a DataFrame-like structure
        if isinstance(text_id_df, pd.DataFrame):
            # Extract TEXT_IDs into a list
            text_id_list = text_id_df['ID'].tolist()
        else:
            return jsonify({"error": "Unexpected data format for IDs"}), 500
        
        # Initialize a counter for the number of records processed
        records_processed = 0
        
        # Loop through the TEXT_IDs and fetch their corresponding TEXT values one by one:
        for text_id in text_id_list:
            sql_select_text = f"""
                SELECT ID, TOPIC, SOLUTION FROM DBUSER.KNOWLEDGE_BASE_MANUAL WHERE ID = '{text_id}'
            """
            
            text_df = connection.sql(sql_select_text)

            # Check if text_df is not empty
            if not text_df.collect().empty:
                # Generate embedding
                pe = PALEmbeddings()
                embedding_df = pe.fit_transform(data=text_df, key="ID", target=["TOPIC", "SOLUTION"])

                # Convert embedding to proper format
                embedding_records = embedding_df.collect().to_dict(orient="records")
                
                if embedding_records:
                    # Update database
                    sql_update = """
                        UPDATE DBUSER.KNOWLEDGE_BASE_MANUAL
                        SET TOPIC_EMBEDDING = ?,
                        SOLUTION_EMBEDDING = ?
                        WHERE ID = ?
                    """
                    cursor = connection.connection.cursor()
                    cursor.execute(sql_update, 
                                   (embedding_records[0]["VECTOR_COL_TOPIC"], 
                                    embedding_records[0]["VECTOR_COL_SOLUTION"], 
                                    text_id))
                    cursor.close()
                    
                    # Increment the counter
                    records_processed += 1
                    
        return jsonify({"message": f"Embeddings updated successfully. Records processed: {records_processed}"}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Function to create the table if it doesn't exist
def create_table_if_not_exists():
    create_table_sql = """
        DO BEGIN
            DECLARE table_exists INT;
            SELECT COUNT(*) INTO table_exists
            FROM SYS.TABLES 
            WHERE TABLE_NAME = 'TCM_SAMPLE' AND SCHEMA_NAME = 'DBUSER';
            
            IF table_exists = 0 THEN
                CREATE COLUMN TABLE DBUSER.TCM_SAMPLE (
                    TEXT NVARCHAR(500),
                    VECTOR REAL_VECTOR
                );
            END IF;
        END;
    """
    
    # Execute the query
    cursor = connection.connection.cursor()
    cursor.execute(create_table_sql)
    cursor.close()

@app.route('/generate_text_embeddings', methods=['GET'])
def generate_text_embeddings():
    # SQL query to retrieve the top 3 text entries
    sql_select = """
        SELECT TOP 3 TEXT_ID, TEXT
        FROM DBUSER.TCM_MYKNOWLEDGEBASE
    """
    myknowledgebase_hdf = connection.sql(sql_select)

    # Generating Text Embeddings in SAP HANA Cloud with the new PAL function
    pe = PALEmbeddings()
    textembeddings = pe.fit_transform(myknowledgebase_hdf, key="TEXT_ID", target=["TEXT"])

    # Collect the results and convert to a list of dictionaries
    embeddings_list = textembeddings.collect().to_dict(orient='records')

    # Return the embeddings as a JSON response
    return jsonify({"text_embeddings": embeddings_list}), 200

# Function to insert text and its embedding vector into the sample table
@app.route('/insert_text_and_vector', methods=['POST'])
def insert_text_and_vector():
    
    # Create the table if it doesn't exist
    create_table_if_not_exists()

    data = request.get_json()
    text = data.get('text')
    text_type = data.get('text_type', 'DOCUMENT')
    model_version = data.get('model_version', 'SAP_NEB.20240715')

    # Generate the embedding vector using VECTOR_EMBEDDING
    sql_insert = f"""
        INSERT INTO tcm_sample (TEXT, VECTOR)
        SELECT '{text}', VECTOR_EMBEDDING('{text}', '{text_type}', '{model_version}')
        FROM DUMMY
    """
    
    # Execute the query
    cursor = connection.connection.cursor()
    cursor.execute(sql_insert)
    cursor.close()
    
    return jsonify({"message": "Text and vector inserted successfully"}), 200

# Function to compare a new text's vector to existing stored vectors using COSINE_SIMILARITY
@app.route('/compare_text_to_existing', methods=['POST'])
def compare_text_to_existing():
    data = request.get_json()
    query_text = data.get('query_text')
    text_type = data.get('text_type', 'QUERY')
    model_version = data.get('model_version', 'SAP_NEB.20240715')

    # Generate the new text's embedding and compare using COSINE_SIMILARITY
    sql_query = f"""
        SELECT TOP 5
            TEXT, 
            COSINE_SIMILARITY(
                VECTOR, 
                VECTOR_EMBEDDING('{query_text}', '{text_type}', '{model_version}')
            ) AS SIMILARITY
        FROM tcm_sample
        ORDER BY SIMILARITY DESC
    """
    hana_df = dataframe.DataFrame(connection, sql_query)
    similarities = hana_df.collect()  # Return results as a pandas DataFrame

    # Convert results to a list of dictionaries for JSON response
    results = similarities.to_dict(orient='records')
    return jsonify({"similarities": results}), 200

@app.route('/', methods=['GET'])
def root():
    return 'Embeddings API: Health Check Successfull.', 200

def create_app():
    return app

# Start the Flask app
if __name__ == '__main__':
    app.run('0.0.0.0', 8080)
    