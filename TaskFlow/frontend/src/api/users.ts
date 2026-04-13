import client from './client'
import type { User } from '../types'

export const getUsers = () =>
  client.get<{ users: User[] }>('/users').then((r) => r.data.users)
