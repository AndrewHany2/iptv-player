import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useApp } from '../context/AppContext';
import { isSupabaseConfigured } from '../services/supabase';

import AuthScreen from '../screens/AuthScreen';
import LiveTVScreen from '../screens/LiveTVScreen';
import MoviesScreen from '../screens/MoviesScreen';
import SeriesScreen from '../screens/SeriesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import VideoPlayerScreen from '../screens/VideoPlayerScreen';
import AccountsScreen from '../screens/AccountsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: '#1a1a2e' },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#888',
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
      }}
    >
      <Tab.Screen
        name="LiveTV"
        component={LiveTVScreen}
        options={{
          title: 'Live TV',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📺</Text>,
        }}
      />
      <Tab.Screen
        name="Movies"
        component={MoviesScreen}
        options={{
          title: 'Movies',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎬</Text>,
        }}
      />
      <Tab.Screen
        name="Series"
        component={SeriesScreen}
        options={{
          title: 'Series',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎭</Text>,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🕘</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { authUser, authLoading } = useApp();

  if (authLoading) return null;

  const needsAuth = isSupabaseConfigured() && !authUser;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#0f0f23' },
        }}
      >
        {needsAuth ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="VideoPlayer"
              component={VideoPlayerScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="Accounts"
              component={AccountsScreen}
              options={{
                title: 'IPTV Accounts',
                presentation: 'modal',
                headerStyle: { backgroundColor: '#1a1a2e' },
                headerTintColor: '#fff',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
