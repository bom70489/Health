export const mode =
  process.env.EXPO_PUBLIC_USE_DEMO_MODE === "false" ? "supabase" : "demo";
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const configError =
  mode === "supabase" && (!supabaseUrl || !supabaseAnonKey)
    ? "ยังไม่ได้ตั้งค่า Supabase กรุณาตรวจสอบ URL และ public key ใน .env แล้วเริ่มแอปใหม่"
    : null;
