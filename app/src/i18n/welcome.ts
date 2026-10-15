/** Welcome and setup copy: country names, scene descriptions, toggles and life stages. */
export const welcomeCopy = {
  en: {
    countries: { US: "United States", MX: "Mexico", KE: "Kenya" },
    scenes: {
      US: "Statue of Liberty and the New York skyline",
      MX: "Mexican colonial architecture, blue tiled domes and palm trees",
      KE: "Kenyan savannah, acacia trees and Mount Kenya at sunrise",
    },
    access: {
      readAloud: "Read aloud",
      simple: "Simple mode",
      large: "Larger text",
    },
    stages: {
      student: "Student",
      firstJob: "First job",
      parent: "Parent",
      retired: "Retired",
    },
  },
  es: {
    countries: { US: "Estados Unidos", MX: "México", KE: "Kenia" },
    scenes: {
      US: "La Estatua de la Libertad y el horizonte de Nueva York",
      MX: "Arquitectura colonial mexicana, cúpulas de azulejos azules y palmeras",
      KE: "La sabana de Kenia, acacias y el monte Kenia al amanecer",
    },
    access: {
      readAloud: "Leer en voz alta",
      simple: "Modo sencillo",
      large: "Texto más grande",
    },
    stages: {
      student: "Estudiante",
      firstJob: "Primer empleo",
      parent: "Madre o padre",
      retired: "Jubilado",
    },
  },
  sw: {
    countries: { US: "Marekani", MX: "Meksiko", KE: "Kenya" },
    scenes: {
      US: "Sanamu ya Uhuru na majengo marefu ya New York",
      MX: "Majengo ya kikoloni ya Meksiko, kuba za vigae vya buluu na mitende",
      KE: "Mbuga ya Kenya, miti ya mishita na Mlima Kenya wakati wa macheo",
    },
    access: {
      readAloud: "Soma kwa sauti",
      simple: "Hali rahisi",
      large: "Maandishi makubwa",
    },
    stages: {
      student: "Mwanafunzi",
      firstJob: "Kazi ya kwanza",
      parent: "Mzazi",
      retired: "Mstaafu",
    },
  },
} as const;
