import Anthropic from '@anthropic-ai/sdk';

// Use Claude to curate and summarise articles for the digest
export async function curateDigest({ articles, userLeaning, frequency, categories }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set. Add it to your Coolify environment variables or .env file.');
  }

  const anthropic = new Anthropic();
  // Prepare a condensed article list for the prompt
  const articleSummaries = articles.slice(0, 80).map((a, i) => (
    `[${i}] "${a.title}" — ${a.sourceName} (${a.category}) | ${a.summary?.slice(0, 200) || 'No summary'}`
  )).join('\n');

  const enabledCategories = categories
    .filter((c) => c.enabled)
    .map((c) => `${c.category} (weight: ${c.weight}/10)`)
    .join(', ');

  const prompt = `You are an expert newspaper editor curating a ${frequency} news digest.

The reader's political leaning is: ${userLeaning}
Their preferred categories (with importance weights): ${enabledCategories}
This digest covers the ${frequency === 'daily' ? 'past 24 hours' : 'past week'}.

Here are the available articles:
${articleSummaries}

Select the 12-18 most important and interesting articles for this reader's digest. For each selected article, provide:
1. A compelling newspaper-style headline (can differ from the original)
2. A subtitle/deck (one line)
3. A 2-4 paragraph summary written in quality journalistic style
4. An importance score from 1-10 (10 = lead story)
5. Which original article index it corresponds to

Consider the reader's political leaning when:
- Selecting opinion pieces that align with their perspective
- Framing summaries with appropriate context
- Prioritising sources that match their viewpoint for opinion/analysis
- Keep hard news factual regardless of leaning

Format your response as JSON:
{
  "digest_title": "string — a newspaper masthead subtitle for today, e.g. 'Week in Review: [theme]'",
  "articles": [
    {
      "index": 0,
      "headline": "string",
      "subtitle": "string",
      "summary": "string (2-4 paragraphs)",
      "importance": 8,
      "category": "string"
    }
  ]
}

Return ONLY valid JSON, no markdown fences or other text.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text;

  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from response if wrapped in other text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse curator response as JSON');
  }
}
