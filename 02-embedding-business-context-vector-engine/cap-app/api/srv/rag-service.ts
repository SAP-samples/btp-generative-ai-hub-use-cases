import cds, { ApplicationService } from "@sap/cds";
import { Request } from "@sap/cds/apis/services";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate
} from "langchain/prompts";
import { LLMChain } from "langchain/chains";

import * as aiCore from "./utils/ai-core";
import BTPEmbedding from "./utils/langchain/BTPEmbedding";
import BTPAzureOpenAIChatLLM from "./utils/langchain/BTPAzureOpenAIChatLLM";

let array2VectorBuffer = (data: Array<number>): Buffer => {
    const sizeFloat = 4;
    const sizeDimensions = 4;
    const bufferSize = data.length * sizeFloat + sizeDimensions;

    const buffer = Buffer.allocUnsafe(bufferSize);
    // write size into buffer
    buffer.writeUInt32LE(data.length, 0);
    data.forEach((value: number, index: number) => {
        buffer.writeFloatLE(value, index * sizeFloat + sizeDimensions);
    });
    return buffer;
};

export default class RagService extends ApplicationService {
    async init(): Promise<void> {
        await super.init();
        await aiCore.checkDefaultResourceGroup();
        // this.on("embed", this.onEmbed);
        this.on("search", this.onSearchDuplicatedPostsWithDateLocation);
        this.on("chatCompletion", this.onChatCompletion);
        this.on("postProcessGenAI", this.onProcessPostsGenAI);
    }

    private onEmbed = async (req: Request): Promise<any> => {
        const { text } = req.data;
        const { Documents } = this.entities;
        const embedder = new BTPEmbedding(aiCore.embed);
        const embeddings = await embedder.embedDocuments([text]);
        if (embeddings.length > 0) {
            const document = {
                text: text,
                embedding: array2VectorBuffer(embeddings[0])
            };
            const success = await INSERT.into(Documents).entries([document]);
            if (success) {
                return true;
            }
        }
        return false;
    };

    //  Params: Last xx (5) days from the date posted inclusive, based on xx metres (500) distance range
    private onSearchDuplicatedPostsWithDateLocation = async (req: Request): Promise<any> => {
        const { text, date, lat, long, days, distance } = req.data.post;
        const embedder = new BTPEmbedding(aiCore.embed);
        const embeddings = await embedder.embedDocuments([text]);
        if (embeddings.length > 0) {
            const posts = await cds.run(
                `WITH GEO_COORD AS (
                    SELECT ID, TEXT, DATE, ADDRESS, DECISION, PRIORITYDESC, GENAISUMMARY, GENAIDESCRIPTION, 
                    MAINTENANCENOTIFICATIONID, CATEGORY, SENTIMENT, LOCATION, LONG, LAT, NEW ST_Point(LONG, LAT, 4326) LONG_LAT_GEO,
                    CASE WHEN
                        LAT IS NOT NULL AND LONG IS NOT NULL THEN 
                            New ST_Point(${long}, ${lat}, 4326).ST_Distance(NEW ST_Point(LONG, LAT, 4326),'meter') 
                        ELSE NULL
                    END as "DISTANCE_METER", L2DISTANCE(VECTOR, TO_REAL_VECTOR('[${embeddings[0].toString()}]')) as "similarity"
                    FROM "SOCIAL_CITIZEN_GENAI_PROCESSEDISSUES"
                    WHERE 
                    (DATE <= TO_DATE('${date}', 'YYYY-MM-DD') AND DATE >= ADD_DAYS(TO_DATE('${date}', 'YYYY-MM-DD'), -${days})) AND
                    L2DISTANCE(VECTOR, TO_REAL_VECTOR('[${embeddings[0].toString()}]')) < 0.6
                )
                SELECT ID, TEXT, DATE, ADDRESS, DECISION, PRIORITYDESC, GENAISUMMARY, GENAIDESCRIPTION, 
                MAINTENANCENOTIFICATIONID, CATEGORY, SENTIMENT, LOCATION, DISTANCE_METER, LONG, LAT, LONG_LAT_GEO, "similarity" FROM "GEO_COORD" 
                WHERE "DISTANCE_METER" < ${distance} 
                ORDER BY "similarity", "DISTANCE_METER" ASC;`
            );
            if (posts) {
                return posts.map((processedpost: any) => ({
                    processedpost: {
                        ID: processedpost.ID,text: processedpost.TEXT,date: processedpost.DATE,
                        distance: processedpost.DISTANCE_METER,geo: processedpost.LONG_LAT_GEO,
                        address: processedpost.ADDRESS,decision: processedpost.DECISION,
                        priorityDesc: processedpost.PRIORITYDESC,genaiSummary: processedpost.GENAISUMMARY,
                        genaiDescription: processedpost.GENAIDESCRIPTION,maintenanceNotificationID: processedpost.MAINTENANCENOTIFICATIONID,
                        category: processedpost.CATEGORY,sentiment: processedpost.SENTIMENT
                    },
                    similarity: processedpost.similarity
                }));
            }
        }
        return [];
    };

    private onChatCompletion = async (req: Request): Promise<any> => {
        const { prompt } = req.data;
        const llm = new BTPAzureOpenAIChatLLM(aiCore.chatCompletion);
        const systemPrompt = new PromptTemplate({
            template: "Answer and talk like Sheldon Cooper\n",
            inputVariables: []
        });
        const systemMessagePrompt = new SystemMessagePromptTemplate({ prompt: systemPrompt });
        const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate("{prompt}");
        const chatPrompt = ChatPromptTemplate.fromMessages([systemMessagePrompt, humanMessagePrompt]);

        const chain = new LLMChain({
            llm: llm,
            prompt: chatPrompt,
            outputKey: "text"
        });

        const response = await chain.call({ prompt });
        return response.text;
    };

    private onProcessPostsGenAI = async (req: Request): Promise<any> => {
        const { longText, author, postingDate, id } = req.data.post;
        const socialMediaPost = `RedditPostId: ${id}\n 
        Author: ${author}\n
        Message: ${longText}\n 
        Posting Date: ${postingDate}\n\n`;

        const problemCategoryContext = `Identify the category from one of the following categories names: "PUBLIC CLEANLINESS", "ROADS & FOOTPATHS", 
            "FACILITY & PARK MAINTENANCE", "PESTS", "DRAINS & SEWERS"\n
            Where \n
            PUBLIC CLEANLINESS: Dirty public areas, overflowing dustbins and littering. Bulky waste in common areas.. \n
            ROADS & FOOTPATHS: Including covered linkways, signboards & streetlights. E.g. Pot holes, huge cracks, etc.. \n
            FACILITY & PARK MAINTENANCE: Fallen trees, overgrown grass, and maintenance of park lighting and facilities.. \n
            PESTS: Sighting of bees and hornets, potential mosquito breeding sites, and more.. \n
            DRAINS & SEWERS: Choked, overflowing, or damaged drains, bad sewage smells, flooding.. \n
            Return the category name. If none of the categories fits, or in doubt, return OTHER - PLEASE CHECK.\n`;
        const urgencyContext = `4-Low : the issue does not pose any problem with public safety and does not necessarily need to be handled urgently. \n \
            3-Medium : the issue does not cause any immediate danger, but it has significant and negative impact on the daily life of people in the neighborhood.\n \
            2-High : the issue needs to be resolved quickly because it can potentially cause dangerous situations or disruptions. \n \
            1-Very High : the issue needs to be handled as soon as possible, as it is a matter of public safety. \n \
            Return the priority level. If in doubt, return 3-Medium \n`;
        const summary = `Summarize the issue that is being reported in 40 characters and a neutral tone. \n`;
        const description = `Summarize the issue that is being reported in not more that 300 characters and a neutral tone. \n`;
        const address = `Extract the address where the issue has been noticed. Return the street only and omit the town or country. \n`;
        const location = `Extract the coordinates where the issue has been notices. The format should be: float, float. \n`;
        const sentiment = `Extract the sentiment of the post:  \n \
                            1. NEUTRAL: if the issue is reported politely \n \
                            2. NEGATIVE: if the post shows irritation, impatience, annoyance \n \
                            3. VERY NEGATIVE: the post expresses rage, hatred \n`;

        const promptGuidance = `SOCIAL MEDIA POST: \n
            ${socialMediaPost} \n
            INSTRUCTIONS: \n
            For social media post above, extract the following information:\n
            redditPostID: redditPostId from the message RedditPostId \n
            author: author from the message Author \n
            category: ${problemCategoryContext} \n
            priority: ${urgencyContext} \n
            summary: + ${summary} \n
            description: ${description} \n
            address: ${address} \n
            location: ${location} \n
            sentiment: ${sentiment} \n
            date: date from the message posting date \n
            time: time from the message posting date \n`;

        const llm = new BTPAzureOpenAIChatLLM(aiCore.chatCompletion);
        const systemPrompt = new PromptTemplate({
            template: "Output a JSON file, all field should be in string format.",
            inputVariables: []
        });
        const systemMessagePrompt = new SystemMessagePromptTemplate({ prompt: systemPrompt });
        const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(promptGuidance);
        const chatPrompt = ChatPromptTemplate.fromMessages([systemMessagePrompt, humanMessagePrompt]);

        const chain = new LLMChain({
            llm: llm,
            prompt: chatPrompt,
            outputKey: "text"
        });

        const response = await chain.call({ promptGuidance });

        const processedPostGenAIJson = JSON.parse(response.text);
        return processedPostGenAIJson;
    };

}
