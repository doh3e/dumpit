import { useContext } from 'react'
import { AuthContext } from '../context/authState'

export function useAuth() {
  return useContext(AuthContext)
}
