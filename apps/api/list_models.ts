import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();
const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
async function run() {
  const models = await client.getModels(); // Oops, wait, the API might not have this method in this version, let's just make a curl directly.
}
