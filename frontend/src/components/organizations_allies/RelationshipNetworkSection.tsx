import { FolderOpen, Graph, ListBullets } from '@phosphor-icons/react'
import { ToggleGroup } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { organizationsAlliesCopy } from '../../copy/organizations_allies_copy'
import { investigatorNetworkNodeIdentifier } from '../../demonstration/organizations_allies_data'
import type {
  KnownContact,
  RelationshipNetworkLink,
  RelationshipNetworkNode,
} from '../../demonstration/organizations_allies_data'
import { FactionEmblem } from './FactionEmblem'
import type { RelationshipNetworkViewName } from './organizations_allies_record'

const threadTraceVariantNames = ['traced_from_origin', 'traced_from_destination', 'pulled_taut', 'stitched_in_bursts'] as const
const portraitLayoutMaximumContainerWidth = 620
const maximumCharactersPerNodeLabelLine = 14
const opposingThreadCurveOffset = 30
const opposingThreadLabelPositionAlongCurve = 0.4
const loneThreadLabelPositionsAlongCurve = [0.46, 0.68] as const
const estimatedCharacterWidthRatio = 0.62

type BoardOrientationName = 'landscape' | 'portrait'

type BoardPoint = { horizontal: number; vertical: number }

type BoardDimensions = {
  width: number
  height: number
  investigatorPoint: BoardPoint
  factionRowVertical: number
  affiliatedContactPoint: BoardPoint
  contactRowVertical: number
  horizontalMargin: number
  nodeRadiusByKind: Record<RelationshipNetworkNode['kind'], number>
  labelFontSize: number
}

const boardDimensionsByOrientation: Record<BoardOrientationName, BoardDimensions> = {
  landscape: {
    width: 1000,
    height: 640,
    investigatorPoint: { horizontal: 500, vertical: 330 },
    factionRowVertical: 118,
    affiliatedContactPoint: { horizontal: 150, vertical: 270 },
    contactRowVertical: 540,
    horizontalMargin: 150,
    nodeRadiusByKind: { investigator: 36, faction: 36, contact: 28 },
    labelFontSize: 15,
  },
  portrait: {
    width: 340,
    height: 720,
    investigatorPoint: { horizontal: 200, vertical: 360 },
    factionRowVertical: 96,
    affiliatedContactPoint: { horizontal: 56, vertical: 250 },
    contactRowVertical: 620,
    horizontalMargin: 56,
    nodeRadiusByKind: { investigator: 28, faction: 28, contact: 24 },
    labelFontSize: 11.5,
  },
}

function spreadAlongRow(itemCount: number, itemIndex: number, boardDimensions: BoardDimensions): number {
  if (itemCount <= 1) {
    return boardDimensions.width / 2
  }
  const usableWidth = boardDimensions.width - boardDimensions.horizontalMargin * 2
  return boardDimensions.horizontalMargin + (usableWidth * itemIndex) / (itemCount - 1)
}

function calculateNodePoints(
  networkNodes: RelationshipNetworkNode[],
  knownContacts: KnownContact[],
  boardDimensions: BoardDimensions,
): Map<string, BoardPoint> {
  const pointByNodeIdentifier = new Map<string, BoardPoint>()
  const factionNodes = networkNodes.filter((networkNode) => networkNode.kind === 'faction')
  const affiliatedContactIdentifiers = new Set(
    knownContacts
      .filter((knownContact) => knownContact.affiliatedFactionIdentifier !== null)
      .map((knownContact) => knownContact.identifier),
  )
  const contactNodes = networkNodes.filter((networkNode) => networkNode.kind === 'contact')
  const rowContactNodes = contactNodes.filter((contactNode) => !affiliatedContactIdentifiers.has(contactNode.identifier))
  const affiliatedContactNodes = contactNodes.filter((contactNode) => affiliatedContactIdentifiers.has(contactNode.identifier))
  pointByNodeIdentifier.set(investigatorNetworkNodeIdentifier, boardDimensions.investigatorPoint)
  factionNodes.forEach((factionNode, factionIndex) => {
    pointByNodeIdentifier.set(factionNode.identifier, {
      horizontal: spreadAlongRow(factionNodes.length, factionIndex, boardDimensions),
      vertical: boardDimensions.factionRowVertical,
    })
  })
  affiliatedContactNodes.forEach((affiliatedContactNode, affiliatedContactIndex) => {
    pointByNodeIdentifier.set(affiliatedContactNode.identifier, {
      horizontal: boardDimensions.affiliatedContactPoint.horizontal,
      vertical: boardDimensions.affiliatedContactPoint.vertical + affiliatedContactIndex * 110,
    })
  })
  rowContactNodes.forEach((rowContactNode, rowContactIndex) => {
    pointByNodeIdentifier.set(rowContactNode.identifier, {
      horizontal: spreadAlongRow(rowContactNodes.length, rowContactIndex, boardDimensions),
      vertical: boardDimensions.contactRowVertical,
    })
  })
  return pointByNodeIdentifier
}

function splitNodeLabelIntoLines(nodeLabel: string): string[] {
  const labelLines: string[] = []
  for (const labelWord of nodeLabel.split(/\s+/)) {
    const lastLine = labelLines[labelLines.length - 1]
    if (lastLine !== undefined && `${lastLine} ${labelWord}`.length <= maximumCharactersPerNodeLabelLine) {
      labelLines[labelLines.length - 1] = `${lastLine} ${labelWord}`
    } else {
      labelLines.push(labelWord)
    }
  }
  return labelLines
}

type ThreadGeometry = {
  pathDefinition: string
  labelPoint: BoardPoint
}

function calculateThreadGeometry(
  originPoint: BoardPoint,
  destinationPoint: BoardPoint,
  originRadius: number,
  destinationRadius: number,
  hasOpposingThread: boolean,
  labelPositionAlongCurve: number,
  estimatedLabelWidth: number,
  boardWidth: number,
): ThreadGeometry {
  const horizontalDistance = destinationPoint.horizontal - originPoint.horizontal
  const verticalDistance = destinationPoint.vertical - originPoint.vertical
  const fullDistance = Math.max(1, Math.hypot(horizontalDistance, verticalDistance))
  const unitHorizontal = horizontalDistance / fullDistance
  const unitVertical = verticalDistance / fullDistance
  const perpendicularHorizontal = -unitVertical
  const perpendicularVertical = unitHorizontal
  const curveOffset = hasOpposingThread ? opposingThreadCurveOffset : 0
  const startPoint = {
    horizontal: originPoint.horizontal + unitHorizontal * (originRadius + 5) + perpendicularHorizontal * curveOffset * 0.3,
    vertical: originPoint.vertical + unitVertical * (originRadius + 5) + perpendicularVertical * curveOffset * 0.3,
  }
  const endPoint = {
    horizontal:
      destinationPoint.horizontal - unitHorizontal * (destinationRadius + 13) + perpendicularHorizontal * curveOffset * 0.3,
    vertical: destinationPoint.vertical - unitVertical * (destinationRadius + 13) + perpendicularVertical * curveOffset * 0.3,
  }
  const controlPoint = {
    horizontal: (startPoint.horizontal + endPoint.horizontal) / 2 + perpendicularHorizontal * curveOffset,
    vertical: (startPoint.vertical + endPoint.vertical) / 2 + perpendicularVertical * curveOffset,
  }
  const curvePosition = labelPositionAlongCurve
  const remainingPosition = 1 - curvePosition
  const labelDistanceFromThread = hasOpposingThread
    ? 12 + Math.abs(perpendicularHorizontal) * (estimatedLabelWidth / 2)
    : 0
  const unclampedLabelPoint = {
    horizontal:
      remainingPosition * remainingPosition * startPoint.horizontal +
      2 * remainingPosition * curvePosition * controlPoint.horizontal +
      curvePosition * curvePosition * endPoint.horizontal +
      perpendicularHorizontal * labelDistanceFromThread,
    vertical:
      remainingPosition * remainingPosition * startPoint.vertical +
      2 * remainingPosition * curvePosition * controlPoint.vertical +
      curvePosition * curvePosition * endPoint.vertical +
      perpendicularVertical * labelDistanceFromThread,
  }
  const labelPoint = {
    horizontal: Math.min(
      boardWidth - estimatedLabelWidth / 2 - 6,
      Math.max(estimatedLabelWidth / 2 + 6, unclampedLabelPoint.horizontal),
    ),
    vertical: unclampedLabelPoint.vertical,
  }
  return {
    pathDefinition: `M${startPoint.horizontal.toFixed(1)} ${startPoint.vertical.toFixed(1)} Q${controlPoint.horizontal.toFixed(1)} ${controlPoint.vertical.toFixed(1)} ${endPoint.horizontal.toFixed(1)} ${endPoint.vertical.toFixed(1)}`,
    labelPoint,
  }
}

function describeNetworkLink(networkLink: RelationshipNetworkLink): string {
  const networkCopy = organizationsAlliesCopy.network
  const linkLabelParts: string[] = [networkCopy.linkLabelByKindName[networkLink.kindName]]
  if (networkLink.level !== null) {
    linkLabelParts.push(networkCopy.linkLevelSuffix(networkLink.level))
  }
  if (networkLink.isUnconfirmed) {
    linkLabelParts.push(networkCopy.unconfirmedLinkLabel.toLowerCase())
  }
  return linkLabelParts.join(' · ')
}

type RelationshipNetworkSectionProperties = {
  networkNodes: RelationshipNetworkNode[]
  networkLinks: RelationshipNetworkLink[]
  knownContacts: KnownContact[]
  preferredNetworkViewName: RelationshipNetworkViewName
  onNetworkViewPreferred: (networkViewName: RelationshipNetworkViewName) => void
  onCaseCardRequested: (networkNode: RelationshipNetworkNode) => void
}

export function RelationshipNetworkSection({
  networkNodes,
  networkLinks,
  knownContacts,
  preferredNetworkViewName,
  onNetworkViewPreferred,
  onCaseCardRequested,
}: RelationshipNetworkSectionProperties) {
  const networkCopy = organizationsAlliesCopy.network
  const playInteractionFeedback = useInteractionFeedback()
  const boardContainerElement = useRef<HTMLDivElement>(null)
  const [boardOrientationName, setBoardOrientationName] = useState<BoardOrientationName>(() =>
    window.innerWidth < portraitLayoutMaximumContainerWidth + 40 ? 'portrait' : 'landscape',
  )
  const [selectedNodeIdentifier, setSelectedNodeIdentifier] = useState<string>(investigatorNetworkNodeIdentifier)
  const [threadTraceVariantName] = useState(() =>
    chooseAnimationVariantName('factions_thread_trace', threadTraceVariantNames),
  )
  const [threadDelayByLinkIdentifier] = useState(
    () =>
      new Map(
        networkLinks.map((networkLink, linkIndex) => [
          networkLink.identifier,
          Math.round(linkIndex * 90 + randomNumberBetween(0, 160)),
        ]),
      ),
  )

  useEffect(() => {
    const observedElement = boardContainerElement.current
    if (!observedElement || typeof ResizeObserver === 'undefined') {
      return
    }
    const containerResizeObserver = new ResizeObserver((resizeEntries) => {
      const containerWidth = resizeEntries[0]?.contentRect.width
      if (containerWidth !== undefined && containerWidth > 0) {
        setBoardOrientationName(containerWidth < portraitLayoutMaximumContainerWidth ? 'portrait' : 'landscape')
      }
    })
    containerResizeObserver.observe(observedElement)
    return () => containerResizeObserver.disconnect()
  }, [preferredNetworkViewName])

  const boardDimensions = boardDimensionsByOrientation[boardOrientationName]
  const pointByNodeIdentifier = calculateNodePoints(networkNodes, knownContacts, boardDimensions)
  const nodeByIdentifier = new Map(networkNodes.map((networkNode) => [networkNode.identifier, networkNode]))
  const selectedNode = nodeByIdentifier.get(selectedNodeIdentifier) ?? networkNodes[0]
  const outgoingLinks = networkLinks.filter((networkLink) => networkLink.originNodeIdentifier === selectedNode.identifier)
  const incomingLinks = networkLinks.filter((networkLink) => networkLink.destinationNodeIdentifier === selectedNode.identifier)

  const selectNetworkNode = (nodeIdentifier: string) => {
    if (nodeIdentifier === selectedNode.identifier) {
      playInteractionFeedback('option_click')
      return
    }
    playInteractionFeedback('panel_open')
    setSelectedNodeIdentifier(nodeIdentifier)
  }

  const renderLinkList = (heading: string, listedLinks: RelationshipNetworkLink[]) => (
    <div className="min-w-0">
      <h4 className="dossier-label">{heading}</h4>
      {listedLinks.length === 0 ? (
        <p className="mt-1 text-sm text-paper-muted">{networkCopy.noLinks}</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {listedLinks.map((listedLink) => (
            <li key={listedLink.identifier} className="factions-thread-sentence" data-is-unconfirmed={listedLink.isUnconfirmed}>
              {networkCopy.linkSentence(
                nodeByIdentifier.get(listedLink.originNodeIdentifier)?.displayName ?? '',
                describeNetworkLink(listedLink),
                nodeByIdentifier.get(listedLink.destinationNodeIdentifier)?.displayName ?? '',
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <section aria-labelledby="network-section-title" className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 id="network-section-title" className="display-title text-3xl sm:text-4xl">
            {networkCopy.sectionTitle}
          </h2>
          <p className="mt-2 max-w-[68ch] text-[0.9375rem] text-paper-muted">{networkCopy.sectionIntroduction}</p>
        </div>
        <ToggleGroup.Root
          type="single"
          value={preferredNetworkViewName}
          aria-label={networkCopy.viewToggleLabel}
          className="flex shrink-0 gap-1.5"
          onValueChange={(newViewName) => {
            if (newViewName === 'board' || newViewName === 'list') {
              playInteractionFeedback('option_click')
              onNetworkViewPreferred(newViewName)
            }
          }}
        >
          <ToggleGroup.Item value="board" className="factions-view-toggle">
            <Graph size={18} weight="fill" aria-hidden="true" />
            {networkCopy.boardViewLabel}
          </ToggleGroup.Item>
          <ToggleGroup.Item value="list" className="factions-view-toggle">
            <ListBullets size={18} weight="bold" aria-hidden="true" />
            {networkCopy.listViewLabel}
          </ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {preferredNetworkViewName === 'board' ? (
            <div ref={boardContainerElement} className="factions-network-board comic-panel min-w-0">
              <svg
                viewBox={`0 0 ${boardDimensions.width} ${boardDimensions.height}`}
                className="block h-auto w-full"
                role="group"
                aria-label={networkCopy.boardDescription(networkNodes.length, networkLinks.length)}
                data-thread-trace-variant={threadTraceVariantName}
              >
                <defs>
                  <marker id="factions-thread-arrowhead" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                    <path d="M0 0 L10 5 L0 10 Z" className="factions-thread-arrowhead" />
                  </marker>
                  <marker id="factions-thread-arrowhead-unconfirmed" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                    <path d="M0 0 L10 5 L0 10 Z" className="factions-thread-arrowhead-unconfirmed" />
                  </marker>
                </defs>

                <g aria-hidden="true">
                  {networkLinks.map((networkLink, linkIndex) => {
                    const originPoint = pointByNodeIdentifier.get(networkLink.originNodeIdentifier)
                    const destinationPoint = pointByNodeIdentifier.get(networkLink.destinationNodeIdentifier)
                    const originNode = nodeByIdentifier.get(networkLink.originNodeIdentifier)
                    const destinationNode = nodeByIdentifier.get(networkLink.destinationNodeIdentifier)
                    if (!originPoint || !destinationPoint || !originNode || !destinationNode) {
                      return null
                    }
                    const hasOpposingThread = networkLinks.some(
                      (otherLink) =>
                        otherLink.originNodeIdentifier === networkLink.destinationNodeIdentifier &&
                        otherLink.destinationNodeIdentifier === networkLink.originNodeIdentifier,
                    )
                    const threadLabelText =
                      boardOrientationName === 'landscape'
                        ? describeNetworkLink(networkLink)
                        : networkCopy.linkLabelByKindName[networkLink.kindName]
                    const threadLabelFontSize = boardDimensions.labelFontSize - 1.5
                    const threadGeometry = calculateThreadGeometry(
                      originPoint,
                      destinationPoint,
                      boardDimensions.nodeRadiusByKind[originNode.kind],
                      boardDimensions.nodeRadiusByKind[destinationNode.kind],
                      hasOpposingThread,
                      hasOpposingThread
                        ? opposingThreadLabelPositionAlongCurve
                        : loneThreadLabelPositionsAlongCurve[linkIndex % loneThreadLabelPositionsAlongCurve.length],
                      threadLabelText.length * threadLabelFontSize * estimatedCharacterWidthRatio,
                      boardDimensions.width,
                    )
                    const touchesSelectedNode =
                      networkLink.originNodeIdentifier === selectedNode.identifier ||
                      networkLink.destinationNodeIdentifier === selectedNode.identifier
                    return (
                      <g
                        key={networkLink.identifier}
                        className="factions-thread"
                        data-is-unconfirmed={networkLink.isUnconfirmed}
                        data-touches-selected-node={touchesSelectedNode}
                        style={{ '--thread-delay': `${threadDelayByLinkIdentifier.get(networkLink.identifier) ?? 0}ms` } as CSSProperties}
                      >
                        <path
                          d={threadGeometry.pathDefinition}
                          pathLength={networkLink.isUnconfirmed ? undefined : 1}
                          className="factions-thread-line"
                          markerEnd={
                            networkLink.isUnconfirmed
                              ? 'url(#factions-thread-arrowhead-unconfirmed)'
                              : 'url(#factions-thread-arrowhead)'
                          }
                        />
                        {boardOrientationName === 'landscape' ||
                        (touchesSelectedNode && selectedNode.kind !== 'investigator') ? (
                          <text
                            x={threadGeometry.labelPoint.horizontal}
                            y={threadGeometry.labelPoint.vertical}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="factions-thread-label"
                            fontSize={threadLabelFontSize}
                          >
                            {threadLabelText}
                          </text>
                        ) : null}
                      </g>
                    )
                  })}
                </g>

                {networkNodes.map((networkNode, nodeIndex) => {
                  const nodePoint = pointByNodeIdentifier.get(networkNode.identifier)
                  if (!nodePoint) {
                    return null
                  }
                  const nodeRadius = boardDimensions.nodeRadiusByKind[networkNode.kind]
                  const isSelected = networkNode.identifier === selectedNode.identifier
                  const labelLines = splitNodeLabelIntoLines(networkNode.displayName)
                  const isLabelAboveNode = networkNode.kind === 'faction'
                  const labelLineHeight = boardDimensions.labelFontSize * 1.15
                  return (
                    <g
                      key={networkNode.identifier}
                      className="factions-network-node"
                      data-node-kind={networkNode.kind}
                      data-is-selected={isSelected}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={networkCopy.selectNodeLabel(
                        networkNode.displayName,
                        networkCopy.nodeKindLabelByName[networkNode.kind],
                      )}
                      style={{ '--entrance-order': nodeIndex } as CSSProperties}
                      onClick={() => selectNetworkNode(networkNode.identifier)}
                      onKeyDown={(keyboardEvent) => {
                        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                          keyboardEvent.preventDefault()
                          selectNetworkNode(networkNode.identifier)
                        }
                      }}
                      onPointerEnter={(pointerEvent) => {
                        if (pointerEvent.pointerType === 'mouse') {
                          playInteractionFeedback('option_hover')
                        }
                      }}
                    >
                      <circle cx={nodePoint.horizontal} cy={nodePoint.vertical} r={nodeRadius + 8} className="factions-network-node-focus-ring" />
                      {networkNode.kind === 'faction' && networkNode.factionIdentifier ? (
                        <>
                          <rect
                            x={nodePoint.horizontal - nodeRadius}
                            y={nodePoint.vertical - nodeRadius}
                            width={nodeRadius * 2}
                            height={nodeRadius * 2}
                            className="factions-network-node-shape"
                          />
                          <FactionEmblem
                            factionIdentifier={networkNode.factionIdentifier}
                            isEngravingAnimated={false}
                            placementWithinDrawing={{
                              horizontalPosition: nodePoint.horizontal - nodeRadius + 5,
                              verticalPosition: nodePoint.vertical - nodeRadius + 5,
                              sideLength: nodeRadius * 2 - 10,
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <circle cx={nodePoint.horizontal} cy={nodePoint.vertical} r={nodeRadius} className="factions-network-node-shape" />
                          <circle
                            cx={nodePoint.horizontal}
                            cy={nodePoint.vertical - nodeRadius * 0.22}
                            r={nodeRadius * 0.27}
                            className="factions-network-node-figure"
                          />
                          <path
                            d={`M${nodePoint.horizontal - nodeRadius * 0.55} ${nodePoint.vertical + nodeRadius * 0.62} Q${nodePoint.horizontal} ${nodePoint.vertical - nodeRadius * 0.12} ${nodePoint.horizontal + nodeRadius * 0.55} ${nodePoint.vertical + nodeRadius * 0.62} Z`}
                            className="factions-network-node-figure"
                          />
                        </>
                      )}
                      <circle cx={nodePoint.horizontal} cy={nodePoint.vertical - nodeRadius + 1} r={4} className="factions-network-node-pin" />
                      <text
                        x={nodePoint.horizontal}
                        y={
                          isLabelAboveNode
                            ? nodePoint.vertical - nodeRadius - 12 - (labelLines.length - 1) * labelLineHeight
                            : nodePoint.vertical + nodeRadius + boardDimensions.labelFontSize + 4
                        }
                        textAnchor="middle"
                        className="factions-network-node-label"
                        fontSize={boardDimensions.labelFontSize}
                      >
                        {labelLines.map((labelLine, labelLineIndex) => (
                          <tspan key={labelLine} x={nodePoint.horizontal} dy={labelLineIndex === 0 ? 0 : labelLineHeight}>
                            {labelLine}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  )
                })}
              </svg>
              <ul className="factions-network-legend">
                <li>
                  <span className="factions-network-legend-thread" aria-hidden="true" />
                  {networkCopy.legendConfirmedThread}
                </li>
                <li>
                  <span className="factions-network-legend-thread" data-is-unconfirmed="true" aria-hidden="true" />
                  {networkCopy.legendUnconfirmedThread}
                </li>
                <li>{networkCopy.legendArrow}</li>
                {boardOrientationName === 'portrait' ? <li>{networkCopy.legendSelectToNameThreads}</li> : null}
              </ul>
            </div>
          ) : (
            <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
              {networkNodes.map((networkNode, nodeIndex) => {
                const isSelected = networkNode.identifier === selectedNode.identifier
                const nodeOutgoingLinks = networkLinks.filter(
                  (networkLink) => networkLink.originNodeIdentifier === networkNode.identifier,
                )
                return (
                  <li
                    key={networkNode.identifier}
                    className="entrance-from-left min-w-0"
                    style={{ '--entrance-order': nodeIndex } as CSSProperties}
                  >
                    <button
                      type="button"
                      className="factions-network-list-entry"
                      aria-pressed={isSelected}
                      onClick={() => selectNetworkNode(networkNode.identifier)}
                    >
                      <span className="dossier-label block">{networkCopy.nodeKindLabelByName[networkNode.kind]}</span>
                      <span className="block font-[family-name:var(--font-dossier)] text-base font-bold [overflow-wrap:anywhere]">
                        {networkNode.displayName}
                      </span>
                      <span className="mt-1 block text-sm text-paper-muted [overflow-wrap:anywhere]">
                        {nodeOutgoingLinks.length === 0
                          ? networkCopy.noLinks
                          : nodeOutgoingLinks
                              .map(
                                (nodeOutgoingLink) =>
                                  `→ ${nodeByIdentifier.get(nodeOutgoingLink.destinationNodeIdentifier)?.displayName ?? ''}: ${describeNetworkLink(nodeOutgoingLink)}`,
                              )
                              .join(' · ')}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <aside
          key={selectedNode.identifier}
          className="comic-panel comic-panel-cut-corner factions-network-detail min-w-0 self-start p-4"
          aria-labelledby="network-detail-heading"
          aria-live="polite"
        >
          <p id="network-detail-heading" className="dossier-label">
            {networkCopy.detailHeading} · {networkCopy.nodeKindLabelByName[selectedNode.kind]}
          </p>
          <h3 className="display-title mt-1 text-2xl [overflow-wrap:anywhere]">{selectedNode.displayName}</h3>
          <p className="font-[family-name:var(--font-dossier)] text-sm text-paper-muted [overflow-wrap:anywhere]">
            {selectedNode.captionText}
          </p>
          <div className="mt-4 space-y-4">
            {renderLinkList(networkCopy.outgoingHeading, outgoingLinks)}
            {renderLinkList(networkCopy.incomingHeading, incomingLinks)}
          </div>
          {selectedNode.kind !== 'investigator' ? (
            <button
              type="button"
              className="quiet-action-button mt-4 w-full"
              onClick={() => {
                playInteractionFeedback('action_sent')
                onCaseCardRequested(selectedNode)
              }}
            >
              <FolderOpen size={18} weight="fill" aria-hidden="true" />
              {networkCopy.openCaseCardAction}
            </button>
          ) : null}
        </aside>
      </div>
    </section>
  )
}
