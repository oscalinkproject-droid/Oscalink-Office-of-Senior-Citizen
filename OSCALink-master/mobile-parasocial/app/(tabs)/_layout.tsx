import { Tabs } from 'expo-router/tabs';
import { Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  const icons: Record<string, string> = {
    dashboard: '▦',
    directory: '👥',
    register: '＋',
    endorsements: '📤',
    programs: '📢',
    settings: '⚙️',
  };
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {icons[icon] || '○'}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon icon="dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="register"
        options={{
          title: 'Register',
          tabBarIcon: ({ focused }) => <TabIcon icon="register" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: ({ focused }) => <TabIcon icon="directory" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="endorsements"
        options={{
          title: 'Endorse',
          tabBarIcon: ({ focused }) => <TabIcon icon="endorsements" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
          tabBarIcon: ({ focused }) => <TabIcon icon="programs" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon icon="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.outline,
    borderTopWidth: 1,
    paddingTop: 6,
    height: 85,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  icon: {
    fontSize: 22,
  },
  iconFocused: {
    color: COLORS.primary,
  },
});
