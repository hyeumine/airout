import React, { useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'

export function Screen({
  children,
  safe = false,
  scroll = true,
  footer,
}: {
  children: React.ReactNode
  safe?: boolean
  scroll?: boolean
  footer?: React.ReactNode
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  )
  return (
    <View style={[styles.flex, { backgroundColor: colors.bg, paddingTop: safe ? insets.top + 8 : 0 }]}>
      {body}
      {footer}
    </View>
  )
}

export function FadeIn({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== 'web' }).start()
  }, [opacity])
  return <Animated.View style={{ opacity }}>{children}</Animated.View>
}

export function Title({ children, subtitle }: { children: string; subtitle?: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.titleBlock}>
      <Text accessibilityRole="header" style={[styles.h1, { color: colors.ink }]}>{children}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
    </View>
  )
}

export function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
}

export function Button({
  label,
  onPress,
  variant = 'solid',
  disabled = false,
}: {
  label: string
  onPress: () => void
  variant?: 'solid' | 'outline' | 'quiet'
  disabled?: boolean
}) {
  const { colors } = useTheme()
  const solid = variant === 'solid'
  const quiet = variant === 'quiet'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: solid ? colors.primary : 'transparent',
          borderColor: quiet ? 'transparent' : colors.primary,
          borderWidth: quiet ? 0 : 1,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ color: solid ? colors.onPrimary : colors.primary, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  )
}

export function Field(props: TextInputProps & { label: string }) {
  const { colors } = useTheme()
  const { label, style, ...rest } = props
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        style={[styles.input, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surface }, style]}
        {...rest}
      />
    </View>
  )
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.primarySoft }]}
    >
      <Text style={{ color: selected ? colors.onPrimary : colors.ink }}>{label}</Text>
    </Pressable>
  )
}

export function Banner({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.banner, { backgroundColor: colors.warm, borderColor: colors.border }]}>
      <Text style={{ color: colors.ink, lineHeight: 20 }}>{children}</Text>
    </View>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme()
  return (
    <Card>
      <Text style={[styles.h2, { color: colors.ink }]}>{title}</Text>
      <Text style={{ color: colors.muted, lineHeight: 21 }}>{body}</Text>
    </Card>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.muted, marginTop: 8 }}>{label}</Text>
    </View>
  )
}

export function ErrorNote({ message }: { message: string }) {
  const { colors } = useTheme()
  return <Text style={{ color: colors.danger, lineHeight: 20, marginBottom: 8 }}>{message}</Text>
}

export function Muted({ children }: { children: string }) {
  const { colors } = useTheme()
  return <Text style={{ color: colors.muted, lineHeight: 21 }}>{children}</Text>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 36 },
  titleBlock: { marginBottom: 14 },
  h1: { fontSize: 26, fontWeight: '800' },
  h2: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  subtitle: { marginTop: 6, lineHeight: 21 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  button: { minHeight: 48, borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  field: { marginBottom: 10 },
  label: { fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, textAlignVertical: 'top' },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8, marginBottom: 8 },
  banner: { borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 12 },
  loading: { padding: 24, alignItems: 'center' },
})
