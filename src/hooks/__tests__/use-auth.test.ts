import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignInAction = vi.mocked(signInAction);
const mockSignUpAction = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({
      id: "new-project-id",
      name: "New Design",
      userId: "user-1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("returns signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    it("calls signInAction with email and password", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockSignInAction).toHaveBeenCalledWith("user@example.com", "password123");
    });

    it("returns the result from signInAction", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      let returnValue: { success: boolean; error?: string } | undefined;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrong");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    });

    it("sets isLoading to true while signing in and false after", async () => {
      let resolveSignIn!: (v: { success: boolean }) => void;
      mockSignInAction.mockReturnValue(
        new Promise((res) => { resolveSignIn = res; })
      );
      mockGetProjects.mockResolvedValue([{ id: "p1", name: "P", createdAt: new Date(), updatedAt: new Date() }]);

      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);

      let signInPromise: Promise<unknown>;
      act(() => {
        signInPromise = result.current.signIn("user@example.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: true });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("sets isLoading to false even if signInAction throws", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does not navigate when sign in fails", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    it("calls signUpAction with email and password", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockSignUpAction).toHaveBeenCalledWith("new@example.com", "password123");
    });

    it("returns the result from signUpAction", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      let returnValue: { success: boolean; error?: string } | undefined;
      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "pass");
      });

      expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    });

    it("sets isLoading to false even if signUpAction throws", async () => {
      mockSignUpAction.mockRejectedValue(new Error("DB error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("user@example.com", "pass").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does not navigate when sign up fails", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("existing@example.com", "pass");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — anon work with messages", () => {
    beforeEach(() => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockSignUpAction.mockResolvedValue({ success: true });
    });

    it("creates a project from anon work and navigates to it", async () => {
      const anonMessages = [{ role: "user", content: "make a button" }];
      const anonFileSystem = { "/App.jsx": { content: "export default () => <button />" } };
      mockGetAnonWorkData.mockReturnValue({ messages: anonMessages, fileSystemData: anonFileSystem });
      mockCreateProject.mockResolvedValue({
        id: "anon-project-id",
        name: "Design from ...",
        userId: "user-1",
        messages: JSON.stringify(anonMessages),
        data: JSON.stringify(anonFileSystem),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonMessages,
          data: anonFileSystem,
        })
      );
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    it("includes a time-based name when creating from anon work", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: {},
      });
      mockCreateProject.mockResolvedValue({
        id: "p-anon",
        name: "Design from 12:00:00 PM",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      const callArg = mockCreateProject.mock.calls[0][0];
      expect(callArg.name).toMatch(/^Design from /);
    });

    it("does not call getProjects when anon work has messages", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: {},
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    it("works the same way after signUp with anon work", async () => {
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "make a form" }],
        fileSystemData: { "/App.jsx": {} },
      });
      mockCreateProject.mockResolvedValue({
        id: "signup-anon-id",
        name: "Design from ...",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/signup-anon-id");
    });
  });

  describe("handlePostSignIn — anon work with empty messages", () => {
    beforeEach(() => {
      mockSignInAction.mockResolvedValue({ success: true });
    });

    it("falls through to getProjects when anon work has no messages", async () => {
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue([
        { id: "existing-id", name: "Old Project", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-id");
    });
  });

  describe("handlePostSignIn — no anon work, existing projects", () => {
    beforeEach(() => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
    });

    it("navigates to the most recent project", async () => {
      mockGetProjects.mockResolvedValue([
        { id: "recent-id", name: "Recent", createdAt: new Date(), updatedAt: new Date() },
        { id: "old-id", name: "Old", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-id");
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it("navigates to the only project when there is exactly one", async () => {
      mockGetProjects.mockResolvedValue([
        { id: "only-id", name: "Only", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/only-id");
    });
  });

  describe("handlePostSignIn — no anon work, no projects", () => {
    beforeEach(() => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
    });

    it("creates a new blank project and navigates to it", async () => {
      mockCreateProject.mockResolvedValue({
        id: "brand-new-id",
        name: "New Design #42",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
    });

    it("uses a random number in the new project name", async () => {
      mockCreateProject.mockResolvedValue({
        id: "p-new",
        name: "New Design #12345",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass");
      });

      const callArg = mockCreateProject.mock.calls[0][0];
      expect(callArg.name).toMatch(/^New Design #\d+$/);
    });

    it("works the same way after signUp with no existing projects", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockCreateProject.mockResolvedValue({
        id: "signup-new-id",
        name: "New Design #99",
        userId: "user-1",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/signup-new-id");
    });
  });
});
