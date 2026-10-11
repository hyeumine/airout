export const sessionBridge = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  persist: async (_access: string | null, _refresh: string | null) => {},
}
