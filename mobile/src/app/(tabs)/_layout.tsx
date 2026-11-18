import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { colors } from '@/shared/constants/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = colors.primary;
  const inactiveColor = colorScheme === 'dark' ? '#94A3B8' : '#64748B';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#334155' : '#E2E8F0',
          paddingBottom: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Rotas',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'list-outline' : 'list'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'time-outline' : 'time'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'map-outline' : 'map'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person-outline' : 'person'} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}