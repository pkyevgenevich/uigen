// @vitest-environment node
import { vi, test, expect, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const { createSession, getSession, deleteSession, verifySession } = await import("@/lib/auth");

const SECRET = new TextEncoder().encode("development-secret-key");

async function signToken(payload: object) {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// createSession

test("createSession sets an httpOnly cookie", async () => {
  await createSession("user-1", "a@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, , options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession stores a valid JWT containing userId and email", async () => {
  await createSession("user-1", "a@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const { jwtVerify } = await import("jose");
  const { payload } = await jwtVerify(token, SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("a@example.com");
});

// getSession

test("getSession returns null when cookie is absent", async () => {
  mockCookieStore.get.mockReturnValue(undefined);
  expect(await getSession()).toBeNull();
});

test("getSession returns null for a malformed token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not.a.jwt" });
  expect(await getSession()).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const token = await signToken({ userId: "user-1", email: "a@example.com", expiresAt: new Date() });
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("a@example.com");
});

// deleteSession

test("deleteSession removes the auth-token cookie", async () => {
  await deleteSession();
  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

// verifySession

test("verifySession returns null when request has no cookie", async () => {
  const req = new NextRequest("http://localhost/api/test");
  expect(await verifySession(req)).toBeNull();
});

test("verifySession returns null for a malformed token", async () => {
  const req = new NextRequest("http://localhost/api/test", {
    headers: { cookie: "auth-token=bad.token" },
  });
  expect(await verifySession(req)).toBeNull();
});

test("verifySession returns session payload for a valid token", async () => {
  const token = await signToken({ userId: "user-2", email: "b@example.com", expiresAt: new Date() });
  const req = new NextRequest("http://localhost/api/test", {
    headers: { cookie: `auth-token=${token}` },
  });

  const session = await verifySession(req);
  expect(session?.userId).toBe("user-2");
  expect(session?.email).toBe("b@example.com");
});
