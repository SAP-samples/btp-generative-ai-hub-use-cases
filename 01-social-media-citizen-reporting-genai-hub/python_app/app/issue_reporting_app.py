# -*- coding: utf-8 -*-

import json
import logging
import os
import sys
import requests
import pandas as pd
import hana_ml
from hana_ml import dataframe
from cfenv import AppEnv
from hdbcli import dbapi
from datetime import datetime

from gen_ai_hub.proxy import set_proxy_version
from gen_ai_hub.proxy.langchain.init_models import init_llm

from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers.openai_functions import JsonOutputFunctionsParser

env = AppEnv()
hana_service = 'hana'
hana = env.get_service(label=hana_service)

FORMAT = "%(asctime)s:%(name)s:%(levelname)s - %(message)s"
# Use filename="file.log" as a param to logging to log to a file
logging.basicConfig(format=FORMAT, level=logging.INFO)


class issue_reporting_app():
    
    def __init__(self, input_message) -> None:

        self.info_dict={
            "category": 
            '''Classify the post in one of the following categories: \"PUBLIC CLEANLINESS\", \"ROADS & FOOTPATHS\", \
            \"FACILITY & PARK MAINTENANCE\", \"PESTS\", \"DRAINS & SEWERS\".
            If none of the categories fits, return \"OTHER\".''',                 

            "priority": 
            '''Identify the priority to be given to the reported issues into \"4-Low\", \"3-Medium\", \"2-High\", \"1-Very High\". .
                4-Low : the issue does not pose any problem with public safety and does not necessarily need to be handled urgently. 
                3-Medium : the issue does not cause any immediate danger, but it has significant and negative impact on the daily life of people in the neighborhood.
                2-High : the issue needs to be resolved quickly because it can potentially cause dangerous situations or disruptions. 
                1-Very High : the issue needs to be handled as soon as possible, as it is a matter of public safety. 
                ''',          

            "summary": 
            "Summarize the reported issue in 40 characters and a neutral tone.",

            "description": 
            "Summarize the reported issue in not more that 300 characters and a neutral tone.",

            "address":
            "Extract the address where the issue is taking place. Return the street only and omit the town or country",

            "location": 
            "Extract the coordinates where the issue has been notices. The format should be: float, float",

            "sentiment" : 
            '''Classify the sentiment of the post into \"NEUTRAL\", \"NEGATIVE\", \"VERY NEGATIVE\"
            1. NEUTRAL: if the post reports an issue politely, in a calm tone
            2. NEGATIVE: if the post shows irony, impatience, annoyance
            3. VERY NEGATIVE: the post is rude or it expresses rage, hatred towards the public authority
            '''
        }

        self.template_string = ''' Extract information from the social media post delimited by triple backticks.
            ```{post}``` 
            '''

        self.functions = [
            {
                "name": "post_analysis",
                "summary": "Extract information from the social media post",
                "parameters": {
                    "type": "object",
                    "properties": {

                        "category": {"type": "string", "description": self.info_dict["category"], 
                                     "enum":['PUBLIC CLEANLINESS','ROADS & FOOTPATHS','FACILITY & PARK MAINTENANCE',
                                             'PESTS', 'DRAINS & SEWERS','OTHER']},
                        "priority": {"type": "string", "description": self.info_dict["priority"], 
                                     "enum": ['4-Low','3-Medium', '2-High', '1-Very High'] },
                        "summary": {"type": "string", "description": self.info_dict["summary"]},
                        "description": {"type": "string", "description": self.info_dict["description"]},
                        "address": {"type": "string", "description": self.info_dict["address"]},
                        "location": {"type": "string", "description": self.info_dict["location"]},
                        "sentiment": {"type": "string", "description": self.info_dict["sentiment"],
                                      "enum": ['NEUTRAL','NEGATIVE', 'VERY NEGATIVE']},
                    },
                    "required": ["category", "priority"],
                },
            }
        ]


        set_proxy_version('gen-ai-hub')

        self.model = init_llm(  
            'gpt-4',
            temperature = 0,
            verbose = False
        )

        self.input_message = input_message
        self.message = None
        self.redditPostId = input_message["id"]
        self.author = input_message["author"]
        self.postingDate = input_message["postingDate"]
        self.response = None
        self.output = None
        self.last_issue_id = 0
        self.conn = None
        self.conn_context = None


    def set_db_connection(self) -> None:

        if hana is not None:

            dbHost = hana.credentials['host']
            dbPort = hana.credentials['port']
            dbUser = hana.credentials['user']
            dbPwd = hana.credentials['password']

            self.conn = dbapi.connect(
                address = dbHost,
                port = dbPort,
                user = dbUser,
                password = dbPwd,
                encrypt = 'true',
                sslTrustStore = hana.credentials['certificate']
                )

            self.conn_context = hana_ml.dataframe.ConnectionContext(
                dbHost,
                dbPort,
                dbUser,
                dbPwd, 
                encrypt='true',
                sslValidateCertificate='false'
                )


    def hello(self):

        if hana is None:
            return "Can't connect to HANA service '{}' – check service name?".format(hana_service)
        else:
            self.set_db_connection()
            connection = self.conn
        cursor = connection.cursor()
        cursor.execute("select CURRENT_UTCTIMESTAMP from DUMMY")
        ro = cursor.fetchone()
        cursor.close()
        connection.close()

        return "Current time is: " + str(ro["CURRENT_UTCTIMESTAMP"])
    

    def ask_llm(self) -> None:

        post_prompt= ChatPromptTemplate.from_template(self.template_string)

        chain = (
            post_prompt
            | self.model.bind(function_call={"name": "post_analysis"}, functions=self.functions)
            | JsonOutputFunctionsParser()
        )

        response = chain.invoke({"post": self.message})
        self.response = response
        
    
    def prepare_content(self) -> None:
        self.message = "redditPostId: " + self.input_message["id"]+\
            ", author: "+self.input_message["author"]+", title: "+self.input_message["title"]+\
            ", message: "+self.input_message["longText"]+", postingDate: "+self.input_message["postingDate"]


    def prepare_output(self) -> None:
        output = pd.DataFrame(self.response, index=[0])
        output = output.rename(columns={
            'sentiment': 'SENTIMENT', 'location': 'LOCATION',\
            'summary': 'GENAISUMMARY', 'description': 'GENAIDESCRIPTION',\
            'priority': 'PRIORITY', 'category': 'CATEGORY'
        })

        output[['LAT', 'LONG']] = output['LOCATION'].str.split(',', n=1, expand=True).astype(float)
        posting_date = datetime.strptime(self.postingDate, '%Y-%m-%dT%H:%M:%S.%fZ')

        self.get_last_issue_id("test", "E2EFCB62B7DA460684FD836B4F6AB46C_1FKNZYR39ZOR5SINA10VOWO12_RT")
        new_id = self.last_issue_id + 1
        output = output.assign(ID = new_id, PROCESSOR = '', PROCESSDATE = '', PROCESSTIME = '',\
                               DECISION = '', PRIORITYDESC = '', MAINTENANCENOTIFICATIONID = '',\
                               REDDITPOSTID = self.redditPostId, REPORTEDBY = self.author,\
                               DATE = posting_date.date(), TIME = posting_date.time()
                               )
        output['DATE'] = pd.to_datetime(output['DATE'], format='%Y-%m-%d')
        output['TIME'] = pd.to_datetime(output['TIME'], format="%H:%M:%S").dt.time
        output = output.drop('LOCATION', axis=1)
        output = output[[
            "ID",
            "PROCESSOR",
            "PROCESSDATE",
            "PROCESSTIME",
            "REPORTEDBY",
            "DECISION",
            "REDDITPOSTID",
            "MAINTENANCENOTIFICATIONID",
            "LAT",
            "LONG",
            "GENAISUMMARY",
            "GENAIDESCRIPTION",
            "PRIORITY",
            "PRIORITYDESC",
            "SENTIMENT",
            "CATEGORY",
            "DATE",
            "TIME"]]
        print(output)
        self.output = output


    def write_table_to_hana(self, df, table_name, schema) -> None:
        #print(df)
        df_remote = dataframe.create_dataframe_from_pandas(
            connection_context = self.conn_context,
            schema = schema,
            pandas_df = df,
            table_name = table_name,
            force = False,
            replace = False,
            append = True
            #force = True,
            #replace = False,
            #drop_exist_tab = False
        )
        
        
    def read_table_from_hana(self, table_name, schema):
        table = (self.conn_context.table(table_name, schema=schema))
        table = table.collect()
        return table
        
        
    def get_last_issue_id(self, table_name, schema) -> None:
        table = self.read_table_from_hana(table_name, schema)
        self.last_issue_id = len(table.index)
        #print(self.last_issue_id)
    

    def run_workflow(self):
        self.prepare_content()
        self.ask_llm()
        self.set_db_connection()
        self.prepare_output()
        self.write_table_to_hana(self.output, "test", "E2EFCB62B7DA460684FD836B4F6AB46C_1FKNZYR39ZOR5SINA10VOWO12_RT")
        return self.response


