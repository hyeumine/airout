export interface Palette {
  bg: string
  surface: string
  surfaceMuted: string
  primary: string
  onPrimary: string
  primarySoft: string
  ink: string
  muted: string
  border: string
  blue: string
  warm: string
  danger: string
  ok: string
}

export const lightColors: Palette = {
  bg: '#F6F3FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EDF8',
  primary: '#5B4DC7',
  onPrimary: '#FFFFFF',
  primarySoft: '#E6E1FA',
  ink: '#241F33',
  muted: '#5E5872',
  border: '#E4DDF3',
  blue: '#3D7EA6',
  warm: '#F8F1E8',
  danger: '#9C3B4A',
  ok: '#2F7D5A',
}

export const darkColors: Palette = {
  bg: '#161226',
  surface: '#241E38',
  surfaceMuted: '#2E2748',
  primary: '#D4C9FF',
  onPrimary: '#241F33',
  primarySoft: '#3A3260',
  ink: '#F6F3FB',
  muted: '#D5CEE6',
  border: '#3C3458',
  blue: '#A9D4EA',
  warm: '#3A332C',
  danger: '#FFB3BE',
  ok: '#9DDEC0',
}
