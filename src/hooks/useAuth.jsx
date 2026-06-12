/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase.js'

const AuthContext = createContext(null)

const demoUser = {
  uid: 'demo-user',
  displayName: 'Modo demo',
  email: 'demo@local',
  photoURL: null,
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(isFirebaseConfigured ? null : demoUser)
  const [loading, setLoading] = useState(isFirebaseConfigured)

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return undefined
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isDemo: !isFirebaseConfigured,
      login: async () => {
        if (!auth) return setUser(demoUser)
        if (window.matchMedia('(max-width: 767px)').matches) return signInWithRedirect(auth, googleProvider)
        await signInWithPopup(auth, googleProvider)
      },
      logout: async () => {
        if (!auth) return setUser(demoUser)
        await signOut(auth)
      },
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
