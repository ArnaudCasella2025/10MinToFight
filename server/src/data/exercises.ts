export type Category = "cardio" | "strength_upper" | "stretch" | "martial_arts";

export type Discipline = "boxing" | "muay_thai" | "kung_fu" | "krav_maga" | "bjj";

export interface Exercise {
  slug: string;
  name: string;
  category: Category;
  discipline?: Discipline;
  /** Short one-line summary, used in lists. */
  summary: string;
  /** Step-by-step "how to do it well" instructions. */
  description: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  cardio: "Cardio",
  strength_upper: "Musculation (haut du corps)",
  stretch: "Étirements",
  martial_arts: "Arts martiaux",
};

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  boxing: "Boxe",
  muay_thai: "Muay Thaï",
  kung_fu: "Kung Fu",
  krav_maga: "Krav Maga",
  bjj: "Jujitsu Brésilien",
};

/**
 * How many exercises of each category must appear in every generated workout.
 * Sum must equal WORKOUT_SIZE (10).
 */
export const CATEGORY_QUOTA: Record<Category, number> = {
  cardio: 3,
  strength_upper: 3,
  stretch: 2,
  martial_arts: 2,
};

export const WORKOUT_SIZE = 10;
export const WORK_SECONDS = 45;
export const REST_SECONDS = 15;

export const EXERCISES: Exercise[] = [
  // ---------------------------------------------------------------------
  // CARDIO
  // ---------------------------------------------------------------------
  {
    slug: "jumping-jacks",
    name: "Jumping jacks",
    category: "cardio",
    summary: "Sauts écartés bras/jambes pour monter le rythme cardiaque.",
    description:
      "Debout, pieds joints, bras le long du corps. Sautez en écartant les jambes largeur bassin " +
      "tout en levant les bras au-dessus de la tête, puis revenez en position de départ en un seul " +
      "mouvement fluide. Gardez le tronc gainé et atterrissez en souplesse sur l'avant du pied.",
  },
  {
    slug: "high-knees",
    name: "Montées de genoux",
    category: "cardio",
    summary: "Course sur place en montant les genoux à hauteur de hanche.",
    description:
      "Sur place, courez en montant alternativement chaque genou le plus haut possible (hauteur des " +
      "hanches). Utilisez les bras en balancier comme en course. Restez sur la pointe des pieds et " +
      "gardez le dos droit, le regard devant vous.",
  },
  {
    slug: "butt-kicks",
    name: "Talons-fesses",
    category: "cardio",
    summary: "Course sur place en amenant les talons vers les fesses.",
    description:
      "Sur place, courez en pliant les genoux pour amener rapidement chaque talon vers vos fessiers. " +
      "Gardez le buste vertical et les hanches stables, les bras suivent le rythme naturellement.",
  },
  {
    slug: "mountain-climbers",
    name: "Mountain climbers",
    category: "cardio",
    summary: "Position de planche, genoux ramenés rapidement vers la poitrine.",
    description:
      "En position de planche haute (mains sous les épaules), ramenez rapidement un genou vers la " +
      "poitrine puis reculez-le en alternant avec l'autre jambe, comme si vous couriez à l'horizontale. " +
      "Gardez le bassin bas et les hanches stables, sans les faire remonter.",
  },
  {
    slug: "squat-jumps",
    name: "Squats sautés",
    category: "cardio",
    summary: "Squat suivi d'un saut vertical explosif.",
    description:
      "Descendez en squat, cuisses parallèles au sol, poids sur les talons. Explosez vers le haut en " +
      "sautant, bras vers le ciel, puis réceptionnez-vous en souplesse directement en position de squat " +
      "pour enchaîner la répétition suivante.",
  },
  {
    slug: "skater-jumps",
    name: "Skaters",
    category: "cardio",
    summary: "Sauts latéraux façon patineur pour le cardio et les appuis.",
    description:
      "Sautez latéralement d'une jambe sur l'autre comme un patineur de vitesse, en faisant passer la " +
      "jambe libre derrière l'appui pour l'équilibre. Touchez le sol de la main opposée si possible " +
      "pour accentuer la rotation du buste.",
  },
  {
    slug: "star-jumps",
    name: "Star jumps",
    category: "cardio",
    summary: "Saut accroupi qui s'ouvre en étoile en l'air.",
    description:
      "Partez accroupi, mains proches du sol. Sautez en écartant bras et jambes en étoile au sommet du " +
      "saut, puis revenez en position accroupie à la réception. Amortissez avec les genoux souples.",
  },
  {
    slug: "speed-rope-imaginary",
    name: "Corde à sauter imaginaire",
    category: "cardio",
    summary: "Simulation de corde à sauter, rapide et léger.",
    description:
      "Sans corde, sautez légèrement sur place en faisant tourner les poignets comme si vous teniez une " +
      "corde à sauter. Petits sauts rapides, appuis sur l'avant du pied, coudes proches du corps.",
  },
  {
    slug: "burpees",
    name: "Burpees",
    category: "cardio",
    summary: "Enchaînement complet squat / planche / pompe / saut.",
    description:
      "Depuis debout, posez les mains au sol, sautez les pieds en arrière pour une position de planche, " +
      "faites une pompe (optionnelle), ramenez les pieds vers les mains puis sautez verticalement bras " +
      "tendus au-dessus de la tête. Enchaînez le mouvement sans temps de pause.",
  },
  {
    slug: "lateral-shuffle",
    name: "Déplacements latéraux",
    category: "cardio",
    summary: "Pas chassés rapides en position basse.",
    description:
      "En position semi-fléchie, genoux souples, déplacez-vous rapidement de gauche à droite par petits " +
      "pas chassés sur environ 2 mètres, sans croiser les jambes. Gardez le buste bas et le regard droit.",
  },

  // ---------------------------------------------------------------------
  // STRENGTH — UPPER BODY / CORE (bras, dos, ventre)
  // ---------------------------------------------------------------------
  {
    slug: "push-ups",
    name: "Pompes",
    category: "strength_upper",
    summary: "Pompes classiques pour pectoraux, épaules et triceps.",
    description:
      "Mains légèrement plus larges que les épaules, corps aligné des talons à la tête, gainage actif. " +
      "Descendez en pliant les coudes à environ 45° du corps jusqu'à frôler le sol, puis repoussez le sol " +
      "pour remonter. Genoux au sol si besoin pour une version plus accessible.",
  },
  {
    slug: "diamond-push-ups",
    name: "Pompes diamant",
    category: "strength_upper",
    summary: "Pompes mains rapprochées, focus triceps.",
    description:
      "Placez les mains sous la poitrine, pouces et index formant un losange. Descendez lentement en " +
      "gardant les coudes proches du corps, puis repoussez. Gardez le bassin gainé pour ne pas cambrer.",
  },
  {
    slug: "pike-push-ups",
    name: "Pompes piquées",
    category: "strength_upper",
    summary: "Pompes en V inversé, focus épaules.",
    description:
      "Fessiers en l'air, corps en V inversé, mains au sol écartées largeur épaules. Pliez les coudes pour " +
      "amener le sommet du crâne vers le sol entre les mains, puis repoussez pour remonter. Jambes tendues " +
      "autant que possible.",
  },
  {
    slug: "plank",
    name: "Gainage planche",
    category: "strength_upper",
    summary: "Planche statique pour la sangle abdominale et le dos.",
    description:
      "Appui sur les avant-bras et les pointes de pieds, corps parfaitement aligné tête-bassin-talons. " +
      "Contractez abdominaux et fessiers, ne laissez ni le bassin tomber ni les fesses monter. Respirez " +
      "calmement.",
  },
  {
    slug: "side-plank",
    name: "Gainage latéral",
    category: "strength_upper",
    summary: "Planche sur le côté pour les obliques.",
    description:
      "Allongé sur le côté, appui sur un avant-bras aligné sous l'épaule, corps en ligne droite des pieds à " +
      "la tête. Soulevez le bassin pour former une ligne droite et maintenez, hanche haute. Alternez les " +
      "côtés à mi-parcours si l'exercice revient plusieurs fois.",
  },
  {
    slug: "plank-shoulder-taps",
    name: "Touches d'épaule en planche",
    category: "strength_upper",
    summary: "Planche haute avec touches d'épaule alternées.",
    description:
      "En planche haute (mains sous les épaules), touchez l'épaule opposée avec une main en alternant, " +
      "sans faire bouger le bassin ni tourner les hanches. Écartez légèrement les pieds pour plus de " +
      "stabilité.",
  },
  {
    slug: "superman",
    name: "Superman",
    category: "strength_upper",
    summary: "Extension dorsale au sol pour le bas et le haut du dos.",
    description:
      "Allongé sur le ventre, bras tendus devant vous. Soulevez simultanément bras, poitrine et jambes du " +
      "sol en contractant le bas du dos et les fessiers, maintenez une seconde en haut, puis redescendez " +
      "avec contrôle.",
  },
  {
    slug: "bear-crawl-hold",
    name: "Bear crawl (maintien)",
    category: "strength_upper",
    summary: "Position quadrupédie genoux décollés, gainage global.",
    description:
      "À quatre pattes, décollez les genoux de 2-3 cm du sol en gardant le dos plat et les hanches basses. " +
      "Maintenez la position ou déplacez-vous lentement en avant/arrière en gardant le dos stable.",
  },
  {
    slug: "bicycle-crunches",
    name: "Crunchs vélo",
    category: "strength_upper",
    summary: "Rotation du buste coude/genou opposé, focus obliques.",
    description:
      "Allongé sur le dos, mains derrière la tête, jambes en l'air genoux pliés. Amenez le coude droit vers " +
      "le genou gauche en tendant l'autre jambe, puis alternez comme si vous pédaliez. Ne tirez pas sur la " +
      "nuque.",
  },
  {
    slug: "russian-twists",
    name: "Russian twists",
    category: "strength_upper",
    summary: "Rotations du buste assis, focus obliques.",
    description:
      "Assis, buste légèrement incliné en arrière, pieds décollés du sol si possible. Mains jointes devant " +
      "vous, tournez le buste pour toucher le sol de chaque côté alternativement, en gardant le dos droit.",
  },
  {
    slug: "v-ups",
    name: "V-ups",
    category: "strength_upper",
    summary: "Pliage jambes/buste en V, abdominaux complets.",
    description:
      "Allongé sur le dos, bras tendus derrière la tête. Levez simultanément les jambes tendues et le buste " +
      "pour venir toucher les pieds avec les mains, corps en V, puis redescendez avec contrôle sans que le " +
      "bas du dos ne claque au sol.",
  },
  {
    slug: "reverse-snow-angels",
    name: "Anges au sol inversés",
    category: "strength_upper",
    summary: "Renforcement du haut du dos et des épaules.",
    description:
      "Allongé sur le ventre, bras tendus le long du corps, paumes vers le sol. Décollez légèrement la " +
      "poitrine et levez les bras en arc de cercle vers l'avant puis ramenez-les vers les hanches, comme un " +
      "ange au sol, en serrant les omoplates.",
  },
  {
    slug: "inchworm",
    name: "Inchworm",
    category: "strength_upper",
    summary: "Marche des mains vers la planche, gainage et mobilité.",
    description:
      "Debout, pliez le buste pour poser les mains au sol, puis marchez avec les mains vers l'avant jusqu'à " +
      "une position de planche haute. Marquez un temps gainé, puis remontez en marchant les pieds vers les " +
      "mains, jambes aussi tendues que possible.",
  },

  // ---------------------------------------------------------------------
  // STRETCH — LEGS & LOWER BACK
  // ---------------------------------------------------------------------
  {
    slug: "standing-hamstring-stretch",
    name: "Étirement debout des ischio-jambiers",
    category: "stretch",
    summary: "Étirement de l'arrière de cuisse en position debout.",
    description:
      "Debout, avancez une jambe tendue talon au sol, genou arrière légèrement plié. Penchez le buste vers " +
      "l'avant à partir des hanches, dos droit, jusqu'à sentir l'étirement derrière la cuisse avant. " +
      "Maintenez sans forcer puis changez de côté.",
  },
  {
    slug: "seated-forward-fold",
    name: "Flexion assise vers l'avant",
    category: "stretch",
    summary: "Étirement global de la chaîne postérieure.",
    description:
      "Assis, jambes tendues devant vous, inspirez pour grandir le dos, puis expirez en basculant le buste " +
      "vers l'avant à partir des hanches en gardant le dos long. Laissez les mains glisser vers les pieds " +
      "sans forcer le bas du dos.",
  },
  {
    slug: "butterfly-stretch",
    name: "Étirement papillon",
    category: "stretch",
    summary: "Ouverture des hanches et de l'intérieur des cuisses.",
    description:
      "Assis, plantes de pieds jointes devant vous, genoux ouverts vers l'extérieur. Tenez vos pieds et " +
      "appuyez doucement les genoux vers le sol avec les coudes, dos droit, en respirant profondément.",
  },
  {
    slug: "childs-pose",
    name: "Posture de l'enfant",
    category: "stretch",
    summary: "Détente du bas du dos et des hanches.",
    description:
      "À genoux, asseyez-vous sur les talons puis penchez le buste vers l'avant en tendant les bras devant " +
      "vous, front au sol. Laissez le bas du dos s'allonger et respirez profondément dans le dos.",
  },
  {
    slug: "cat-cow",
    name: "Chat-vache",
    category: "stretch",
    summary: "Mobilisation douce de toute la colonne vertébrale.",
    description:
      "À quatre pattes, alternez entre creuser le dos en regardant vers le haut (vache) et arrondir le dos " +
      "en rentrant le menton (chat), au rythme de la respiration, mouvement lent et contrôlé.",
  },
  {
    slug: "downward-dog",
    name: "Chien tête en bas",
    category: "stretch",
    summary: "Étirement des ischio-jambiers, mollets et dos.",
    description:
      "Depuis la planche, poussez les hanches vers le haut et l'arrière pour former un V inversé, talons " +
      "cherchant le sol, bras et dos alignés. Pédalez doucement les jambes pour approfondir l'étirement des " +
      "mollets.",
  },
  {
    slug: "hip-flexor-lunge-stretch",
    name: "Étirement fente des fléchisseurs de hanche",
    category: "stretch",
    summary: "Ouverture de l'avant de hanche en fente basse.",
    description:
      "En fente basse, genou arrière au sol, poussez légèrement le bassin vers l'avant en gardant le buste " +
      "droit jusqu'à sentir l'étirement à l'avant de la hanche arrière. Maintenez puis changez de côté.",
  },
  {
    slug: "quad-stretch",
    name: "Étirement des quadriceps",
    category: "stretch",
    summary: "Étirement de l'avant de cuisse en équilibre.",
    description:
      "Debout, attrapez une cheville derrière vous et ramenez le talon vers la fesse, genoux serrés l'un " +
      "contre l'autre, bassin légèrement basculé vers l'avant. Gardez l'équilibre en fixant un point devant " +
      "vous, puis changez de jambe.",
  },
  {
    slug: "figure-four-glute-stretch",
    name: "Étirement fessier (figure 4)",
    category: "stretch",
    summary: "Étirement profond du fessier allongé.",
    description:
      "Allongé sur le dos, croisez une cheville sur le genou opposé en formant un 4. Attrapez l'arrière de " +
      "la cuisse restée au sol et tirez doucement vers la poitrine jusqu'à sentir l'étirement dans le " +
      "fessier de la jambe croisée.",
  },
  {
    slug: "cobra-stretch",
    name: "Étirement cobra",
    category: "stretch",
    summary: "Extension douce du bas du dos et des abdominaux.",
    description:
      "Allongé sur le ventre, mains sous les épaules, poussez doucement le buste vers le haut en gardant le " +
      "bassin au sol et les épaules basses, loin des oreilles. Ne forcez jamais dans une douleur vive au " +
      "bas du dos.",
  },
  {
    slug: "knee-to-chest-stretch",
    name: "Genou vers la poitrine",
    category: "stretch",
    summary: "Décompression douce du bas du dos.",
    description:
      "Allongé sur le dos, ramenez un genou vers la poitrine en le tenant avec les deux mains, l'autre " +
      "jambe reste tendue ou pliée au sol. Maintenez, respirez profondément, puis changez de jambe.",
  },
  {
    slug: "worlds-greatest-stretch",
    name: "World's greatest stretch",
    category: "stretch",
    summary: "Enchaînement mobilité hanches, ischios et dos.",
    description:
      "En fente avant basse, posez les deux mains au sol de part et d'autre du pied avant, puis ouvrez le " +
      "buste et levez un bras vers le plafond en pivotant le regard vers la main. Revenez au centre, tendez " +
      "la jambe avant pour étirer l'arrière de cuisse, puis changez de côté.",
  },

  // ---------------------------------------------------------------------
  // MARTIAL ARTS — technique drills, no equipment, shadow style
  // ---------------------------------------------------------------------

  // Boxing
  {
    slug: "boxing-jab-cross",
    name: "Jab-cross en shadow boxing",
    category: "martial_arts",
    discipline: "boxing",
    summary: "Combo de base boxe anglaise, sans partenaire.",
    description:
      "Garde haute, mains devant le visage. Enchaînez jab (main avant) puis cross (main arrière) en pivotant " +
      "légèrement les hanches à chaque coup, et revenez systématiquement en garde entre chaque frappe. " +
      "Gardez les appuis légers et mobiles.",
  },
  {
    slug: "boxing-footwork",
    name: "Déplacements de boxe (footwork)",
    category: "martial_arts",
    discipline: "boxing",
    summary: "Jeu de jambes avant/arrière/latéral en garde.",
    description:
      "En garde, déplacez-vous en petits pas glissés vers l'avant, l'arrière puis les côtés sans jamais " +
      "croiser les pieds ni les rapprocher complètement, buste légèrement mobile, menton rentré, prêt à " +
      "frapper à tout moment.",
  },
  {
    slug: "boxing-hook-combo",
    name: "Combo crochets en shadow boxing",
    category: "martial_arts",
    discipline: "boxing",
    summary: "Enchaînement jab-cross-crochet imaginaire.",
    description:
      "Enchaînez jab, cross puis un crochet (hook) avec la main avant en pivotant bien sur l'appui du même " +
      "côté, coude à hauteur d'épaule. Revenez en garde après chaque séquence et variez le rythme.",
  },

  // Muay Thai
  {
    slug: "muay-thai-teep",
    name: "Teep (coup de pied direct) en shadow",
    category: "martial_arts",
    discipline: "muay_thai",
    summary: "Coup de pied poussé direct, technique muay thaï.",
    description:
      "En garde, levez le genou avant puis poussez le pied vers l'avant en extension pour un coup de pied " +
      "direct (teep) imaginaire, comme pour repousser un adversaire, puis ramenez le pied en garde. " +
      "Alternez les jambes.",
  },
  {
    slug: "muay-thai-knee-strikes",
    name: "Coups de genou en shadow",
    category: "martial_arts",
    discipline: "muay_thai",
    summary: "Frappes de genou sur place, technique muay thaï.",
    description:
      "En garde, tirez sur une jambe d'appui légère et montez un genou fort vers le centre (imaginez saisir " +
      "un adversaire par la nuque), hanche qui accompagne le mouvement, puis reposez et alternez de jambe.",
  },
  {
    slug: "muay-thai-elbow-strikes",
    name: "Coups de coude en shadow",
    category: "martial_arts",
    discipline: "muay_thai",
    summary: "Frappes de coude horizontales et descendantes.",
    description:
      "En garde, faites pivoter les hanches et le buste pour lancer un coup de coude horizontal imaginaire, " +
      "coude fléchi à hauteur d'épaule, puis revenez en garde. Alternez les côtés et variez coude horizontal " +
      "/ descendant.",
  },

  // Kung Fu
  {
    slug: "kung-fu-horse-stance",
    name: "Position du cavalier (Ma Bu)",
    category: "martial_arts",
    discipline: "kung_fu",
    summary: "Posture basse traditionnelle pour la force des jambes.",
    description:
      "Pieds bien plus larges que les épaules, pointes légèrement vers l'avant, descendez comme pour vous " +
      "asseoir sur une chaise imaginaire, cuisses proches de l'horizontale, dos droit, poings serrés à la " +
      "taille. Maintenez la position en respirant profondément.",
  },
  {
    slug: "kung-fu-front-kick",
    name: "Coup de pied frontal (Kung Fu)",
    category: "martial_arts",
    discipline: "kung_fu",
    summary: "Coup de pied frontal chambré, technique traditionnelle.",
    description:
      "Depuis une garde haute, montez le genou plié devant vous puis détendez la jambe en frappant vers " +
      "l'avant avec la plante ou le talon du pied, pointe de pied tirée vers vous, puis rechambrez avant de " +
      "reposer le pied. Alternez les jambes avec contrôle.",
  },
  {
    slug: "kung-fu-crane-stance",
    name: "Posture de la grue",
    category: "martial_arts",
    discipline: "kung_fu",
    summary: "Équilibre sur une jambe, garde haute, façon Kung Fu.",
    description:
      "En équilibre sur une jambe, genou opposé levé haut devant vous, bras en garde façon grue (une main " +
      "haute, une main basse), fixez un point immobile pour garder l'équilibre. Maintenez puis changez de " +
      "jambe à mi-temps.",
  },

  // Krav Maga
  {
    slug: "krav-maga-palm-strike",
    name: "Frappe de paume (Krav Maga)",
    category: "martial_arts",
    discipline: "krav_maga",
    summary: "Frappe de paume directe, autodéfense.",
    description:
      "Garde défensive proche du corps, mains ouvertes devant le visage. Projetez une paume vers l'avant en " +
      "extension complète du bras au niveau du visage imaginaire, en poussant sur la jambe arrière, puis " +
      "ramenez immédiatement la main en garde. Alternez les côtés.",
  },
  {
    slug: "krav-maga-defensive-retreat",
    name: "Esquive et retrait défensif",
    category: "martial_arts",
    discipline: "krav_maga",
    summary: "Recul explosif avec garde haute, technique de fuite/défense.",
    description:
      "Depuis une position neutre, reculez rapidement d'un grand pas en montant les mains en garde défensive " +
      "devant le visage et le torse, comme pour créer de la distance face à une menace, puis revenez à la " +
      "position de départ et répétez.",
  },
  {
    slug: "krav-maga-360-defense",
    name: "Défense 360°",
    category: "martial_arts",
    discipline: "krav_maga",
    summary: "Rotation avec bras balayant pour dégager l'espace autour de soi.",
    description:
      "Pieds ancrés au sol, tournez le buste et balayez les deux avant-bras en cercle autour de vous comme " +
      "pour repousser une saisie de tous les côtés, en pivotant complètement sur place, puis répétez dans " +
      "l'autre sens.",
  },

  // Brazilian Jiu-Jitsu (BJJ)
  {
    slug: "bjj-hip-escape",
    name: "Hip escape (shrimping)",
    category: "martial_arts",
    discipline: "bjj",
    summary: "Déplacement de hanche au sol, base de la garde en BJJ.",
    description:
      "Allongé sur le dos, genoux pliés. Poussez sur un pied et une épaule pour faire glisser les hanches en " +
      "arrière en diagonale, comme pour fuir un adversaire au sol, en gardant les mains proches du visage. " +
      "Alternez de côté en rythme.",
  },
  {
    slug: "bjj-bridge-upa",
    name: "Pont (Upa)",
    category: "martial_arts",
    discipline: "bjj",
    summary: "Pont explosif au sol pour renverser un adversaire imaginaire.",
    description:
      "Allongé sur le dos, pieds proches des fessiers. Poussez fort sur les pieds et une épaule pour " +
      "soulever les hanches très haut vers le plafond en pontant sur l'épaule opposée, puis redescendez avec " +
      "contrôle. Alternez le côté du pont.",
  },
  {
    slug: "bjj-technical-stand-up",
    name: "Relevé technique",
    category: "martial_arts",
    discipline: "bjj",
    summary: "Se relever du sol en gardant une garde défensive, base BJJ.",
    description:
      "Assis au sol, une main posée derrière vous, pied opposé posé à plat près du bassin. Poussez pour vous " +
      "relever en gardant l'autre main en garde devant le visage, jambe arrière repliée prête à se déployer, " +
      "puis revenez au sol avec contrôle et alternez le côté.",
  },
];

export function getExerciseBySlug(slug: string): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.slug === slug);
}

export function getExercisesByCategory(category: Category): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.category === category);
}
