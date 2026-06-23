export class RouteMonitor {
  constructor(service) {
    this.service = service
  }

  async detectRouteType(peerId) {
    const { peers, handlers } = this.service
    const state = peers.get(peerId)
    if (!state?.pc) return

    const stats = await state.pc.getStats()
    let selectedPair = null
    let localCandidate = null
    let remoteCandidate = null

    for (const report of stats.values()) {
      if (report.type === 'transport' && report.selectedCandidatePairId) {
        selectedPair = stats.get(report.selectedCandidatePairId)
      }

      if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
        selectedPair = report
      }
    }

    if (!selectedPair) {
      handlers.onRouteType?.(peerId, 'unknown')
      return
    }

    if (selectedPair.localCandidateId) {
      localCandidate = stats.get(selectedPair.localCandidateId)
    }
    if (selectedPair.remoteCandidateId) {
      remoteCandidate = stats.get(selectedPair.remoteCandidateId)
    }

    const usesRelay = localCandidate?.candidateType === 'relay' || remoteCandidate?.candidateType === 'relay'
    handlers.onRouteType?.(peerId, usesRelay ? 'relay' : 'direct')
  }

  startRouteMonitor(peerId) {
    const { routeTimers, handlers } = this.service
    this.stopRouteMonitor(peerId)

    const timerId = setInterval(() => {
      this.detectRouteType(peerId).catch(() => {
        handlers.onRouteType?.(peerId, 'unknown')
      })
    }, 2500)

    routeTimers.set(peerId, timerId)
    this.detectRouteType(peerId).catch(() => {
      handlers.onRouteType?.(peerId, 'unknown')
    })
  }

  stopRouteMonitor(peerId) {
    const { routeTimers } = this.service
    const timerId = routeTimers.get(peerId)
    if (timerId) {
      clearInterval(timerId)
      routeTimers.delete(peerId)
    }
  }

  stopAllRouteMonitors() {
    const { routeTimers } = this.service
    for (const timerId of routeTimers.values()) {
      clearInterval(timerId)
    }
    routeTimers.clear()
  }
}
