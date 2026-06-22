import { ref, type Ref } from 'vue'
import { stations, stationMap, lines } from './useMapData'

export interface NodeInfo {
  stationId: string
  lineId: string
  stationName: string
  stationNameEn: string
  lineName: string
  lineNameEn: string
}

export interface RouteSegment {
  lineId: string
  lineName: string
  lineNameEn: string
  isFerry: boolean
  nodes: NodeInfo[]
}

export interface RouteResult {
  segments: RouteSegment[]
  pathNodeIds: string[]
  totalWeight: number
}

export interface StationSuggestion {
  id: string
  name: string
  nameEn: string
  lines: { id: string; name: string; nameEn: string }[]
}

const graph = new Map<string, Map<string, number>>()
const stationNodeMap = new Map<string, string[]>()
const nodeInfoMap = new Map<string, NodeInfo>()

function addEdge(a: string, b: string, w: number) {
  if (!graph.has(a)) graph.set(a, new Map())
  if (!graph.has(b)) graph.set(b, new Map())
  graph.get(a)!.set(b, w)
  graph.get(b)!.set(a, w)
}

const seenNodes = new Set<string>()

for (const line of lines) {
  if (line.lineType === 'same-station') continue

  const isFerry = line.lineType === 'ferry'
  const edgeWeight = isFerry ? 5 : 1

  for (const [sid] of line.stations) {
    const st = stationMap.get(sid)
    if (!st) continue

    const nodeId = `${sid}-${line.id}`

    if (!seenNodes.has(nodeId)) {
      seenNodes.add(nodeId)
      nodeInfoMap.set(nodeId, {
        stationId: sid,
        lineId: line.id,
        stationName: st.name,
        stationNameEn: st.nameEn,
        lineName: line.name,
        lineNameEn: line.nameEn,
      })

      if (!stationNodeMap.has(sid)) stationNodeMap.set(sid, [])
      stationNodeMap.get(sid)!.push(nodeId)
    }
  }

  for (let i = 0; i < line.stations.length - 1; i++) {
    const [aId] = line.stations[i]
    const [bId] = line.stations[i + 1]
    const aSt = stationMap.get(aId)
    const bSt = stationMap.get(bId)
    if (!aSt || !bSt) continue
    addEdge(`${aId}-${line.id}`, `${bId}-${line.id}`, edgeWeight)
  }
}

for (const [, nodes] of stationNodeMap) {
  if (nodes.length < 2) continue
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      addEdge(nodes[i], nodes[j], 0.1)
    }
  }
}

for (const line of lines) {
  if (line.lineType !== 'same-station') continue
  const [aId] = line.stations[0]
  const [bId] = line.stations[1]
  const nodesA = stationNodeMap.get(aId) || []
  const nodesB = stationNodeMap.get(bId) || []
  for (const na of nodesA) {
    for (const nb of nodesB) {
      addEdge(na, nb, 0.5)
    }
  }
}

export function useRouting() {
  const selectTarget = ref<'start' | 'end' | null>(null)

  function searchStations(query: string): StationSuggestion[] {
    if (!query || query.trim().length === 0) return []
    const q = query.toLowerCase().trim()
    const results: StationSuggestion[] = []

    for (const st of stations) {
      const nameMatch = st.name.toLowerCase().includes(q)
      const nameEnMatch = st.nameEn.toLowerCase().includes(q)
      const idMatch = st.id.toLowerCase().includes(q)
      const shortId = st.id.split('-').slice(1).join('-').toLowerCase()
      const shortIdMatch = shortId.includes(q)

      if (!nameMatch && !nameEnMatch && !idMatch && !shortIdMatch) continue

      const lineNodes = stationNodeMap.get(st.id) || []
      const seenLines = new Set<string>()
      const lineInfo: { id: string; name: string; nameEn: string }[] = []
      for (const nodeId of lineNodes) {
        const info = nodeInfoMap.get(nodeId)
        if (info && !seenLines.has(info.lineId)) {
          seenLines.add(info.lineId)
          lineInfo.push({ id: info.lineId, name: info.lineName, nameEn: info.lineNameEn })
        }
      }

      results.push({ id: st.id, name: st.name, nameEn: st.nameEn, lines: lineInfo })
    }

    return results.slice(0, 20)
  }

  function findRoute(startStationId: string, endStationId: string): RouteResult | null {
    const startNodes = stationNodeMap.get(startStationId)
    const endNodes = stationNodeMap.get(endStationId)

    if (!startNodes || startNodes.length === 0) return null
    if (!endNodes || endNodes.length === 0) return null

    const dist = new Map<string, number>()
    const prev = new Map<string, string | null>()
    const visited = new Set<string>()
    const pq: [number, string][] = []

    for (const node of startNodes) {
      dist.set(node, 0)
      prev.set(node, null)
      pq.push([0, node])
    }

    const endSet = new Set(endNodes)
    let bestEnd: string | null = null

    while (pq.length > 0) {
      pq.sort((a, b) => a[0] - b[0])
      const [d, current] = pq.shift()!
      if (d !== dist.get(current)) continue
      if (visited.has(current)) continue
      visited.add(current)

      if (endSet.has(current)) {
        bestEnd = current
        break
      }

      const neighbors = graph.get(current)
      if (!neighbors) continue

      for (const [next, weight] of neighbors) {
        if (visited.has(next)) continue
        const nd = d + weight
        if (!dist.has(next) || nd < dist.get(next)!) {
          dist.set(next, nd)
          prev.set(next, current)
          pq.push([nd, next])
        }
      }
    }

    if (!bestEnd) return null

    const pathNodes: string[] = []
    let cur: string | null = bestEnd
    while (cur !== null) {
      pathNodes.unshift(cur)
      cur = prev.get(cur) ?? null
    }

    let totalWeight = 0
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const w = graph.get(pathNodes[i])?.get(pathNodes[i + 1])
      if (w !== undefined) totalWeight += w
    }

    const segments: RouteSegment[] = []
    let currentSeg: { lineId: string; nodes: NodeInfo[] } | null = null

    for (const nodeId of pathNodes) {
      const info = nodeInfoMap.get(nodeId)
      if (!info) continue

      if (!currentSeg || currentSeg.lineId !== info.lineId) {
        currentSeg = { lineId: info.lineId, nodes: [info] }
        segments.push({
          lineId: info.lineId,
          lineName: info.lineName,
          lineNameEn: info.lineNameEn,
          isFerry: info.lineId.startsWith('ferry-'),
          nodes: [info],
        })
      } else {
        currentSeg.nodes.push(info)
      }
    }

    return { segments, pathNodeIds: pathNodes, totalWeight }
  }

  function formatRoute(result: RouteResult): string {
    if (result.segments.length === 0) return '未找到路径'

    const segs = result.segments
    const textLines: string[] = []

    const startNode = segs[0].nodes[0]
    const endNode = segs[segs.length - 1].nodes[segs[segs.length - 1].nodes.length - 1]

    textLines.push(`从 ${startNode.stationName} 出发（${startNode.lineName}）`)

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]

      if (i === 0) {
        if (seg.nodes.length > 1) {
          textLines.push(`→ 乘坐 ${seg.lineName}: ${seg.nodes.slice(1).map(n => n.stationName).join(' → ')}`)
        }
        continue
      }

      const prevSeg = segs[i - 1]
      const getOff = prevSeg.nodes[prevSeg.nodes.length - 1].stationName
      const prevRode = prevSeg.nodes.length > 1
      const prefix = prevRode ? `→ 在 ${getOff} 下车，` : `→ `

      const restStations = seg.nodes.slice(1).map(n => n.stationName).join(' → ')
      const suffix = restStations ? `: ${restStations}` : ''

      if (seg.isFerry) {
        textLines.push(`${prefix}乘坐轮渡「${seg.lineName}」(权重 5)${suffix}`)
      } else if (prevSeg.isFerry) {
        textLines.push(`→ 在 ${seg.nodes[0].stationName} 下车，换乘 ${seg.lineName}${suffix}`)
      } else {
        textLines.push(`${prefix}换乘 ${seg.lineName}${suffix}`)
      }
    }

    textLines.push(`到达 ${endNode.stationName}`)
    textLines.push(`（总权重: ${result.totalWeight.toFixed(1)}）`)

    return textLines.join('\n')
  }

  return {
    selectTarget,
    searchStations,
    findRoute,
    formatRoute,
  }
}
