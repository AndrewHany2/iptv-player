import { Spinner, Stack, Text } from 'tamagui';

export const Loader = ({ message = 'Loading...' }) => (
  <Stack
    position="absolute"
    top={0}
    left={0}
    right={0}
    bottom={0}
    alignItems="center"
    justifyContent="center"
    backgroundColor="rgba(0,0,0,0.85)"
    zIndex={1000}
  >
    <Spinner size="large" color="$blue10" />
    <Text color="white" marginTop="$3" fontSize="$4">
      {message}
    </Text>
  </Stack>
);

export default Loader;
