import { ApplicationService } from "@sap/cds"
import {
  OrchestrationClient,
  buildAzureContentFilter
} from "@sap-ai-sdk/orchestration";

const chatHistoryInMemory = [];
const userInstructionPrompt = `Answer the citizen's question in 3 sentences: {{?citizenQuestion}}. Use the following context: {{?groundingOutput}}`;
const systemInstructionPrompt = `You are a City Council Information Officer.
Responsibilities:
1. Provide accurate and up-to-date information on city council policies, procedures, and services.
2. Address them by their names. Answer citizens' questions and respond to their inquiries in a helpful and courteous manner.
Personality:
1. Friendly and approachable tone
2. Empathetic and understanding of citizens' concerns`;

/**
 * Initialize the OrchestrationClient with llm access, templating, data masking and content filter
 */
const filter = buildAzureContentFilter({ Hate: 0, Violence: 0 });
const orchestrationClient = new OrchestrationClient({
  llm: {
    model_name: "gpt-35-turbo",
    model_version: "latest",
    model_params: {},
  },
  templating: {
    template: [
      {
        role: "user",
        content: userInstructionPrompt
      },
      {
        role: "system",
        content: systemInstructionPrompt
      },
    ],
  },
  masking: {
    masking_providers: [
      {
        type: 'sap_data_privacy_integration',
        method: 'pseudonymization',
        entities: [{ type: 'profile-email' }, { type: 'profile-person' }]
      }
    ]
  },
  filtering: {
    input: filter,
    output: filter,
  },
  grounding: {
    type: "document_grounding_service",
    config: {
      filters: [
        {
          id: 'filter1',
          data_repositories: ['*'],
          search_config: { "max_document_count": 1 },
          data_repository_type: 'vector'
        }
      ],
      input_params: ['citizenQuestion'],
      output_param: 'groundingOutput'
    }
  }
});

/**
 * Get chat history by sessionId from memory
 */
function getChatHistorySession(sessionId) {
  if (!chatHistoryInMemory[sessionId]) {
    chatHistoryInMemory[sessionId] = [];
  }
  return chatHistoryInMemory[sessionId];
}

/**
 * Orchestration client chatCompletion function via SDK
 */
async function getOrchestrationServiceResponse(userQuery, chatHistory) {
  chatHistory.push({
    role: "user",
    content: userQuery,
  });
  const response = await orchestrationClient.chatCompletion({
    messagesHistory: chatHistory,
    inputParams: { citizenQuestion: userQuery }
  });
  return response;
}

/**
 * Prepare response from the AI
 */
function prepareResponse(orchestrationResponse) {
  return {
    role: orchestrationResponse.data.orchestration_result.choices[0].message.role,
    content: orchestrationResponse.data.orchestration_result.choices[0].message.content,
    timestamp: new Date().toJSON()
  };
}

/**
 * Add messages to the chat history session
 */
function addMessagesToChatHistory(sessionId, userContent, assistantContent) {
  chatHistoryInMemory[sessionId].push({
    role: "assistant",
    content: assistantContent.getContent(),
  });
}

/**
 * Helper interface & function for Content Filtering response
 * - Rule based response for you to determine threshold
 * - Feed user friendly response rather than error
 */
interface AzureContentSafety {
  Hate: number;
  SelfHarm: number;
  Sexual: number;
  Violence: number;
}

interface InputFiltering {
  message: string;
  data: {
    azure_content_safety: AzureContentSafety;
  };
}

interface ModuleResults {
  templating: any[];
  input_masking: object;
  input_filtering: InputFiltering;
}

interface ResponseData {
  request_id: string;
  code: number;
  message: string;
  location: string;
  module_results: ModuleResults;
}

function parseContentSafety(data: ResponseData): string {
  const { azure_content_safety } = data.module_results.input_filtering.data;
  const hate = isNaN(azure_content_safety.Hate) ? 0 : azure_content_safety.Hate;
  const selfharm = isNaN(azure_content_safety.SelfHarm) ? 0 : azure_content_safety.SelfHarm;
  const violence = isNaN(azure_content_safety.Violence) ? 0 : azure_content_safety.Violence;
  const sexual = isNaN(azure_content_safety.Sexual) ? 0 : azure_content_safety.Sexual;
  const maxLevel = Math.max(hate, selfharm, violence, sexual);

  switch (maxLevel) {
    case 0:
      return "No safety violations detected.";
    case 2:
      return "Thank you for your inquiry. Our safety filters flagged a potential content issue. Please revise and resend your message so we can assist you effectively.";
    case 4:
      return "Your message contains moderate safety violations. We prioritize user safety. Please review, revise, and resend to comply with community guidelines.";
    case 6:
      return "Severe safety violations detected. Your message cannot be processed. Please rephrase entirely, ensuring compliance with community standards, to avoid account restrictions.";
    default:
      return data.message;
  }
}
/** END */

/**
 * Implementation of ChatService
 */
module.exports = class Chat extends ApplicationService {
  init() {
    this.on("getAiResponse", async (req) => {
      const chatHistory = getChatHistorySession(req.data.sessionId);
      try {
        const userQuery = req.data?.content;
        const orchResponse = await getOrchestrationServiceResponse(userQuery, chatHistory);
        const response = prepareResponse(orchResponse);
        addMessagesToChatHistory(req.data.sessionId, userQuery, orchResponse);
        return response;
      } catch (err) {
        console.debug("Error in Orchestration: \n", err);
        /**
         * Content Filter Violation
         * - Response from Content Filter (Input/Output) will throw an error when violation is met
         * - Have to manage this response as an error
         * - User & System messages should NOT be captured in history as it will impact subsequent calls
         */
        chatHistory.splice(-2);

        /**
         * Custom Message to citizen based on intensity level of safety violations
         * - [TODO] Can use LLM to generate text as well
         */
        const userMessage = parseContentSafety(err?.response?.data);

        return {
          role: 'assistant',
          content: userMessage,
          timestamp: new Date().toJSON()
        };
      }
    });

    /**
     * Action logic for delete the chat session to Orchestration service
     */
    this.on("deleteChatSession", async (req) => {
      const index = chatHistoryInMemory.indexOf(req.params.sessionId);
      if (index !== -1) {
        delete chatHistoryInMemory[index];
        chatHistoryInMemory.splice(index, 1);
      }
    });

    return super.init();
  }
};
