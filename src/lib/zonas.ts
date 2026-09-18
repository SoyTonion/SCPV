/**
 * Normaliza el campo `campoClasificacion` de la tabla Vehiculo
 * a una zona canónica para mostrarse en las vistas de pernocta.
 *
 * Reglas:
 *  - Si contiene el nombre de una agencia RURAL → devuelve el nombre de la agencia
 *  - Si contiene el nombre de una agencia URBANA → devuelve el nombre de la agencia
 *  - Todo lo demás → "Dentro de Zona"
 */

const AGENCIAS_RURALES: { key: string; label: string }[] = [
  { key: 'CEBALLOS',   label: 'Ceballos' },
  { key: 'RODEO',      label: 'Rodeo' },
  { key: 'BERMEJILLO', label: 'Bermejillo' },
  { key: 'CUENCAM',    label: 'Cuencamé' },   // cubre CUENCAME y CUENCAMÉ
  { key: 'TLAHUALILO', label: 'Tlahualilo' },
  { key: 'NAZAS',      label: 'Nazas' },
]

const AGENCIAS_URBANAS: { key: string; label: string }[] = [
  { key: 'PEDREGAL',   label: 'Pedregal' },
  { key: 'PEDREGRAL',  label: 'Pedregal' },    // typo frecuente en el CSV
  { key: 'LERDO',      label: 'Lerdo' },
  { key: 'CENTRO',     label: 'Centro' },
  { key: 'ELECTRICO',  label: 'Eléctrico' },   // cubre ELÉCTRICO y ELECTRICO
  { key: 'ELCTRICO',   label: 'Eléctrico' },   // variante sin acento mal importada
]

export function normalizarZona(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '' || raw.trim() === '|') return 'Dentro de Zona'

  const upper = raw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes para comparar
    .trim()

  for (const ag of AGENCIAS_RURALES) {
    const keyNorm = ag.key.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (upper.includes(keyNorm)) return ag.label
  }

  for (const ag of AGENCIAS_URBANAS) {
    const keyNorm = ag.key.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (upper.includes(keyNorm)) return ag.label
  }

  return 'Dentro de Zona'
}
