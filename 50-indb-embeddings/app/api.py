import os
import configparser

from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from hana_ml import dataframe

# Check if the application is running on Cloud Foundry
if 'VCAP_APPLICATION' in os.environ:
    from app.utilities_hana import kmeans_and_tsne  # works in CF
    
    # Running on Cloud Foundry, use environment variables
    hanaURL = os.getenv('DB_ADDRESS')
    hanaPort = os.getenv('DB_PORT')
    hanaUser = os.getenv('DB_USER')
    hanaPW = os.getenv('DB_PASSWORD')
else:
    from utilities_hana import kmeans_and_tsne  # works in local machine
    
    # Not running on Cloud Foundry, read from config.ini file
    config = configparser.ConfigParser()
    config.read('config.ini')
    hanaURL = config['database']['address']
    hanaPort = config['database']['port']
    hanaUser = config['database']['user']
    hanaPW = config['database']['password']

# Step 1: Establish a connection to SAP HANA
connection = dataframe.ConnectionContext(hanaURL, hanaPort, hanaUser, hanaPW)

app = Flask(__name__)
CORS(app)

# Function to create the CATEGORIES table if it doesn't exist
def create_categories_table_if_not_exists():
    create_table_sql = """
        DO BEGIN
            DECLARE table_exists INT;
            
            -- Check and create CATEGORIES table
            SELECT COUNT(*) INTO table_exists
            FROM SYS.TABLES 
            WHERE TABLE_NAME = 'CATEGORIES' AND SCHEMA_NAME = CURRENT_SCHEMA;
            
            IF table_exists = 0 THEN
                CREATE TABLE CATEGORIES (
                    "index" INTEGER,
                    "category_label" NVARCHAR(100),
                    "category_descr" NVARCHAR(5000),
                    "category_embedding" REAL_VECTOR 
                        GENERATED ALWAYS AS VECTOR_EMBEDDING("category_descr", 'DOCUMENT', 'SAP_NEB.20240715')
                );
            END IF;
        END;
    """
    
    # Use cursor to execute the query
    cursor = connection.connection.cursor()
    cursor.execute(create_table_sql)
    cursor.close()
    
# Function to create the PROJECT_BY_CATEGORY table if it doesn't exist
def create_project_by_category_table_if_not_exists():
    create_table_sql = """
        DO BEGIN
            DECLARE table_exists INT;
            
            -- Check and create PROJECT_BY_CATEGORY table
            SELECT COUNT(*) INTO table_exists
            FROM SYS.TABLES 
            WHERE TABLE_NAME = 'PROJECT_BY_CATEGORY' AND SCHEMA_NAME = CURRENT_SCHEMA;
            
            IF table_exists = 0 THEN
                CREATE TABLE PROJECT_BY_CATEGORY (
                    PROJECT_ID INT,
                    CATEGORY_ID INT
                );
            END IF;
        END;
    """
    
    # Use cursor to execute the query
    cursor = connection.connection.cursor()
    cursor.execute(create_table_sql)
    cursor.close()  
    
@app.route('/update_categories_and_projects', methods=['POST'])
def update_categories_and_projects():
    data = request.get_json()
    categories = data
    
    if not categories:
        return jsonify({"error": "No categories provided"}), 400
    
    cursor = connection.connection.cursor()
    
    # Ensure the CATEGORIES table exists
    create_categories_table_if_not_exists()
    
    # Drop existing values from the CATEGORIES table
    cursor.execute("TRUNCATE TABLE CATEGORIES")
    
    # Ensure the PROJECT_BY_CATEGORY table exists
    create_project_by_category_table_if_not_exists()
    
    # Drop existing values from the PROJECT_BY_CATEGORY table
    cursor.execute("TRUNCATE TABLE PROJECT_BY_CATEGORY")
    
    # Add custom categories to the CATEGORIES table
    for index, (title, description) in enumerate(categories.items()):
        insert_sql = f"""
            INSERT INTO CATEGORIES ("index", "category_label", "category_descr")
            VALUES ({index}, '{title.replace("'", "''")}', '{description.replace("'", "''")}')
        """
        cursor.execute(insert_sql)
    
    # Retrieve categories from the CATEGORIES table
    categories_df = dataframe.DataFrame(connection, 'SELECT * FROM CATEGORIES')
    
    # Retrieve topics from the ADVISORIES table
    advisories_df = dataframe.DataFrame(connection, 'SELECT "project_number", "topic" FROM ADVISORIES4')
    
    # Iterate over each advisory and calculate the most similar category
    for advisory in advisories_df.collect().to_dict(orient='records'):
        # print("Advisory columns:", advisory.keys())
        project_number = advisory['project_number']
        topic = advisory['topic']
        
        # Check if project_number is an integer
        if not isinstance(project_number, int):
            print(f"Skipping project_number={project_number} as it is not an integer")
            continue
    
        similarities = []
        # Iterate over each category and calculate the similarity
        for category in categories_df.collect().to_dict(orient='records'):

            category_id = category['index']
            category_description = category['category_descr']
            
            # Use HANA SQL for COSINE similarity
            similarity_sql = f"""
                SELECT COSINE_SIMILARITY(
                    VECTOR_EMBEDDING('{topic.replace("'", "''")}', 'DOCUMENT', 'SAP_NEB.20240715'),
                    VECTOR_EMBEDDING('{category_description.replace("'", "''")}', 'DOCUMENT', 'SAP_NEB.20240715')
                ) AS similarity
                FROM DUMMY
            """

            similarity_df = dataframe.DataFrame(connection, similarity_sql)
            similarity_results = similarity_df.collect()
            
            if not similarity_results.empty:
                similarity = similarity_results.iloc[0]['SIMILARITY']
                similarities.append((category_id, similarity))
            else:
                print(f"No similarity result for category_id={category_id} and topic={topic}")

        # Find the most similar category
        if similarities:
            most_similar_category = max(similarities, key=lambda x: x[1])
            category_id = most_similar_category[0]

            # Update PROJECT_BY_CATEGORY table
            insert_sql = f"""
                INSERT INTO "PROJECT_BY_CATEGORY" ("PROJECT_ID", "CATEGORY_ID")
                VALUES ('{project_number}', {category_id})
            """
            cursor.execute(insert_sql)
        else:
            print(f"No valid similarities found for project_number={project_number}")
    
    cursor.close()
    return jsonify({"message": "Categories and project categories updated successfully"}), 200

@app.route('/get_all_project_categories', methods=['GET'])
def get_all_project_categories():
    # SQL query to retrieve all records from the PROJECT_BY_CATEGORY table
    sql_query = """
        SELECT pbc."PROJECT_ID", c."category_label"
        FROM "PROJECT_BY_CATEGORY" pbc
        JOIN "CATEGORIES" c ON pbc."CATEGORY_ID" = c."index"
    """
    hana_df = dataframe.DataFrame(connection, sql_query)
    project_categories = hana_df.collect()  # Return results as a pandas DataFrame

    # Convert results to a list of dictionaries for JSON response
    results = project_categories.to_dict(orient='records')
    return jsonify({"project_categories": results}), 200

@app.route('/get_categories', methods=['GET'])
def get_categories():
    # SQL query to retrieve all records from the CATEGORIES table
    sql_query = """
        SELECT "index", "category_label", "category_descr"
        FROM "CATEGORIES"
    """
    hana_df = dataframe.DataFrame(connection, sql_query)
    categories = hana_df.collect()  # Return results as a pandas DataFrame

    # Convert results to a list of dictionaries for JSON response
    results = categories.to_dict(orient='records')
    return jsonify(results), 200

@app.route('/get_advisories_by_expert_and_category', methods=['GET'])
def get_advisories_by_expert_and_category():
    expert = request.args.get('expert')
    
    if not expert:
        return jsonify({"error": "Expert is required"}), 400
    
    # SQL query to retrieve the number of advisories by expert and category
    sql_query = f"""
        SELECT c."category_label" AS category, COUNT(a."project_number") AS projects
        FROM "PROJECT_BY_CATEGORY" pbc
        JOIN "CATEGORIES" c ON pbc."CATEGORY_ID" = c."index"
        JOIN "ADVISORIES4" a ON pbc."PROJECT_ID" = a."project_number"
        WHERE a."architect" = '{expert.replace("'", "''")}'
        GROUP BY c."category_label"
    """
    hana_df = dataframe.DataFrame(connection, sql_query)
    advisories_by_category = hana_df.collect()  # Return results as a pandas DataFrame

    # Convert results to a list of dictionaries for JSON response
    results = advisories_by_category.to_dict(orient='records')
    return jsonify({"advisories_by_category": results}), 200

# Function to create the CLUSTERING table if it doesn't exist
def create_clustering_table_if_not_exists():
    create_table_sql = """
        DO BEGIN
            DECLARE table_exists INT;
            SELECT COUNT(*) INTO table_exists
            FROM SYS.TABLES 
            WHERE TABLE_NAME = 'CLUSTERING' AND SCHEMA_NAME = CURRENT_SCHEMA;
            
            IF table_exists = 0 THEN
                CREATE TABLE CLUSTERING (
                    PROJECT_NUMBER NVARCHAR(255),
                    x DOUBLE,
                    y DOUBLE,
                    CLUSTER_ID INT
                );
            END IF;
            
            -- Check and create CLUSTERING_DATA table
            SELECT COUNT(*) INTO table_exists
            FROM SYS.TABLES 
            WHERE TABLE_NAME = 'CLUSTERING_DATA' AND SCHEMA_NAME = CURRENT_SCHEMA;
            
            IF table_exists = 0 THEN
                CREATE TABLE CLUSTERING_DATA (
                    CLUSTER_ID INT,
                    CLUSTER_DESCRIPTION NVARCHAR(255),
                    EMBEDDING REAL_VECTOR GENERATED ALWAYS AS VECTOR_EMBEDDING(CLUSTER_DESCRIPTION, 'DOCUMENT', 'SAP_NEB.20240715')
                );
            END IF;
        END;
    """
    
    # Use cursor to execute the query
    cursor = connection.connection.cursor()
    cursor.execute(create_table_sql)
    cursor.close()  

@app.route('/refresh_clusters', methods=['POST'])
def refresh_clusters():
    # # Retrieve start_date and end_date from URL arguments
    # start_date = request.args.get('start_date', '1900-01-01')  # Default to '1900-01-01' if not provided
    # end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))  # Default to current date if not provided
    

    # Retrieve start_date and end_date from the form data
    start_date = request.form.get('start_date', '1900-01-01')  # Default to '1900-01-01' if not provided
    end_date = request.form.get('end_date', datetime.now().strftime('%Y-%m-%d'))  # Default to current date if not provided
    
    # Ensure the CLUSTERING table exists
    create_clustering_table_if_not_exists()
    
    # Perform clustering and t-SNE on the ADVISORIES table
    df_clusters, labels = kmeans_and_tsne(
                            connection,  ## Hana ConnectionContext
                            table_name='ADVISORIES4', 
                            result_table_name='CLUSTERING', 
                            n_components=64, 
                            perplexity= 5, ## perplexity for T-SNE algorithm  
                            start_date=start_date,
                            end_date=end_date
                        )
    
    # Insert the values of the "labels" variable into the CLUSTERING_DATA table
    cursor = connection.connection.cursor()
    
    # Delete previous clustering run
    cursor.execute("TRUNCATE TABLE CLUSTERING_DATA")

    for cluster_id, cluster_description in labels.items():
        insert_sql = f"""
            INSERT INTO CLUSTERING_DATA (CLUSTER_ID, CLUSTER_DESCRIPTION)
            VALUES ({cluster_id}, '{cluster_description.replace("'", "''")}')
        """
        cursor.execute(insert_sql)
    cursor.close()

    return jsonify({"message": "Clusters refreshed successfully"}), 200

@app.route('/get_clusters', methods=['GET'])
def get_clusters():
    # Ensure the CLUSTERING table exists
    create_clustering_table_if_not_exists()
    
    # Retrieve data from the CLUSTERING table
    sql_query = "SELECT * FROM CLUSTERING"
    hana_df = dataframe.DataFrame(connection, sql_query)
    clusters = hana_df.collect()  # Return results as a pandas DataFrame
    
    # Convert DataFrame to list of dictionaries
    formatted_clusters = [
        {
            "x": row["x"],
            "y": row["y"],
            "CLUSTER_ID": row["CLUSTER_ID"],
            "PROJECT_NUMBER": row["PROJECT_NUMBER"]
        }
        for _, row in clusters.iterrows()
    ]
    
    return jsonify(formatted_clusters), 200

@app.route('/get_clusters_description', methods=['GET'])
def get_clusters_description():
    # Ensure the CLUSTERING table exists
    create_clustering_table_if_not_exists()
    
    # Retrieve data from the CLUSTERING table
    sql_query = "SELECT * FROM CLUSTERING_DATA"
    hana_df = dataframe.DataFrame(connection, sql_query)
    clusters = hana_df.collect()  # Return results as a pandas DataFrame
    
    # Convert DataFrame to list of dictionaries
    formatted_cluster_description = [
        {
            "CLUSTER_ID": row["CLUSTER_ID"],
            "CLUSTER_DESCRIPTION": row["CLUSTER_DESCRIPTION"]
        }
        for _, row in clusters.iterrows()
    ]
    
    return jsonify(formatted_cluster_description), 200

@app.route('/get_projects_by_architect_and_cluster', methods=['GET'])
def get_projects_by_architect_and_cluster():
    # Retrieve the architect parameter from the URL
    expert = request.args.get('expert')
    
    # Base SQL query
    sql_query = """
        SELECT a."architect", c."CLUSTER_ID", COUNT(a."project_number") AS project_count
        FROM "CLUSTERING" c
        JOIN "ADVISORIES4" a ON c."PROJECT_NUMBER" = a."project_number"
    """
    
    # Add WHERE clause if architect is provided
    if expert:
        sql_query += f"""
        WHERE a."architect" = '{expert.replace("'", "''")}'
        """
    
    # Add GROUP BY clause
    sql_query += """
        GROUP BY a."architect", c."CLUSTER_ID"
    """
    
    hana_df = dataframe.DataFrame(connection, sql_query)
    projects_by_architect_and_cluster = hana_df.collect()  # Return results as a pandas DataFrame

    # Convert results to a list of dictionaries for JSON response
    results = projects_by_architect_and_cluster.to_dict(orient='records')
    return jsonify({"projects_by_architect_and_cluster": results}), 200

# Step 2: Function to create the table if it doesn't exist
def create_table_if_not_exists(schema_name, table_name):
    create_table_sql = f"""
        DO BEGIN
            DECLARE table_exists INT;
            SELECT COUNT(*) INTO table_exists
            FROM SYS.TABLES 
            WHERE TABLE_NAME = '{table_name.upper()}' AND SCHEMA_NAME = '{schema_name.upper()}';
            
            IF table_exists = 0 THEN
                CREATE TABLE {schema_name}.{table_name} (
                    TEXT_ID INT GENERATED BY DEFAULT AS IDENTITY,
                    TEXT NVARCHAR(5000),
                    EMBEDDING REAL_VECTOR GENERATED ALWAYS AS VECTOR_EMBEDDING(TEXT, 'DOCUMENT', 'SAP_NEB.20240715')
                );
            END IF;
        END;
    """
    
    # Use cursor to execute the query
    cursor = connection.connection.cursor()
    cursor.execute(create_table_sql)
    cursor.close()  
    
# Step 3: Function to insert text and its embedding vector into the "TCM_SAMPLE" table
@app.route('/insert_text_and_vector', methods=['POST'])
def insert_text_and_vector():

    data = request.get_json()
    schema_name = data.get('schema_name', 'DBUSER')  # Default schema
    table_name = data.get('table_name', 'TCM_SAMPLE')  # Default table
    text = data.get('text')
    # text_type = data.get('text_type', 'DOCUMENT')
    # model_version = data.get('model_version', 'SAP_NEB.20240715')

    # Create the table if it doesn't exist
    create_table_if_not_exists(schema_name, table_name)
    
    # Generate the embedding vector using VECTOR_EMBEDDING
    sql_insert = f"""
        INSERT INTO {schema_name}.{table_name} (TEXT) SELECT '{text}' FROM DUMMY
    """
    
    # Use cursor to execute the query
    cursor = connection.connection.cursor()
    cursor.execute(sql_insert)
    cursor.close()  
    
    return jsonify({"message": f"Text inserted successfully into {schema_name}.{table_name}"}), 200

# Function to compare a new text's vector to existing stored vectors using COSINE_SIMILARITY
@app.route('/compare_text_to_existing', methods=['POST'])
def compare_text_to_existing():
    data = request.get_json()
    schema_name = data.get('schema_name', 'DBUSER')  # Default schema
    query_text = data.get('query_text')
    text_type = data.get('text_type', 'QUERY')
    model_version = data.get('model_version', 'SAP_NEB.20240715')
    
    if not query_text:
        return jsonify({"error": "Query text is required"}), 400
    
    # Generate the new text's embedding and compare using COSINE_SIMILARITY
    sql_query = f"""
        SELECT "solution" AS text,
               "project_number", 
               COSINE_SIMILARITY(
                   "solution_embedding", 
                   VECTOR_EMBEDDING('{query_text}', '{text_type}', '{model_version}')
               ) AS similarity
        FROM {schema_name}.ADVISORIES4
        UNION ALL
        SELECT "comment" AS text, 
               "project_number", 
               COSINE_SIMILARITY(
                   "comment_embedding", 
                   VECTOR_EMBEDDING('{query_text}', '{text_type}', '{model_version}')
               ) AS similarity
        FROM {schema_name}.COMMENTS4
        ORDER BY similarity DESC
        LIMIT 5
    """
    hana_df = dataframe.DataFrame(connection, sql_query)
    similarities = hana_df.collect()  # Return results as a pandas DataFrame

    # Convert results to a list of dictionaries for JSON response
    results = similarities.to_dict(orient='records')
    return jsonify({"similarities": results}), 200

@app.route('/get_project_details', methods=['GET'])
def get_project_details():
    schema_name = request.args.get('schema_name', 'DBUSER')
    project_number = request.args.get('project_number')
    
    if not project_number:
        return jsonify({"error": "Project number is required"}), 400
    
    # SQL query to join ADVISORIES and COMMENTS tables on project_number
    sql_query = f"""
        SELECT a."architect", a."index" AS advisories_index, a."pcb_number", a."project_date", 
               a."project_number", a."solution", a."topic",
               c."comment", c."comment_date", c."index" AS comments_index
        FROM {schema_name}.advisories4 a
        LEFT JOIN {schema_name}.COMMENTS4 c
        ON a."project_number" = c."project_number"
        WHERE a."project_number" = {project_number}
    """
    hana_df = dataframe.DataFrame(connection, sql_query)
    project_details = hana_df.collect()  # Return results as a pandas DataFrame

    # Convert results to a list of dictionaries for JSON response
    results = project_details.to_dict(orient='records')
    return jsonify({"project_details": results}), 200

@app.route('/get_all_projects', methods=['GET'])
def get_all_projects():
    schema_name = request.args.get('schema_name', 'DBUSER')  # Default schema
    
    # SQL query to retrieve all data from ADVISORIES and COMMENTS tables
    sql_query = f"""
        SELECT * FROM (
            SELECT a."architect", a."index" AS advisories_index, a."pcb_number", a."project_date", 
                   a."project_number", a."solution", a."topic",
                   c."comment", c."comment_date", c."index" AS comments_index,
                   ROW_NUMBER() OVER (PARTITION BY a."project_number" ORDER BY a."index") AS row_num
            FROM {schema_name}.advisories4 a
            LEFT JOIN {schema_name}.COMMENTS4 c
            ON a."project_number" = c."project_number"
        ) subquery
        WHERE row_num = 1
    """
    hana_df = dataframe.DataFrame(connection, sql_query)
    all_projects = hana_df.collect()  # Return results as a pandas DataFrame

    # Convert results to a list of dictionaries for JSON response
    results = all_projects.to_dict(orient='records')
    return jsonify({"all_projects": results}), 200

@app.route('/', methods=['GET'])
def root():
    return 'Embeddings API: Health Check Successfull.', 200

def create_app():
    return app

# Start the Flask app
if __name__ == '__main__':
    app.run('0.0.0.0', 8080)