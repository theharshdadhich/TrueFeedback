import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import OpenAI from 'openai';
import { kmeans } from 'ml-kmeans';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: Request) {
  try {
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

    const allMessages = user.messages;
    if (allMessages.length < 3) {
      return Response.json({
        success: true,
        clusters: [],
        note: 'Need at least 3 messages to generate insights.',
      });
    }

    const embeddedMessages = allMessages.filter(m => m.vector && m.vector.length > 0);

    // If no embeddings yet, fall back to LLM-only summary
    if (embeddedMessages.length < 3) {
      const fallbackResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `Analyze these anonymous feedback messages and identify 2-3 distinct themes. For each theme, provide a name and a short summary. Return JSON: {"clusters": [{"name": "...", "summary": "...", "messageCount": N, "representativeQuote": "..."}]}

Feedback:
${allMessages.map(m => `- "${m.content}"`).join('\n')}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,
      });
      const parsed = JSON.parse(fallbackResponse.choices[0].message.content || '{"clusters":[]}');
      return Response.json({ success: true, ...parsed });
    }

    // K-means clustering on embedding vectors
    const vectors = embeddedMessages.map(m => m.vector);
    const k = Math.min(5, Math.max(2, Math.floor(embeddedMessages.length / 3)));
    const result = kmeans(vectors, k, { initialization: 'kmeans++' });

    // Group messages by cluster index
    const groups: { messages: string[]; representativeQuote: string }[] = Array.from(
      { length: k },
      () => ({ messages: [], representativeQuote: '' })
    );

    result.clusters.forEach((clusterIdx, msgIdx) => {
      const msg = embeddedMessages[msgIdx];
      groups[clusterIdx].messages.push(msg.content);
    });

    // Remove empty clusters
    const nonEmptyGroups = groups.filter(g => g.messages.length > 0);

    // Ask LLM to name and summarize each cluster (one batched call)
    const clusterDescriptions = nonEmptyGroups
      .map((g, i) => `Cluster ${i + 1} (${g.messages.length} messages):\n${g.messages.map(m => `- "${m}"`).join('\n')}`)
      .join('\n\n');

    const namingResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `You are analyzing clusters of anonymous feedback. For each cluster, give it a descriptive theme name, a one-sentence summary, and pick the most representative quote. Return JSON only: {"clusters": [{"name": "...", "summary": "...", "messageCount": N, "representativeQuote": "..."}]}

${clusterDescriptions}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
    });

    const parsed = JSON.parse(namingResponse.choices[0].message.content || '{"clusters":[]}');

    // Merge in actual message counts from our grouping
    if (Array.isArray(parsed.clusters)) {
      parsed.clusters = parsed.clusters.map(
        (c: { name: string; summary: string; messageCount: number; representativeQuote: string }, i: number) => ({
          ...c,
          messageCount: nonEmptyGroups[i]?.messages.length ?? c.messageCount,
        })
      );
    }

    return Response.json({ success: true, ...parsed, totalMessages: allMessages.length });
  } catch (error) {
    console.error('Error in insights API:', error);
    return Response.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}