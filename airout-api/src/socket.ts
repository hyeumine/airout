import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { env } from './config/env'

export function createSocket(server: HttpServer): Server {
  const io = new Server(server, { cors: { origin: true } })
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (typeof token !== 'string') return next(new Error('unauthorized'))
    try {
      const payload = jwt.verify(token, env.jwt.accessSecret) as jwt.JwtPayload
      if (payload.type !== 'access' || typeof payload.sub !== 'string') return next(new Error('unauthorized'))
      socket.data.userId = payload.sub
      return next()
    } catch {
      return next(new Error('unauthorized'))
    }
  })
  io.on('connection', (socket) => {
    socket.join('feed')
    socket.on('circle:join', (circleId: unknown) => {
      if (typeof circleId === 'string' && /^[0-9a-f-]{36}$/i.test(circleId)) {
        socket.join(`circle:${circleId}`)
      }
    })
  })
  return io
}
