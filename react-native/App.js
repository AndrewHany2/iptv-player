import 'react-native-url-polyfill/auto';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../shared/src/tamagui.config.js';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </TamaguiProvider>
  );
}
