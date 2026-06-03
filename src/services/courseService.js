import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import sampleCourses from '../data/sampleCourses.json'
import { db, isFirebaseConfigured } from './firebase.js'

export async function getCourses() {
  if (!isFirebaseConfigured || !db) return sampleCourses

  try {
    const coursesRef = collection(db, 'courses')
    const snapshot = await getDocs(query(coursesRef, where('isActive', '==', true), orderBy('name')))
    const courses = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        const groupsRef = collection(db, 'courses', docSnapshot.id, 'groups')
        const groupsSnapshot = await getDocs(groupsRef)
        const groups = groupsSnapshot.docs
          .map((groupDoc) => ({ id: groupDoc.id, ...groupDoc.data() }))
          .sort((a, b) => String(a.groupNumber).localeCompare(String(b.groupNumber), 'es', { numeric: true }))
        return {
          id: docSnapshot.id,
          ...docSnapshot.data(),
          groups,
        }
      }),
    )

    return courses.length > 0 ? courses : sampleCourses
  } catch (error) {
    console.warn('No se pudo leer Firestore; usando demo local.', error)
    return sampleCourses
  }
}
