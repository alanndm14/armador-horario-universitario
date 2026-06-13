import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import sampleCourses from '../data/sampleCourses.json'
import { db, isFirebaseConfigured } from './firebase.js'

function withLocation(courses = []) {
  return courses.map((course) => ({
    faculty: course.faculty ?? 'Facultad de Ciencias',
    campus: course.campus ?? 'Ciudad Universitaria',
    ...course,
  }))
}

export async function getCourses() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/courses.json`, { cache: 'no-store' })
    if (response.ok) {
      const payload = await response.json()
      const courses = Array.isArray(payload) ? payload : payload.courses
      if (courses?.length > 0) return withLocation(courses)
    }
  } catch (error) {
    console.warn('No se pudo leer el catalogo automatico.', error)
  }

  if (!isFirebaseConfigured || !db) return withLocation(sampleCourses)

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

    return withLocation(courses.length > 0 ? courses : sampleCourses)
  } catch (error) {
    console.warn('No se pudo leer Firestore; usando demo local.', error)
    return withLocation(sampleCourses)
  }
}
