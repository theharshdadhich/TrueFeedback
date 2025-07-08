export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Using the prompt as the basis for hard-coded outputs
    const questions = [
      "What’s a hobby you’ve recently started?",
      "If you could have dinner with any historical figure, who would it be?",
      "What’s a simple thing that makes you happy?"
    ];

    // Return the three questions directly
    return Response.json({ questions });
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    throw error;
  }
}
