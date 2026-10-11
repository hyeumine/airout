import { Op } from 'sequelize'
import { UserProfile } from '../models'
import { AppError } from '../lib/errors'

const ADJECTIVES = ['Quiet', 'Gentle', 'Kind', 'Brave', 'Soft', 'Warm', 'Calm', 'Hopeful', 'Steady', 'Bright']
const NOUNS = ['Sunrise', 'Harbor', 'Willow', 'Meadow', 'Lantern', 'River', 'Sparrow', 'Cedar', 'Horizon', 'Nest']

const RESERVED = /admin|moderator|official|support team|airout|system/i

export function assertDisplayName(name: string): void {
  if (RESERVED.test(name)) {
    throw new AppError(400, 'VALIDATION', 'Choose a personal nickname. Titles like admin or official are reserved.')
  }
}

export async function uniqueDisplayName(requested?: string): Promise<string> {
  if (requested) {
    assertDisplayName(requested)
    const existing = await UserProfile.findOne({ where: { displayName: requested } })
    if (existing) throw new AppError(409, 'CONFLICT', 'That community name is already in use. Try another nickname.')
    return requested
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `${ADJECTIVES[attempt % ADJECTIVES.length]} ${NOUNS[(attempt * 3) % NOUNS.length]}`
    const existing = await UserProfile.findOne({ where: { displayName: { [Op.eq]: candidate } } })
    if (!existing) return candidate
  }
  return `Kind Stranger ${Math.floor(Math.random() * 900 + 100)}`
}
