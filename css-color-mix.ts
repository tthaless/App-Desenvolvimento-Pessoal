import type { Plugin as PostcssPlugin, Root } from 'postcss'

// Safari de iPhones sem atualização (iOS < 16.2) não entende color-mix(),
// nem dvh (iOS < 15.4),
// e as cores somem. Como as cores do app são fixas (definidas em :root),
// o build já calcula o resultado e troca color-mix() por uma cor comum.

type RGBA = [number, number, number, number]

function parseColor(raw: string, vars: Map<string, string>, depth = 0): RGBA | null {
  const v = raw.trim()
  if (depth > 5) return null
  const ref = v.match(/^var\((--[\w-]+)\)$/)
  if (ref) {
    const val = vars.get(ref[1])
    return val ? parseColor(val, vars, depth + 1) : null
  }
  if (v === 'transparent') return [0, 0, 0, 0]
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1) as RGBA
  }
  const rgb = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3], rgb[4] === undefined ? 1 : +rgb[4]]
  return null
}

/** Mistura em sRGB com alfa pré-multiplicado, como o navegador faz. */
function mix(a: RGBA, p: number, b: RGBA): string {
  const q = 1 - p
  const alpha = a[3] * p + b[3] * q
  if (alpha === 0) return 'transparent'
  const ch = [0, 1, 2].map((i) => Math.round((a[i] * a[3] * p + b[i] * b[3] * q) / alpha))
  const al = Math.round(alpha * 1000) / 1000
  return al >= 1 ? `rgb(${ch.join(', ')})` : `rgba(${ch.join(', ')}, ${al})`
}

/** Separa os argumentos no nível de cima (respeitando parênteses). */
function splitArgs(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const c of s) {
    if (c === '(') depth++
    if (c === ')') depth--
    if (c === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out.map((x) => x.trim())
}

function replaceAll(value: string, vars: Map<string, string>): string {
  let out = ''
  let i = 0
  while (true) {
    const start = value.indexOf('color-mix(', i)
    if (start < 0) return out + value.slice(i)
    let depth = 0
    let end = start + 'color-mix'.length
    for (; end < value.length; end++) {
      if (value[end] === '(') depth++
      if (value[end] === ')' && --depth === 0) break
    }
    const inner = value.slice(start + 'color-mix('.length, end)
    const [space, first, second] = splitArgs(inner)
    let replacement = value.slice(start, end + 1)
    const m1 = first?.match(/^(.*?)\s+([\d.]+)%$/)
    if (space === 'in srgb' && m1 && second) {
      const a = parseColor(m1[1], vars)
      const b = parseColor(second.replace(/\s+[\d.]+%$/, ''), vars)
      if (a && b) replacement = mix(a, Number(m1[2]) / 100, b)
    }
    out += value.slice(i, start) + replacement
    i = end + 1
  }
}

export default function colorMixFallback(): PostcssPlugin {
  return {
    postcssPlugin: 'streak-color-mix',
    Once(root: Root) {
      const vars = new Map<string, string>()
      root.walkRules(':root', (rule) => rule.walkDecls(/^--/, (d) => void vars.set(d.prop, d.value)))
      root.walkDecls((decl) => {
        if (decl.value.includes('color-mix(')) decl.value = replaceAll(decl.value, vars)
        // dvh só existe a partir do iOS 15.4: antes dele, vale a versão em vh.
        if (/\d(dvh)\b/.test(decl.value) && !decl.prop.startsWith('--'))
          decl.cloneBefore({ value: decl.value.replace(/(\d)dvh\b/g, '$1vh') })
      })
    },
  }
}
