import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase.js'

const LOCAL_KEY = 'armador-horario-demo'

export async function listSchedules(uid) {
  if (!isFirebaseConfigured || !db || !uid) {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
  }
  const schedulesRef = collection(db, 'users', uid, 'schedules')
  const snapshot = await getDocs(query(schedulesRef, orderBy('updatedAt', 'desc')))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function saveSchedule(uid, payload) {
  if (!isFirebaseConfigured || !db || !uid) {
    const current = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
    const saved = { id: payload.id ?? crypto.randomUUID(), ...payload, updatedAt: new Date().toISOString() }
    localStorage.setItem(LOCAL_KEY, JSON.stringify([saved, ...current.filter((item) => item.id !== saved.id)]))
    return saved.id
  }

  if (payload.id) {
    await updateDoc(doc(db, 'users', uid, 'schedules', payload.id), {
      ...payload,
      updatedAt: serverTimestamp(),
    })
    return payload.id
  }

  const result = await addDoc(collection(db, 'users', uid, 'schedules'), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return result.id
}

export async function removeSchedule(uid, scheduleId) {
  if (!isFirebaseConfigured || !db || !uid) return
  await deleteDoc(doc(db, 'users', uid, 'schedules', scheduleId))
}
