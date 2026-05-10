import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse, Message as AIMessage } from 'ai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

async function saveCoachMemory(userId: string, conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) {
  try {
    const summary = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Summarize this coaching conversation in 2-3 sentences. Focus on what topics were discussed and any goals or insights the user expressed.',
        },
        ...conversation.filter(m => m.role === 'user' || m.role === 'assistant'),
      ],
      max_tokens: 200,
    });
    const memoryText = summary.choices[0].message.content || '';
    await UserModel.findByIdAndUpdate(userId, { coachMemory: memoryText });
  } catch (err) {
    console.error('Failed to save coach memory:', err);
  }
}

const agentTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_feedback',
      description: 'Semantically search feedback messages by topic or theme. Use when the user asks about specific subjects in their feedback.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The topic or theme to search for' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'filter_by_time',
      description: 'Retrieve feedback messages from the last N days.',
      parameters: {
        type: 'object',
        properties: {
          daysAgo: { type: 'number', description: 'Number of days to look back' },
        },
        required: ['daysAgo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_feedback',
      description: 'Retrieve all feedback messages and the total count. Use for broad analysis questions.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

export async function POST(req: Request) {
  try {
    const { messages }: { messages: AIMessage[] } = await req.json();

    await dbConnect();
    const session = await getServerSession(authOptions);
    const userSession = session?.user;

    if (!session || !userSession) {
      return Response.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const user = await UserModel.findById(userSession._id);
    if (!user) {
      return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const userMessages = user.messages;
    const messagesWithVectors = userMessages.filter(m => m.vector && m.vector.length > 0);

    // RAG: retrieve top-12 most relevant messages for the current question
    let relevantMessages = userMessages;
    if (messagesWithVectors.length > 0 && lastUserMessage) {
      const embRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: lastUserMessage,
      });
      const qVec = embRes.data[0].embedding;
      relevantMessages = messagesWithVectors
        .map(m => ({ m, score: cosineSimilarity(qVec, m.vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(x => x.m);
    }

    // Tool implementations
    async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
      if (name === 'search_feedback') {
        const query = args.query as string;
        if (messagesWithVectors.length > 0) {
          const embRes = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: query,
          });
          const qVec = embRes.data[0].embedding;
          const hits = messagesWithVectors
            .map(m => ({ m, score: cosineSimilarity(qVec, m.vector) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(x => `- "${x.m.content}" (${new Date(x.m.createdAt).toLocaleDateString()})`)
            .join('\n');
          return `Feedback relevant to "${query}":\n${hits || 'None found.'}`;
        }
        const fallback = userMessages
          .filter(m => m.content.toLowerCase().includes((query as string).toLowerCase()))
          .map(m => `- "${m.content}"`)
          .join('\n');
        return `Feedback mentioning "${query}":\n${fallback || 'None found.'}`;
      }

      if (name === 'filter_by_time') {
        const daysAgo = args.daysAgo as number;
        const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const filtered = userMessages
          .filter(m => new Date(m.createdAt) >= since)
          .map(m => `- "${m.content}" (${new Date(m.createdAt).toLocaleDateString()})`)
          .join('\n');
        return `Feedback from the last ${daysAgo} days:\n${filtered || 'No messages in this period.'}`;
      }

      if (name === 'get_all_feedback') {
        const all = userMessages.map(m => `- "${m.content}"`).join('\n');
        return `Total feedback: ${userMessages.length} messages.\n${all || 'No feedback yet.'}`;
      }

      return 'Unknown tool.';
    }

    // Build initial agent messages
    const relevantContext = relevantMessages.map(m => `- "${m.content}"`).join('\n');
    const memoryContext = user.coachMemory
      ? `\nPrevious session summary: ${user.coachMemory}\n`
      : '';

    const systemPrompt = `You are a supportive AI Coach who helps users understand and act on anonymous feedback they have received.
${memoryContext}
Most relevant feedback for this conversation (retrieved semantically):
${relevantContext || 'No feedback received yet.'}

Use the available tools to search for more specific feedback when needed. Be constructive, specific, and encouraging.`;

    const agentMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Agent loop: run tool calls until the model is ready to give a final answer
    let iterations = 0;
    while (iterations < 5) {
      iterations++;
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: agentMessages,
        tools: agentTools,
        tool_choice: 'auto',
        temperature: 0.7,
      });

      const choice = response.choices[0];
      agentMessages.push(choice.message);

      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(toolCall.function.arguments); } catch { /* empty args */ }
          const result = await executeTool(toolCall.function.name, args);
          agentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      } else {
        // Model gave a final answer — remove it from agentMessages so we stream it fresh
        agentMessages.pop();
        break;
      }
    }

    // Persist memory every 6 user turns (fire-and-forget)
    const userTurnCount = messages.filter(m => m.role === 'user').length;
    if (userTurnCount > 0 && userTurnCount % 6 === 0) {
      saveCoachMemory(String(user._id), agentMessages);
    }

    // Stream the final response with all accumulated tool context
    const streamingResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: agentMessages,
      stream: true,
      temperature: 0.7,
    });

    const stream = OpenAIStream(streamingResponse);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error in coach API:', error);
    return Response.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
