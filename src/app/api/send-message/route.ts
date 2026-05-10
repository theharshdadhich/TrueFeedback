import UserModel from '@/model/User';
import dbConnect from '@/lib/dbConnect';
import { Message } from '@/model/User';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedAndLocalize(content: string): Promise<{
  vector: number[];
  detectedLanguage?: string;
  contentTranslated?: string;
}> {
  const [embeddingRes, langRes] = await Promise.all([
    openai.embeddings.create({ model: 'text-embedding-3-small', input: content }),
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Detect the language of this text. If it is not English, translate it to English. Respond with JSON only, no markdown: {"language": "English", "isEnglish": true, "translation": null} or {"language": "Spanish", "isEnglish": false, "translation": "translated text here"}. Text: "${content}"`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    }),
  ]);

  const vector = embeddingRes.data[0].embedding;

  let detectedLanguage: string | undefined;
  let contentTranslated: string | undefined;

  try {
    const parsed = JSON.parse(langRes.choices[0].message.content || '{}');
    detectedLanguage = parsed.language;
    if (!parsed.isEnglish && parsed.translation) {
      contentTranslated = parsed.translation;
    }
  } catch {
    // language detection failed — non-fatal
  }

  return { vector, detectedLanguage, contentTranslated };
}

export async function POST(request: Request) {
  await dbConnect();
  const { username, content } = await request.json();

  try {
    const user = await UserModel.findOne({ username }).exec();

    if (!user) {
      return Response.json(
        { message: 'User not found', success: false },
        { status: 404 }
      );
    }

    if (!user.isAcceptingMessages) {
      return Response.json(
        { message: 'User is not accepting messages', success: false },
        { status: 403 }
      );
    }

    const { vector, detectedLanguage, contentTranslated } = await embedAndLocalize(content);

    const newMessage = {
      content,
      createdAt: new Date(),
      vector,
      detectedLanguage,
      contentTranslated,
    };

    user.messages.push(newMessage as Message);
    await user.save();

    return Response.json(
      { message: 'Message sent successfully', success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding message:', error);
    return Response.json(
      { message: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
