import { Spinner, YStack, Text } from '../ui/primitives';
import { colors } from '../ui/tokens';

export const Loader = ({ message = 'Loading...' }) => (
  <YStack
    position="absolute"
    top={0} left={0} right={0} bottom={0}
    alignItems="center"
    justifyContent="center"
    backgroundColor="rgba(0,0,0,0.85)"
    zIndex={1000}
  >
    <Spinner size="large" color={colors.accent} />
    <Text color={colors.text} marginTop={12} fontSize={16}>{message}</Text>
  </YStack>
);

export default Loader;
