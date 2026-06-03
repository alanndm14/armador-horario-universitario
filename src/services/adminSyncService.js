import { httpsCallable } from 'firebase/functions'
import { functions, isFirebaseConfigured } from './firebase.js'

export async function syncFcienciasSchedules(options = {}) {
  if (!isFirebaseConfigured || !functions) {
    throw new Error('Firebase no está configurado. Agrega tus variables VITE_FIREBASE_* para sincronizar datos reales.')
  }
  const callable = httpsCallable(functions, 'syncFcienciasSchedules')
  const result = await callable(options)
  return result.data
}
