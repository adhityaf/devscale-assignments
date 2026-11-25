import { OpenAIClient } from '@anvia/openai'
const BASE_URL = Bun.env.BASE_URL;
const API_KEY = Bun.env.API_KEY;

if (!BASE_URL || !API_KEY){
  throw new Error("Isi BASE_URL dan API_KEY di .env sebelum menjalankan pipeline.");
}

const client = new OpenAIClient({ 
  apiKey: API_KEY, 
  baseUrl: BASE_URL,
})

const openaiModel = client.completionModel({
    modelId: 'gpt-6-luna',
    api: "chat"
})

export { openaiModel };