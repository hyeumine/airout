declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: 'user' | 'moderator' | 'admin'
      userStatus?: 'active' | 'suspended'
    }
  }
}

export {}
