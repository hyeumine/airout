import React from 'react'
import { Tabs } from 'expo-router'
import { Text, View } from 'react-native'
import { useTheme } from '../../src/theme/ThemeProvider'

function Icon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>
}

export default function TabLayout() {
  const { colors } = useTheme()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: 'transparent',
          height: 74,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Icon glyph="⌂" color={color} /> }} />
      <Tabs.Screen name="community" options={{ title: 'Community', tabBarIcon: ({ color }) => <Icon glyph="♡" color={color} /> }} />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'Listen',
          tabBarShowLabel: false,
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.onPrimary, fontSize: 22 }}>✦</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="journal" options={{ title: 'Journal', tabBarIcon: ({ color }) => <Icon glyph="▤" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Icon glyph="☺" color={color} /> }} />
    </Tabs>
  )
}
