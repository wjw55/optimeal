async function callOpenRouter({ apiKey, model, prompt, siteUrl }) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": siteUrl,
      "X-Title": "Optimeal"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You generate valid JSON meal plans for a meal planning app. Return only JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.55,
      response_format: {
        type: "json_object"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${errorText}`);
  }

  const data = await response.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "";

  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return content;
}

module.exports = {
  callOpenRouter
};
