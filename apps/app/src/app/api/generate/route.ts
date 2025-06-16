import { env } from "@/env.mjs";
import { openai } from "@ai-sdk/openai";
import { client } from "@comp/kv";
import { Ratelimit } from "@upstash/ratelimit";
import { streamText } from "ai";
import { match } from "ts-pattern";

export async function POST(req: Request): Promise<Response> {
  if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === "") {
    return new Response(
      "Missing OPENAI_API_KEY - make sure to add it to your .env file.",
      {
        status: 400,
      },
    );
  }

  let ratelimit: Ratelimit | undefined;

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";

    ratelimit = new Ratelimit({
      limiter: Ratelimit.fixedWindow(100, "1 d"),
      redis: client,
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(
      `novel_ratelimit_${ip}`,
    );

    if (!success) {
      return new Response("You have reached your request limit for the day.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  const { prompt, option, command } = await req.json();
  const messages = match(option)
    .with("continue", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that continues existing text based on context from prior text. " +
          "Give more weight/priority to the later characters than the beginning ones. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Output only the generated text without any introduction, explanation, or meta-commentary. " +
          "Do not include any greetings or other text that is not part of the text you are generating.",
      },
      {
        role: "user",
        content: prompt,
      },
    ])
    .with("improve", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that improves existing text. " +
          "Output only the improved text without any introduction, explanation, or meta-commentary. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences. " +
          "Output only the improved text without any introduction, explanation, or meta-commentary. " +
          "Do not include any greetings or other text that is not part of the text you are generating.",
      },
      {
        role: "user",
        content: `Improve this text without any introduction or meta-commentary: ${prompt}`,
      },
    ])
    .with("shorter", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that shortens existing text. " +
          "Output only the shortened text without any introduction, explanation, or meta-commentary. " +
          "Do not include any greetings or other text that is not part of the text you are generating.",
      },
      {
        role: "user",
        content: `Shorten this text without any introduction or meta-commentary: ${prompt}`,
      },
    ])
    .with("longer", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that lengthens existing text. " +
          "Output only the lengthened text without any introduction, explanation, or meta-commentary. " +
          "Do not include any greetings or other text that is not part of the text you are generating.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("fix", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that fixes grammar and spelling errors in existing text. " +
          "Output only the corrected text without any introduction, explanation, or meta-commentary. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences. " +
          "Do not include any greetings or other text that is not part of the text you are generating. ",
      },
      {
        role: "user",
        content: `Fix the grammar and spelling in this text without any introduction or meta-commentary: ${prompt}`,
      },
    ])
    .with("zap", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that generates text based on a prompt. " +
          "Output only the generated text without any introduction, explanation, or meta-commentary. " +
          "You take an input from the user and a command for manipulating the text" +
          "Do not include any greetings or other text that is not part of the text you are generating.",
      },
      {
        role: "user",
        content: `For this text: ${prompt}. You have to respect the command: ${command}`,
      },
    ])
    .run();

  const result = streamText({
    prompt: messages[messages.length - 1].content,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    model: openai("gpt-4o-mini"),
  });

  return (await result).toDataStreamResponse();
}
