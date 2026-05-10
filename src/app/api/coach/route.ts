import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import { ChatOpenAI } from '@langchain/openai';
import { LangChainStream, StreamingTextResponse, Message as AIMessage } from 'ai';
import { HumanMessage, SystemMessage, AIMessage as LangChainAIMessage } from '@langchain/core/messages';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    await dbConnect();
    const session = await getServerSession(authOptions);
    const userSession = session?.user;

    if (!session || !userSession) {
      return Response.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await UserModel.findById(userSession._id);
    if (!user) {
      return Response.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const feedbackMessages = user.messages.map((m) => m.content).join('\n- ');
    
    const systemPrompt = `You are a helpful and supportive AI Coach for the user.
The user has received the following anonymous feedback messages:
- ${feedbackMessages || 'No feedback received yet.'}

Analyze the feedback to help the user grow. Answer their questions constructively, point out themes, and offer actionable advice based on their feedback. Be polite and encouraging.`;

    const { stream, handlers } = LangChainStream();

    const model = new ChatOpenAI({
      modelName: process.env.AI_MODEL_NAME || 'gpt-4o-mini',
      streaming: true,
      temperature: 0.7,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
      }
    });

    const langChainMessages = [
      new SystemMessage(systemPrompt),
      ...messages.map((m: AIMessage) => 
        m.role === 'user' ? new HumanMessage(m.content) : new LangChainAIMessage(m.content)
      )
    ];

    model.invoke(langChainMessages, { callbacks: [handlers] }).catch(console.error);

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error in coach API:', error);
    return Response.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
