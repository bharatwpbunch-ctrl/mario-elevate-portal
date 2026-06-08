"use server"

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options)
    
    // Retry on 503 (Service Unavailable) or 429 (Too Many Requests)
    if (response.status === 503 || response.status === 429) {
      if (retries > 0) {
        console.warn(`Gemini API returned ${response.status}. Retrying in ${delay}ms... (${retries} retries left)`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return fetchWithRetry(url, options, retries - 1, delay * 1.5)
      }
    }
    
    return response
  } catch (error) {
    if (retries > 0) {
      console.warn(`Fetch error on Gemini API. Retrying in ${delay}ms... (${retries} retries left)`, error)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchWithRetry(url, options, retries - 1, delay * 1.5)
    }
    throw error
  }
}

export async function parseResumeWithAI(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      error: "GEMINI_API_KEY is not set in .env.local. Please configure your Gemini API Key."
    };
  }

  const prompt = `You are a professional resume parsing system.
Analyze the following resume text and extract candidate information.
Ensure you return a clean JSON matching the requested schema.

Resume Text:
${text}`;

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                fullName: { type: "STRING" },
                email: { type: "STRING" },
                phone: { type: "STRING" },
                occupation: { type: "STRING" },
                experienceYears: { type: "INTEGER" },
                skills: { type: "ARRAY", items: { type: "STRING" } },
                location: { type: "STRING" },
                currentCompany: { type: "STRING" },
                currentDesignation: { type: "STRING" },
                preferredLocation: { type: "STRING" },
              },
              required: ["fullName", "email", "phone", "occupation", "experienceYears"],
            },
          },
        }),
      },
      3,   // 3 retries
      1000 // start with 1 second delay
    );

    if (!response.ok) {
      const errText = await response.text();
      return {
        error: `Failed to call Gemini API: ${response.status} ${response.statusText}. ${errText}`
      };
    }

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) {
      return {
        error: "Gemini API returned an empty or invalid response."
      };
    }

    const parsed = JSON.parse(rawJson);
    return { data: parsed };
  } catch (error: any) {
    console.error("Error parsing resume with Gemini API:", error);
    return {
      error: error.message || "An unexpected error occurred while calling the Gemini API."
    };
  }
}
