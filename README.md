# Armador de horario universitario

App web para armar horarios universitarios con React, Vite, Tailwind CSS, Firebase Auth, Firestore y Firebase Functions.

La app no está pensada para que captures materias manualmente. Los datos reales se sincronizan desde fuentes públicas de la Facultad de Ciencias UNAM mediante la Function `syncFcienciasSchedules`, que lee el JSON oficial embebido en páginas como:

- `https://www.fciencias.unam.mx/docencia/horarios/indice`
- `https://www.fciencias.unam.mx/docencia/horarios/20261/1556/7`

## Ejecutar en local

```bash
npm install
npm run dev
```

Si no hay variables de Firebase, la app entra en modo demo con `src/data/sampleCourses.json`. Ese archivo solo sirve para probar la interfaz cuando Firestore está vacío.

## Configurar Firebase

1. Crea un proyecto en Firebase.
2. Activa Google Auth.
3. Crea Firestore.
4. Copia `.env.example` a `.env.local` y llena las variables `VITE_FIREBASE_*`.
5. Copia `.firebaserc.example` a `.firebaserc` y cambia el id del proyecto.
6. Despliega reglas:

```bash
firebase deploy --only firestore:rules
```

## Definir administradores

La sincronización está protegida. Agrega manualmente el primer documento admin desde la consola de Firebase:

```text
admins/{UID_DE_GOOGLE}
```

Puede estar vacío o tener campos como `email` y `createdAt`.

## Functions

```bash
cd functions
npm install
npm run lint
firebase deploy --only functions
```

La Function callable `syncFcienciasSchedules`:

- verifica `admins/{uid}`;
- descubre URLs públicas de horarios;
- lee el JSON `drupal-settings-json`;
- normaliza materias, grupos, profesorado, ayudantes, horarios, aulas, cupos y alumnos;
- guarda/upsert en `courses/{courseId}/groups/{groupId}`;
- registra cada corrida en `syncRuns`.

## Deploy en GitHub Pages

La app está configurada con `base: '/armador-horario-universitario/'`.

No habrá link público hasta que esta carpeta esté subida a un repositorio de GitHub y GitHub Pages esté activado. Si el repo se llama `armador-horario-universitario`, el link tendrá esta forma:

```text
https://TU_USUARIO.github.io/armador-horario-universitario/
```

El workflow `.github/workflows/pages.yml` publica automáticamente la carpeta `dist` cuando haces push a `main`.

```bash
npm run deploy
```

También puedes usar GitHub Pages apuntando a la carpeta `dist` generada por:

```bash
npm run build
```

## Calidad

```bash
npm run test
npm run build
```

## Estructura

```text
src/
  components/
    layout/
    schedule/
    courses/
    filters/
    modals/
    admin/
    ui/
  hooks/
  services/
  utils/
  data/
  pages/
functions/
firestore.rules
firebase.json
```
