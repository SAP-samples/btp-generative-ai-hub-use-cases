from flask import Blueprint, request, jsonify
import tempfile
import os

upload_html_blueprint = Blueprint('upload-html', __name__)

@upload_html_blueprint.route('/upload-html', methods=['POST'])
def upload_file():
    print('TCM: Reading the file')
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    # Let's upload the HTML file from local user folder 
    # to our app's temporary folder
    if file:
        filename = file.filename
        file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'resources', filename)
        file.save(file_path)
        print('TCM: File saved for processing')
        return jsonify({'message': file_path}), 200