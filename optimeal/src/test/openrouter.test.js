/**
 * @jest-environment node
 */

global.fetch = jest.fn();

const callOpenRouter = async (prompt) => {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer fake-api-key`,
      "HTTP-Referer": "http://localhost",
      "X-Title": "Your App Name"
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1-0528:free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "OpenRouter API request failed");
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

test('calls OpenRouter and parses response correctly', async () => {
  const mockResponse = {
    choices: [
      {
        message: {
          content: `{
            "days": {
              "Monday": {
                "breakfast": "Smoothie",
                "lunch": "Salad",
                "dinner": "Stir-fry",
                "groceries": {
                  "breakfast": ["banana", "milk"],
                  "lunch": ["lettuce"],
                  "dinner": ["noodles"]
                }
              }
            },
            "nutrition": {
              "calories": 2000,
              "protein": 100,
              "carbs": 200,
              "fats": 70
            }
          }`
        }
      }
    ]
  };

  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse
  });

  const result = await callOpenRouter("Give me a healthy meal plan");
  expect(result).toMatch(/"days": \{/);
  expect(fetch).toHaveBeenCalledTimes(1);
});
