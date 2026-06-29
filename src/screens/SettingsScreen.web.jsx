import { YStack, XStack, Text } from "../ui/primitives";
import { colors, fonts, fontWeights, radii, accentAlpha } from "../ui/tokens";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { useSettings } from "../hooks/useSettings";
import { ss } from "../utils/scaleSize";

const isTV = () => typeof globalThis !== "undefined" && globalThis.__TV__ === true;

const ASPECT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "fill", label: "Fill" },
  { value: "stretch", label: "Stretch" },
];

function SectionTitle({ children }) {
  return (
    <Text
      color={colors.muted}
      fontFamily={fonts.display}
      fontSize={ss(11)}
      fontWeight={fontWeights.bold}
      letterSpacing={1}
      textTransform="uppercase"
      marginBottom={ss(12)}
    >
      {children}
    </Text>
  );
}

function ToggleRow({ label, value, onChange }) {
  const tv = isTV();
  return (
    <XStack
      justifyContent="space-between"
      alignItems="center"
      paddingVertical={ss(14)}
      borderBottomWidth={1}
      borderBottomColor={colors.border}
    >
      <Text color={colors.text} fontFamily={fonts.body} fontSize={ss(14)}>
        {label}
      </Text>
      <div
        role="switch"
        tabIndex={0}
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChange(!value);
          }
        }}
        style={{
          width: ss(44),
          height: ss(24),
          borderRadius: radii.pill,
          backgroundColor: value ? colors.accent : colors.border,
          position: "relative",
          cursor: "pointer",
          transition: tv ? undefined : "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: ss(3),
            left: value ? ss(23) : ss(3),
            width: ss(18),
            height: ss(18),
            borderRadius: "50%",
            backgroundColor: colors.text,
            transition: tv ? undefined : "left 0.2s",
          }}
        />
      </div>
    </XStack>
  );
}

function ChipRow({ label, options, value, onChange }) {
  return (
    <YStack paddingVertical={ss(14)} borderBottomWidth={1} borderBottomColor={colors.border}>
      <Text color={colors.muted} fontFamily={fonts.body} fontSize={ss(13)} marginBottom={ss(10)}>
        {label}
      </Text>
      <XStack gap={ss(8)} flexWrap="wrap">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Button
              key={opt.value}
              size="sm"
              variant={selected ? "secondary" : "ghost"}
              onPress={() => onChange(opt.value)}
              aria-pressed={selected}
              style={{
                borderColor: selected ? colors.accent : colors.border,
                backgroundColor: selected ? accentAlpha(0.12) : "transparent",
                color: selected ? colors.accent : colors.muted,
                fontWeight: selected ? fontWeights.bold : fontWeights.regular,
              }}
            >
              {opt.label}
            </Button>
          );
        })}
      </XStack>
    </YStack>
  );
}

export default function SettingsScreen() {
  const { settings, update } = useSettings();

  return (
    <YStack
      flex={1}
      backgroundColor={colors.bg}
      padding={ss(24)}
      maxWidth={ss(520)}
      alignSelf="center"
      width="100%"
    >
      <XStack alignItems="center" gap={ss(10)} marginBottom={ss(24)}>
        <Icon name="settings" size={ss(24)} color={colors.accent} />
        <Text
          color={colors.text}
          fontFamily={fonts.display}
          fontWeight={fontWeights.bold}
          fontSize={ss(24)}
        >
          Settings
        </Text>
      </XStack>

      <YStack marginBottom={ss(32)}>
        <SectionTitle>Playback</SectionTitle>
        <ToggleRow
          label="Autoplay next episode"
          value={settings.autoplay}
          onChange={(v) => update({ autoplay: v })}
        />
        <ChipRow
          label="Default aspect ratio"
          options={ASPECT_OPTIONS}
          value={settings.defaultAspect}
          onChange={(v) => update({ defaultAspect: v })}
        />
      </YStack>
    </YStack>
  );
}
