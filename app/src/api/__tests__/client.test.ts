import { ApiError, apiRequest, isApiConfigured } from "../client";

const API_URL = "http://api.test";

function respond(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status < 400,
    status,
    statusText: "status text",
    json: () => Promise.resolve(body),
  }) as jest.Mock;
}

describe("apiRequest", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = API_URL;
  });
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it("sends JSON to the configured API and returns the body", async () => {
    respond(201, { ok: true });

    const body = await apiRequest("/v1/bonus-lessons", {
      method: "POST",
      body: { request: "insurance" },
    });

    expect(body).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(`${API_URL}/v1/bonus-lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: "insurance" }),
    });
  });

  it("throws ApiError with the contract's error code", async () => {
    respond(422, {
      error: { code: "off_topic_request", message: "Only money", details: {} },
    });

    await expect(apiRequest("/v1/bonus-lessons")).rejects.toMatchObject({
      status: 422,
      code: "off_topic_request",
    });
  });

  it("throws a generic ApiError when the error body is not the contract shape", async () => {
    respond(500, null);

    await expect(apiRequest("/v1/lessons/saving")).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it("reports whether the API URL is set", () => {
    expect(isApiConfigured()).toBe(true);
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(isApiConfigured()).toBe(false);
  });
});
