from flask import Blueprint, request, jsonify

# For consuming SAP Generative AI Hub EMBEDDINGS model
from gen_ai_hub.proxy.langchain.openai import OpenAIEmbeddings

embed_from_text_blueprint = Blueprint('embed-from-text', __name__)
@embed_from_text_blueprint.route('/embed-from-text', methods=['POST'])

def embed_from_text():
    text2convert = request.get_json()['text']

    try:
        # can be called without passing proxy_client
        embedding_model = OpenAIEmbeddings(proxy_model_name='text-embedding-ada-002')
        response = embedding_model.embed_query(text2convert)
        print(response)
        
        return jsonify({'response':response}),200
    except Exception as e:
        return jsonify({'message': str(e)}), 500