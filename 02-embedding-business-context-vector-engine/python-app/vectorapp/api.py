from flask_cors import CORS
from flask import Flask, request, jsonify

#Langchain to work with HANA Vector Engine
from langchain_community.vectorstores.hanavector import HanaDB

# Langchain to help with chat completition
from langchain.chains import LLMChain
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# For consuming SAP Generative AI Hub CHAT COMPLETITION model
from gen_ai_hub.proxy.langchain.init_models import init_llm
#from langchain_openai import OpenAI #REPLACED BY THE GenAI HUB SDK LANGUAGE MODEL above ;-)

# For consuming SAP Generative AI Hub EMBEDDINGS model
from gen_ai_hub.proxy.langchain.init_models import init_embedding_model
#from langchain_openai import OpenAIEmbeddings #REPLACED BY THE GenAI HUB SDK EMBEDDINGS MODEL above ;-)

# HANADB Client to initiate DB connection
from hdbcli import dbapi

import sys, os, praw, time, logging, configparser, threading
# Get the absolute path to the directory containing api.py
current_dir = os.path.dirname(os.path.abspath(__file__))

# Get the parent directory and add it to the Python path
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# Subreddit to monitor
subreddit_name = "ASK_SAGENAICITY"

# Keywords to trigger a reply (optional)
keywords = ["SAP", "keyword2"]

# Set up logging
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")

# Check if the application is running on Cloud Foundry
if 'VCAP_APPLICATION' in os.environ:
    # Running on Cloud Foundry, use environment variables
    hanaURL = os.getenv('DB_ADDRESS')
    hanaPort = os.getenv('DB_PORT')
    hanaUser = os.getenv('DB_USER')
    hanaPW = os.getenv('DB_PASSWORD')
    reddit_client_id = os.getenv('REDDIT_CLIENT_ID')
    reddit_client_secret = os.getenv('REDDIT_CLIENT_SECRET')
    reddit_user_agent = os.getenv('REDDIT_USER_AGENT')
    reddit_username = os.getenv('REDDIT_USERNAME')
    reddit_password = os.getenv('REDDIT_PASSWORD')
else:
    # Not running on Cloud Foundry, read from config.ini file
    config = configparser.ConfigParser()
    config.read('config.ini')
    hanaURL = config['database']['address']
    hanaPort = config['database']['port']
    hanaUser = config['database']['user']
    hanaPW = config['database']['password']
    reddit_client_id = config['reddit']['reddit_client_id']
    reddit_client_secret = config['reddit']['reddit_client_secret']
    reddit_user_agent = config['reddit']['reddit_user_agent']
    reddit_username = config['reddit']['reddit_username']
    reddit_password = config['reddit']['reddit_password']

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

def authenticate():
    """
    Authenticates with the Reddit API and returns a Reddit instance.
    """
    reddit = praw.Reddit(
        client_id=reddit_client_id,
        client_secret=reddit_client_secret,
        user_agent=reddit_user_agent,
        username=reddit_username,
        password=reddit_password,
    )
    return reddit

def get_hot_posts(reddit):
    """
    Retrieves the hot posts from the specified subreddit.
    """
    subreddit = reddit.subreddit(subreddit_name)
    return subreddit.hot(limit=10)  # Adjust limit as needed

def check_and_reply(reddit, submission, reply_message):
    """
    Checks if the submission title or body contains any of the keywords and replies if applicable.
    """
    # if not any(keyword.lower() in submission.title.lower() or submission.selftext.lower() for keyword in keywords):
    #     return

    try:
        # Check for existing comments to avoid potential rate limits or reposts
        already_replied = False
        for comment in submission.comments:
            if comment.author == reddit_username:
                already_replied = True
                logging.info(f"Already replied: {submission.title}")
                break

        if not already_replied:
            # question is retrieved from post's title in the SR
            # 4. New question: reply from RAG & LLM response
            reply_message = process_question_genai(submission.title)
            
            submission.reply(reply_message)
            logging.info(f"Replying to submission: {submission.title}")
    except praw.exceptions.APIException as e:
        logging.error(f"Error replying to submission: {e}")

def fetch_reddit_posts():
    reddit = authenticate()
    while True:
        for submission in get_hot_posts(reddit):
            logging.info(f"Found post: {submission.title}")

            # Customize reply message (optional)
            # reply_message = "Your custom reply message"

            # question is retrieved from post's title in the SR
            # turn this on if you want to run through every title with genai & rag
            # for now, this will be parked in check_and_reply so to limit calls only to unanswered questions
            # reply_message = process_question_genai(submission.title)
            reply_message = "custom message"

            check_and_reply(reddit, submission, reply_message)

        time.sleep(600)  # Adjust interval as needed

def run_chat_response(promptFromUser, textFromHana):
    try:
        question = promptFromUser + 'Context: ' + textFromHana
        llm = init_llm('gpt-35-turbo', max_tokens=300, temperature=0.0)
        qa_chain = RetrievalQA.from_chain_type(
            llm,
            retriever=db.as_retriever()
        )
        response = qa_chain({"query": question})
        return(response['result'])

    except Exception as e:
        return jsonify({'message': str(e)}), 500
    
    # try:
    #     question = promptFromUser + 'Context: ' + textFromHana
    #     template = """Question: {question}
    #         Answer: Based on the data provided: """
    #     prompt = PromptTemplate(template=template, input_variables=['question'])

    #     llm = init_llm('gpt-35-turbo', max_tokens=300, temperature=0.0)
    #     llm_chain = LLMChain(prompt=prompt, llm=llm)
    #     response = llm_chain.invoke(question)

    #     return(response['text'])
    # except Exception as e:
    #     return jsonify({'message': str(e)}), 500
    

def process_question_genai(question):
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
        docs = db.similarity_search(question, k=2)
        
        # Extract the text from the most similar chunks
        # and assign it to the context variable
        docs_texts = []
        for doc in docs:
            docs_texts.append(doc.page_content)
        context = docs_texts[0] + ' ' + docs_texts[1]

        response = run_chat_response(question, context)

        return response
        # return jsonify({'answer': response}),200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

from vectorapp.modules.uploadPDF import upload_pdf_blueprint
from vectorapp.modules.uploadHTML import upload_html_blueprint
from vectorapp.modules.chunkAndStore import chunk_and_store_blueprint
from vectorapp.modules.chunkFromWebAndStore import chunk_and_store_web_blueprint
from vectorapp.modules.getContext import get_context_blueprint
from vectorapp.modules.getAnswer import get_answer_blueprint
from vectorapp.modules.getDirectAnswer import get_direct_answer_blueprint
from vectorapp.modules.embeddingFromText import embed_from_text_blueprint
from vectorapp.modules.insertTextAsVector import insert_txt_as_vector_blueprint

app = Flask(__name__)
CORS(app)

app.register_blueprint(upload_pdf_blueprint)
app.register_blueprint(upload_html_blueprint)
app.register_blueprint(chunk_and_store_blueprint)
app.register_blueprint(chunk_and_store_web_blueprint)
app.register_blueprint(get_context_blueprint)
app.register_blueprint(get_answer_blueprint)
app.register_blueprint(get_direct_answer_blueprint)
app.register_blueprint(embed_from_text_blueprint)
app.register_blueprint(insert_txt_as_vector_blueprint)

@app.route('/', methods=['GET'])
def root():
    threading.Thread(target=fetch_reddit_posts).start()
    return 'Embeddings API: Health Check Successfull.', 200

def create_app():
    return app

if __name__ == '__main__':
    app.run('0.0.0.0', 8080)