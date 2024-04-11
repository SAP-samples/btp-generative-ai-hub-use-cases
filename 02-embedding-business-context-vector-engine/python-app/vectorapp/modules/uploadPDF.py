from flask import Blueprint, request, jsonify
import tempfile
import os
import PyPDF2

upload_pdf_blueprint = Blueprint('upload-pdf', __name__)

@upload_pdf_blueprint.route('/upload-pdf', methods=['POST'])
def upload_file():
    print('TCM: Reading the file')
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    # Let's upload the PDF file from local user folder 
    # to our app's temporary folder
    if file:
        filename = file.filename
        pdf_path = os.path.join(tempfile.gettempdir(), filename)
        file.save(pdf_path)
        print('TCM: PDF saved for processing')

        # Now we open the PDF file and extract the texts
        text = ''
        with open(pdf_path, 'rb') as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            for page_num in range(len(reader.pages)):
                text += reader.pages[page_num].extract_text()
        
        # We create a txt file
        txt_filename = os.path.splitext(filename)[0] + ".txt"
        # txt_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'resources', txt_filename)
        txt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'resources', txt_filename)
        
        # And write the text to the text file
        with open(txt_path, 'w') as txt_file:
            print('TCM: Writting TXT file')
            txt_file.write(text)
        
        # Let's close the txt file and delete the PDF file
        print('TCM: Closing TXT file')
        txt_file.close()
        os.remove(pdf_path)
        return jsonify({'message': txt_path}), 200