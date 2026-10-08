import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  logoutWarning,
  SupabaseRepository,
} from "../src/data/SupabaseRepository";

describe("Supabase logout privacy", () => {
  it("clears the local auth session even if installation token cleanup fails offline", async () => {
    const rpc = vi.fn().mockRejectedValue(new Error("Offline"));
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const client = { rpc, auth: { signOut } } as unknown as SupabaseClient;
    await new SupabaseRepository(
      client,
      async () => "this-installation",
    ).signOut();
    expect(rpc).toHaveBeenCalledWith("unregister_device_tokens", {
      p_device_id: "this-installation",
    });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(logoutWarning).toContain("ยกเลิกการเตือนระยะไกลไม่ได้");
  });
  it("does not block logout after an offline revocation error once the local session is removed", async () => {
    const signOut = vi
      .fn()
      .mockResolvedValue({ error: { message: "Offline" } });
    const getSession = vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null });
    const client = {
      auth: { signOut, getSession },
    } as unknown as SupabaseClient;
    await expect(
      new SupabaseRepository(client).signOut(),
    ).resolves.toBeUndefined();
    expect(logoutWarning).toContain("ยังติดต่อเซิร์ฟเวอร์");
  });
});
