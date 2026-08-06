/**
 * The one concrete `RealModeProvider` adapter this milestone ships,
 * speaking the OpenAI-compatible REST shape (`POST {baseUrl}/embeddings`,
 * `POST {baseUrl}/chat/completions`) via native `fetch` -- no SDK
 * dependency, no vendor name in this file's own logic (only in the
 * `ProviderConfig` value passed in). See
 * contracts/real-mode-provider-contract.md.
 */
import type { ProviderConfig, RealModeError, RealModeErrorKind, RealModeProvider } from "./types";

const TIMEOUT_MS = 30_000;

function makeError(kind: RealModeErrorKind, message: string): RealModeError {
  // `stage` is filled in by the caller (which step/call this happened
  // during) -- the provider itself has no concept of "which call in a
  // sequence this was."
  return { kind, message, stage: "" };
}

function kindForStatus(status: number): RealModeErrorKind {
  if (status === 401) return "invalid-key";
  if (status === 429) return "rate-limit";
  return "other";
}

function messageForFailure(kind: RealModeErrorKind, status: number): string {
  switch (kind) {
    case "invalid-key":
      return "The provider rejected this API key. Check that it's correct and active, then try again.";
    case "rate-limit":
      return "The provider is rate-limiting these requests. Wait a moment and try again.";
    default:
      return `The provider returned an unexpected error (status ${status}).`;
  }
}

async function postJson(
  config: ProviderConfig,
  apiKey: string,
  path: string,
  body: unknown,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw makeError("network", "The request took longer than 30 seconds and was cancelled.");
    }
    throw makeError("network", "Could not reach the provider -- check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const kind = kindForStatus(response.status);
    throw makeError(kind, messageForFailure(kind, response.status));
  }

  try {
    return await response.json();
  } catch {
    throw makeError("other", "The provider's response could not be parsed.");
  }
}

export function createOpenAICompatibleProvider(config: ProviderConfig, apiKey: string): RealModeProvider {
  return {
    async embedBatch(texts) {
      const json = (await postJson(config, apiKey, "/embeddings", {
        model: config.embeddingsModel,
        input: texts,
      })) as { data?: { embedding: number[] }[] };

      if (!Array.isArray(json.data)) {
        throw makeError("other", "The provider's embeddings response was not in the expected shape.");
      }
      return json.data.map((d) => d.embedding);
    },

    async generate(prompt, opts) {
      const json = (await postJson(config, apiKey, "/chat/completions", {
        model: config.chatModel,
        messages: [{ role: "user", content: prompt }],
        temperature: opts.temperature,
      })) as { choices?: { message?: { content?: string } }[] };

      const content = json.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw makeError("other", "The provider's completion response was not in the expected shape.");
      }
      return content;
    },
  };
}
