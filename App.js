import { TamaguiProvider } from 'tamagui';
import { useFonts } from 'expo-font';
import { tamaguiConfig } from './src/tamagui.config';
import { AppProvider } from './src/context/AppContext';
import { PlatformProvider } from './src/platform/PlatformProvider';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  // Aurora typeface: Space Grotesk (display) + Inter (body), registered under
  // clean family names so tokens/CSS can reference "SpaceGrotesk" / "Inter".
  // Not gated on load — the UI renders immediately with the system fallback and
  // swaps in the webfonts when ready (so TV never shows a blank screen).
  useFonts({
    SpaceGrotesk: require('@expo-google-fonts/space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf'),
    Inter: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  });

  return (
    <PlatformProvider>
      <TamaguiProvider config={tamaguiConfig}>
        <AppProvider>
          <AppNavigator />
        </AppProvider>
      </TamaguiProvider>
    </PlatformProvider>
  );
}
