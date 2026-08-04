import { Workout } from "../types/workout";

/**
 * A fixed, always-available workout used only when the app has never
 * successfully reached the backend (first launch, no connectivity, no cached
 * workout for today). Ensures the user always has something to train with.
 */
export function buildEmergencyWorkout(date: string): Workout {
  return {
    date,
    source: "local",
    exercises: [
      {
        slug: "jumping-jacks",
        name: "Jumping jacks",
        category: "cardio",
        summary: "Sauts écartés bras/jambes pour monter le rythme cardiaque.",
        description:
          "Debout, pieds joints, bras le long du corps. Sautez en écartant les jambes largeur bassin " +
          "tout en levant les bras au-dessus de la tête, puis revenez en position de départ. Gardez le " +
          "tronc gainé et atterrissez en souplesse.",
        workSeconds: 45,
        restSeconds: 15,
      },
      {
        slug: "push-ups",
        name: "Pompes",
        category: "strength_upper",
        summary: "Pompes classiques pour pectoraux, épaules et triceps.",
        description:
          "Mains légèrement plus larges que les épaules, corps aligné des talons à la tête. Descendez en " +
          "pliant les coudes à environ 45° du corps jusqu'à frôler le sol, puis repoussez pour remonter. " +
          "Genoux au sol si besoin.",
        workSeconds: 45,
        restSeconds: 15,
      },
      {
        slug: "high-knees",
        name: "Montées de genoux",
        category: "cardio",
        summary: "Course sur place en montant les genoux à hauteur de hanche.",
        description:
          "Sur place, courez en montant alternativement chaque genou le plus haut possible. Utilisez les " +
          "bras en balancier comme en course, restez sur la pointe des pieds.",
        workSeconds: 45,
        restSeconds: 15,
      },
      {
        slug: "plank",
        name: "Gainage planche",
        category: "strength_upper",
        summary: "Planche statique pour la sangle abdominale et le dos.",
        description:
          "Appui sur les avant-bras et les pointes de pieds, corps parfaitement aligné tête-bassin-talons. " +
          "Contractez abdominaux et fessiers, ne laissez ni le bassin tomber ni les fesses monter.",
        workSeconds: 45,
        restSeconds: 15,
      },
      {
        slug: "boxing-jab-cross",
        name: "Jab-cross en shadow boxing",
        category: "martial_arts",
        discipline: "boxing",
        summary: "Combo de base boxe anglaise, sans partenaire.",
        description:
          "Garde haute, mains devant le visage. Enchaînez jab (main avant) puis cross (main arrière) en " +
          "pivotant légèrement les hanches à chaque coup, et revenez en garde entre chaque frappe.",
        workSeconds: 45,
        restSeconds: 15,
      },
      {
        slug: "mountain-climbers",
        name: "Mountain climbers",
        category: "cardio",
        summary: "Position de planche, genoux ramenés rapidement vers la poitrine.",
        description:
          "En position de planche haute, ramenez rapidement un genou vers la poitrine puis reculez-le en " +
          "alternant avec l'autre jambe, comme si vous couriez à l'horizontale. Gardez le bassin bas.",
        workSeconds: 45,
        restSeconds: 15,
      },
      {
        slug: "bicycle-crunches",
        name: "Crunchs vélo",
        category: "strength_upper",
        summary: "Rotation du buste coude/genou opposé, focus obliques.",
        description:
          "Allongé sur le dos, mains derrière la tête, jambes en l'air genoux pliés. Amenez le coude droit " +
          "vers le genou gauche en tendant l'autre jambe, puis alternez comme si vous pédaliez.",
        workSeconds: 45,
        restSeconds: 15,
      },
      {
        slug: "krav-maga-palm-strike",
        name: "Frappe de paume (Krav Maga)",
        category: "martial_arts",
        discipline: "krav_maga",
        summary: "Frappe de paume directe, autodéfense.",
        description:
          "Garde défensive proche du corps, mains ouvertes devant le visage. Projetez une paume vers " +
          "l'avant en extension complète du bras, en poussant sur la jambe arrière, puis revenez en garde.",
        workSeconds: 45,
        restSeconds: 15,
      },
      {
        slug: "standing-hamstring-stretch",
        name: "Étirement debout des ischio-jambiers",
        category: "stretch",
        summary: "Étirement de l'arrière de cuisse en position debout.",
        description:
          "Debout, avancez une jambe tendue talon au sol, genou arrière légèrement plié. Penchez le buste " +
          "vers l'avant à partir des hanches, dos droit, jusqu'à sentir l'étirement derrière la cuisse.",
        workSeconds: 45,
        restSeconds: 15,
      },
      {
        slug: "childs-pose",
        name: "Posture de l'enfant",
        category: "stretch",
        summary: "Détente du bas du dos et des hanches.",
        description:
          "À genoux, asseyez-vous sur les talons puis penchez le buste vers l'avant en tendant les bras " +
          "devant vous, front au sol. Laissez le bas du dos s'allonger et respirez profondément.",
        workSeconds: 45,
        restSeconds: 15,
      },
    ],
  };
}
