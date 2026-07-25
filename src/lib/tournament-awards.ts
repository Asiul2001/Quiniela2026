export type ClosingPrize = {
  title: string;
  definition: string;
  detail: string;
};

type PrizeTemplate = {
  title: string;
  definition: string;
  detail: (rank: number, totalPlayers: number) => string;
};

const POSITION_PRIZES: PrizeTemplate[] = [
  {
    title: "Leyenda total de la quiniela",
    definition: "Se entrega a quien termina en el primer puesto y cierra el torneo con la tabla a sus pies.",
    detail: (rank, totalPlayers) =>
      `Cerraste en #${rank} de ${totalPlayers} y fuiste la referencia absoluta de puntos durante todo el torneo.`,
  },
  {
    title: "Especialista en quedarte a nada",
    definition: "Premia la persecucion mas seria al titulo sin haber soltado la pelea hasta el final.",
    detail: (rank, totalPlayers) =>
      `Terminaste en #${rank} de ${totalPlayers}: estuviste a un paso del primer lugar y sostuviste la presion hasta el cierre.`,
  },
  {
    title: "Podio con estilo propio",
    definition: "Reconoce un cierre de torneo fuerte, consistente y con medalla incluida.",
    detail: (rank, totalPlayers) =>
      `Ese #${rank} de ${totalPlayers} te dejo en el podio final con suficientes aciertos como para presumirlo sin culpa.`,
  },
  {
    title: "Pulso de fase final",
    definition: "Para quien termino justo detras del podio y nunca dejo de incomodar a los punteros.",
    detail: (rank, totalPlayers) =>
      `El #${rank} de ${totalPlayers} habla de una campaña muy competitiva: estuviste siempre en la conversacion grande.`,
  },
  {
    title: "Radar de picks picantes",
    definition: "Reconoce a quien supo elegir resultados con nervio y ponerle sazón a la tabla.",
    detail: (rank, totalPlayers) =>
      `Tu cierre en #${rank} de ${totalPlayers} premio una combinacion de intuicion, picks atrevidos y buen timing.`,
  },
  {
    title: "Factor sorpresa oficial",
    definition: "Se entrega a quien convirtio mas de una jornada en una historia inesperada.",
    detail: (rank, totalPlayers) =>
      `Ese #${rank} de ${totalPlayers} llego con varios giros propios y una cuota importante de caos bien administrado.`,
  },
  {
    title: "Control total del drama",
    definition: "Premio para quien hizo rendir cada pick y mantuvo la intriga viva jornada tras jornada.",
    detail: (rank, totalPlayers) =>
      `Tu puesto #${rank} de ${totalPlayers} salio de una quiniela llena de decisiones que nunca dejaron a la tabla en paz.`,
  },
  {
    title: "Cronista del mundial alterno",
    definition: "Reconoce a quien armo su propia narrativa del torneo con picks memorables.",
    detail: (rank, totalPlayers) =>
      `Terminaste #${rank} de ${totalPlayers} gracias a una lectura muy tuya del torneo, imposible de confundir con la de nadie mas.`,
  },
  {
    title: "Especialista en vivir al limite",
    definition: "Premio para quien sostuvo la emocion aunque la tabla no regalara demasiada calma.",
    detail: (rank, totalPlayers) =>
      `Ese #${rank} de ${totalPlayers} reflejo una quiniela de alto voltaje, con varios picks que se jugaron al borde del dramatismo.`,
  },
  {
    title: "Curaduria premium del suspense",
    definition: "Se entrega a quien hizo que siempre hubiera algo raro, divertido o improbable a punto de pasar.",
    detail: (rank, totalPlayers) =>
      `Tu #${rank} de ${totalPlayers} nacio de una ruta muy entretenida: picks con personalidad y cero ganas de ser predecible.`,
  },
  {
    title: "Coleccion de picks inolvidables",
    definition: "Premia a quien dejo varios pronosticos que merecen seguir discutiendose en la sobremesa.",
    detail: (rank, totalPlayers) =>
      `El #${rank} de ${totalPlayers} te encontro firmando una quiniela con momentos muy tuyos y varios picks para recordar.`,
  },
  {
    title: "Comite de agitacion mundialista",
    definition: "Reconoce a quien nunca dejo que la competencia se volviera aburrida.",
    detail: (rank, totalPlayers) =>
      `Tu puesto #${rank} de ${totalPlayers} premia la capacidad de mantener la liga entretenida incluso cuando la tabla no aflojaba.`,
  },
  {
    title: "Inventario oficial de plot twists",
    definition: "Para quien reunio varias de las decisiones mas inesperadas de toda la quiniela.",
    detail: (rank, totalPlayers) =>
      `Ese #${rank} de ${totalPlayers} salio de una mezcla de intuicion, riesgo y una clara vocacion por el giro inesperado.`,
  },
  {
    title: "Direccion creativa del riesgo",
    definition: "Premio para quien siguio apostando con identidad propia hasta el ultimo tramo.",
    detail: (rank, totalPlayers) =>
      `Terminaste #${rank} de ${totalPlayers} dejando claro que tu quiniela no se parecia a ninguna otra.`,
  },
  {
    title: "Archivo viviente de la remontada",
    definition: "Reconoce a quien siempre encontro una nueva forma de seguir compitiendo y sumando historia.",
    detail: (rank, totalPlayers) =>
      `Tu #${rank} de ${totalPlayers} quedo marcado por una ruta resistente, peleada y llena de narrativa hasta el final.`,
  },
];

export function getClosingPrize(rank: number, totalPlayers: number): ClosingPrize {
  const template =
    POSITION_PRIZES[rank - 1] ??
    {
      title: `Puesto memorable #${rank}`,
      definition: "Premio de cierre para reconocer una quiniela con personalidad propia hasta el final.",
      detail: (resolvedRank: number, resolvedTotalPlayers: number) =>
        `Terminaste en #${resolvedRank} de ${resolvedTotalPlayers} y dejaste una huella propia en esta edicion de la quiniela.`,
    };

  return {
    title: template.title,
    definition: template.definition,
    detail: template.detail(rank, totalPlayers),
  };
}

export function getPlacementLabel(rank: number, totalPlayers: number) {
  return `#${rank} de ${totalPlayers}`;
}
