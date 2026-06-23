import { TamaguiProvider } from 'tamagui';
import { tamaguiConfig } from './src/tamagui.config';
import { AppProvider } from './src/context/AppContext';
import { PlatformProvider } from './src/platform/PlatformProvider';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
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
