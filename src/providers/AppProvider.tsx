import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Profile, HealthData } from "../domain/types";
import { Repository } from "../data/repository";
import { DemoRepository } from "../data/DemoRepository";
import { SupabaseRepository, logoutWarning } from "../data/SupabaseRepository";
import { configError, mode } from "../lib/config";
import { supabase } from "../lib/supabase";
import { clearReminders, syncReminders } from "../services/notifications";

const empty: HealthData = {
  profiles: [],
  appointments: [],
  medications: [],
  confirmations: [],
  messages: [],
};
let demoInstant: Date | null = null;
const repository: Repository | null =
  mode === "demo"
    ? new DemoRepository(AsyncStorage, () => demoInstant ?? new Date())
    : supabase
      ? new SupabaseRepository(supabase)
      : null;
type ContextValue = {
  user: Profile | null;
  data: HealthData;
  loading: boolean;
  busy: boolean;
  error: string | null;
  mode: "demo" | "supabase";
  now: Date;
  fontScale: number;
  setFontScale: (n: number) => void;
  refresh: () => Promise<void>;
  loginDemo: (id: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  mutate: (action: (r: Repository) => Promise<void>) => Promise<void>;
  resetDemo: () => Promise<void>;
  setDemoClock: (instant: Date | null) => void;
};
const AppContext = createContext<ContextValue | null>(null);
export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("AppProvider missing");
  return c;
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null),
    [data, setData] = useState(empty),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(configError),
    [now, setNow] = useState(() => new Date()),
    [fontScale, setScale] = useState(1);
  const clock = useRef<Date | null>(null),
    activeMutation = useRef(false),
    epoch = useRef(0),
    mounted = useRef(true);
  const requireRepo = () => {
    if (!repository)
      throw new Error(configError ?? "ไม่สามารถเชื่อมต่อข้อมูลได้");
    return repository;
  };
  const refresh = useCallback(async () => {
    await Promise.resolve();
    if (!repository) {
      setLoading(false);
      return;
    }
    const ticket = ++epoch.current;
    try {
      const current = await repository.getSession();
      const latest = current ? await repository.loadData() : empty;
      if (ticket !== epoch.current || !mounted.current) return;
      setUser(current);
      setData(latest);
      setError(null);
    } catch (e) {
      if (ticket === epoch.current && mounted.current) {
        setData(empty);
        setError(
          e instanceof Error ? e.message : "โหลดข้อมูลไม่ได้ กรุณาลองใหม่",
        );
      }
    } finally {
      if (ticket === epoch.current && mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const bootstrap = setTimeout(() => void refresh(), 0);
    AsyncStorage.getItem("gan-font-scale")
      .then((v) => {
        if (v) setScale(v === "1.3" ? 1.3 : v === "1.15" ? 1.15 : 1);
      })
      .catch(() => {});
    const timer = setInterval(
      () => setNow(clock.current ? new Date(clock.current) : new Date()),
      30000,
    );
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(clock.current ? new Date(clock.current) : new Date());
        void refresh();
        supabase?.auth.startAutoRefresh();
      } else {
        supabase?.auth.stopAutoRefresh();
      }
    });
    const auth = supabase?.auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    return () => {
      mounted.current = false;
      clearTimeout(bootstrap);
      clearInterval(timer);
      subscription.remove();
      auth?.data.subscription.unsubscribe();
    };
  }, [refresh]);
  useEffect(() => {
    void syncReminders(data, user, now).catch(() => {});
  }, [data, user, now]);
  const mutate = async (action: (r: Repository) => Promise<void>) => {
    if (activeMutation.current) throw new Error("กำลังบันทึก กรุณารอสักครู่");
    activeMutation.current = true;
    setBusy(true);
    setError(null);
    try {
      await action(requireRepo());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      throw e;
    } finally {
      activeMutation.current = false;
      setBusy(false);
    }
  };
  const loginDemo = async (id: string) => {
    await clearReminders();
    setData(empty);
    await mutate(async (r) => {
      await r.signInDemo(id);
    });
  };
  const login = async (email: string, password: string) => {
    await clearReminders();
    setData(empty);
    await mutate(async (r) => {
      await r.signIn(email, password);
    });
  };
  const logout = async () => {
    let warning: string | null = null;
    try {
      await clearReminders();
    } catch {
      warning =
        "ออกจากบัญชีบนอุปกรณ์นี้แล้ว แต่การยกเลิกการเตือนระยะไกลยังไม่สำเร็จ กรุณาตรวจสอบเมื่อเชื่อมต่ออินเทอร์เน็ต";
    }
    ++epoch.current;
    setData(empty);
    setUser(null);
    await mutate((r) => r.signOut());
    clock.current = null;
    demoInstant = null;
    setNow(new Date());
    if (warning || logoutWarning) setError(warning ?? logoutWarning);
  };
  const resetDemo = async () => {
    await clearReminders();
    await mutate((r) => r.resetDemo());
  };
  const setDemoClock = (instant: Date | null) => {
    if (mode !== "demo") return;
    clock.current = instant;
    demoInstant = instant;
    setNow(instant ?? new Date());
  };
  const setFontScale = (n: number) => {
    const scale = n === 1.3 ? 1.3 : n === 1.15 ? 1.15 : 1;
    setScale(scale);
    void AsyncStorage.setItem("gan-font-scale", String(scale)).catch(() => {});
  };
  return (
    <AppContext.Provider
      value={{
        user,
        data,
        loading,
        busy,
        error,
        mode,
        now,
        fontScale,
        setFontScale,
        refresh,
        loginDemo,
        login,
        logout,
        mutate,
        resetDemo,
        setDemoClock,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
