import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;

    if (!audio) {
      return Response.json({ success: false, message: 'No audio file provided' }, { status: 400 });
    }

    // Step 1: Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audio,
      response_format: 'json',
    });

    const transcript = transcription.text.trim();
    if (!transcript) {
      return Response.json({ success: false, message: 'Could not transcribe audio' }, { status: 422 });
    }

    // Step 2: Detect tone from transcript
    const toneResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Analyze the emotional tone of this message and respond with exactly one word from: hesitant, confident, appreciative, frustrated, neutral. No punctuation or explanation. Message: "${transcript}"`,
        },
      ],
      max_tokens: 5,
      temperature: 0,
    });

    const tone = toneResponse.choices[0].message.content?.trim().toLowerCase() || 'neutral';

    return Response.json({ success: true, transcript, tone });
  } catch (error) {
    console.error('Error in transcribe API:', error);
    return Response.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}