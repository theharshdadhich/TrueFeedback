import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    await dbConnect();

    // Fetch user context if username is provided
    let context = '';
    if (username) {
      const user = await UserModel.findOne({ username });
      if (user && user.profileContext) {
        context = user.profileContext;
      }
    }

    const promptText = `
    You are an AI assistant helping a user generate engaging, open-ended questions for an anonymous feedback platform.
    
    ${context ? `The user has provided the following context about themselves or what they are looking for: "${context}"` : `The user has not provided specific context, so generate general interesting questions.`}
    
    Generate exactly 3 diverse, thoughtful questions that someone could ask this user. 
    Format the output as a single string, with each question separated by " || ".
    Do not include any numbering, quotes, or additional text. Just the questions separated by " || ".
    
    Example output:
    What’s a hobby you’ve recently started? || If you could have dinner with any historical figure, who would it be? || What’s a simple thing that makes you happy?
    `;

    const prompt = PromptTemplate.fromTemplate(promptText);
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
    });
    const parser = new StringOutputParser();

    const chain = prompt.pipe(model).pipe(parser);
    const responseString = await chain.invoke({});

    const questions = responseString.split('||').map((q) => q.trim());

    return Response.json({ questions });
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return Response.json(
      { message: 'Failed to generate message suggestions' },
      { status: 500 }
    );
  }
}
