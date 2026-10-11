import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/** Web has no hardware-backed secure store. Tokens there stay in AsyncStorage and the UI says so. */
export const tokenStorageKind = Platform.OS === 'web' ? 'web-async-storage' : 'secure-store'

export async function setSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(`secure:${key}`, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

export async function getSecret(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(`secure:${key}`)
  return SecureStore.getItemAsync(key)
}

export async function deleteSecret(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(`secure:${key}`)
    return
  }
  await SecureStore.deleteItemAsync(key)
}
