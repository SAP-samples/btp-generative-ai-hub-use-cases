from flask import Blueprint, request, jsonify

# Langchain to help with chat completition
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

# For consuming SAP Generative AI Hub CHAT COMPLETITION model
from gen_ai_hub.proxy.langchain.init_models import init_llm

get_answer_blueprint = Blueprint('get-answer', __name__)

@get_answer_blueprint.route('/get-answer', methods=['GET'])
def get_answer():
    query = request.get_json()['query']
    context = request.get_json()['context']
    try:
        template = """Question: {query}
            Answer: Based on the data provided: """
        prompt = PromptTemplate(template=template, input_variables=['query'])
        question = query + 'Context: ' + context

        llm = init_llm('gpt-35-turbo', max_tokens=150)
        llm_chain = LLMChain(prompt=prompt, llm=llm)
        response = llm_chain.invoke(question)

        return jsonify({'answer': response['text']}),200
    except Exception as e:
        return jsonify({'message': str(e)}), 500