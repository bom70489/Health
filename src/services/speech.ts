import * as Speech from "expo-speech";
export async function readAloud(text: string): Promise<string | null> {
  try {
    await Speech.stop();
    const voices = await Speech.getAvailableVoicesAsync();
    const thai = voices.find((v) => v.language.toLowerCase().startsWith("th"));
    if (!thai)
      return "อุปกรณ์นี้ยังไม่มีเสียงภาษาไทย กรุณาติดตั้งเสียงภาษาไทยในการตั้งค่าอุปกรณ์";
    Speech.speak(text, {
      language: "th-TH",
      voice: thai.identifier,
      rate: 0.85,
    });
    return null;
  } catch {
    return "อุปกรณ์นี้ไม่รองรับการอ่านออกเสียง";
  }
}
export async function stopSpeech(): Promise<void> {
  try {
    await Speech.stop();
  } catch {
    /* Devices without speech still support all text flows. */
  }
}
