import { Modal, View } from "react-native";
import { Button, Card, Txt } from "./ui";
export function Confirmation({
  title,
  description,
  onConfirm,
  onCancel,
  busy = false,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: "rgba(23,49,77,0.4)",
        }}
      >
        <Card>
          <Txt style={{ fontSize: 21, fontWeight: "700" }}>{title}</Txt>
          <Txt>{description}</Txt>
          <Button label="ยืนยัน" loading={busy} onPress={onConfirm} />
          <Button
            label="กลับ"
            variant="secondary"
            disabled={busy}
            onPress={onCancel}
          />
        </Card>
      </View>
    </Modal>
  );
}
