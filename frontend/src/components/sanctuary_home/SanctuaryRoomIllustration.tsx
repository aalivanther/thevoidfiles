import type { SanctuaryRoomIdentifier } from '../../demonstration/sanctuary_home_data'

export type LampIgnitionVariantName = 'flickering_ignition' | 'slow_warm_ignition' | 'double_blink_ignition'
export type ConstructionWorkVariantName = 'hammering_work' | 'sawing_work' | 'welding_work'

type SanctuaryRoomIllustrationProperties = {
  roomIdentifier: SanctuaryRoomIdentifier
  installedUpgradeIdentifiers: ReadonlySet<string>
  constructionProgress: number | null
  lampIgnitionVariantName: LampIgnitionVariantName
  constructionWorkVariantName: ConstructionWorkVariantName
}

function DeskRoomDrawing({
  installedUpgradeIdentifiers,
  lampIgnitionVariantName,
}: Pick<SanctuaryRoomIllustrationProperties, 'installedUpgradeIdentifiers' | 'lampIgnitionVariantName'>) {
  return (
    <>
      <rect x="118" y="14" width="64" height="58" className="sanctuary-drawing-window" />
      <g className="sanctuary-drawing-rain">
        <line x1="128" y1="18" x2="124" y2="34" />
        <line x1="146" y1="24" x2="142" y2="40" />
        <line x1="164" y1="16" x2="160" y2="32" />
        <line x1="172" y1="40" x2="168" y2="56" />
        <line x1="136" y1="46" x2="132" y2="62" />
        <line x1="154" y1="50" x2="150" y2="66" />
      </g>
      <g className="sanctuary-drawing-blind">
        <line x1="118" y1="22" x2="182" y2="22" />
        <line x1="118" y1="30" x2="182" y2="30" />
        <line x1="118" y1="38" x2="182" y2="38" />
        <line x1="118" y1="46" x2="182" y2="46" />
        <line x1="118" y1="54" x2="182" y2="54" />
        <line x1="118" y1="62" x2="182" y2="62" />
      </g>
      {installedUpgradeIdentifiers.has('cork_board_wall') ? (
        <g className="sanctuary-drawing-upgrade">
          <rect x="16" y="16" width="86" height="50" className="sanctuary-drawing-cork" />
          <rect x="24" y="24" width="14" height="18" className="sanctuary-drawing-paper" />
          <rect x="48" y="30" width="18" height="12" className="sanctuary-drawing-paper" />
          <rect x="76" y="22" width="14" height="16" className="sanctuary-drawing-paper" />
          <polyline points="31,28 57,34 83,27 60,56" className="sanctuary-drawing-thread" />
        </g>
      ) : null}
      <polygon points="52,52 22,104 96,104" className={`sanctuary-drawing-lamp-beam ${lampIgnitionVariantName}`} />
      <g className="sanctuary-drawing-ink">
        <line x1="10" y1="104" x2="150" y2="104" />
        <line x1="20" y1="104" x2="20" y2="124" />
        <line x1="140" y1="104" x2="140" y2="124" />
        <polyline points="78,104 78,70 56,48" />
        <polygon points="44,44 62,40 60,56 46,54" className="sanctuary-drawing-solid" />
        <rect x="96" y="90" width="34" height="14" />
        <line x1="100" y1="90" x2="104" y2="82" />
        <line x1="126" y1="90" x2="122" y2="82" />
        <line x1="104" y1="82" x2="122" y2="82" />
      </g>
      <rect x="30" y="98" width="30" height="6" className="sanctuary-drawing-paper" />
      {installedUpgradeIdentifiers.has('secure_telephone_line') ? (
        <g className="sanctuary-drawing-upgrade sanctuary-drawing-ink">
          <rect x="62" y="94" width="14" height="10" className="sanctuary-drawing-solid" />
          <path d="M60 94 q9 -9 18 0" />
          <path d="M76 100 q10 8 4 24" />
        </g>
      ) : null}
    </>
  )
}

function ArchiveRoomDrawing({ installedUpgradeIdentifiers }: Pick<SanctuaryRoomIllustrationProperties, 'installedUpgradeIdentifiers'>) {
  return (
    <>
      <g className="sanctuary-drawing-ink">
        <line x1="10" y1="120" x2="190" y2="120" />
        <line x1="112" y1="30" x2="188" y2="30" />
        <line x1="112" y1="62" x2="188" y2="62" />
        <line x1="120" y1="30" x2="120" y2="120" />
        <line x1="182" y1="30" x2="182" y2="120" />
        <rect x="126" y="40" width="8" height="22" />
        <rect x="136" y="36" width="10" height="26" />
        <rect x="148" y="44" width="7" height="18" />
        <rect x="160" y="38" width="12" height="24" />
        <rect x="126" y="76" width="22" height="16" />
        <rect x="152" y="70" width="9" height="22" />
        <line x1="112" y1="92" x2="188" y2="92" />
      </g>
      {installedUpgradeIdentifiers.has('locking_filing_cabinet') ? (
        <g className="sanctuary-drawing-upgrade sanctuary-drawing-ink">
          <rect x="30" y="36" width="54" height="84" className="sanctuary-drawing-solid" />
          <line x1="30" y1="57" x2="84" y2="57" />
          <line x1="30" y1="78" x2="84" y2="78" />
          <line x1="30" y1="99" x2="84" y2="99" />
          <line x1="50" y1="46" x2="64" y2="46" />
          <line x1="50" y1="67" x2="64" y2="67" />
          <line x1="50" y1="88" x2="64" y2="88" />
          <line x1="50" y1="109" x2="64" y2="109" />
          <circle cx="76" cy="42" r="2.4" className="sanctuary-drawing-lamp-fill" />
        </g>
      ) : (
        <g className="sanctuary-drawing-ink">
          <rect x="24" y="92" width="44" height="28" />
          <rect x="34" y="66" width="44" height="26" />
          <line x1="24" y1="100" x2="68" y2="100" />
          <line x1="34" y1="74" x2="78" y2="74" />
          <rect x="40" y="58" width="18" height="8" className="sanctuary-drawing-paper" />
          <rect x="70" y="112" width="20" height="8" className="sanctuary-drawing-paper" />
        </g>
      )}
    </>
  )
}

function WorkshopRoomDrawing({ installedUpgradeIdentifiers }: Pick<SanctuaryRoomIllustrationProperties, 'installedUpgradeIdentifiers'>) {
  return (
    <>
      <g className="sanctuary-drawing-ink">
        <line x1="10" y1="120" x2="190" y2="120" />
        <line x1="100" y1="10" x2="100" y2="26" />
        <polygon points="90,26 110,26 116,38 84,38" className="sanctuary-drawing-solid" />
      </g>
      <polygon points="84,38 116,38 140,120 60,120" className="sanctuary-drawing-lamp-beam slow_warm_ignition" />
      {installedUpgradeIdentifiers.has('work_bench') ? (
        <g className="sanctuary-drawing-upgrade sanctuary-drawing-ink">
          <rect x="18" y="80" width="92" height="8" className="sanctuary-drawing-solid" />
          <line x1="24" y1="88" x2="24" y2="120" />
          <line x1="104" y1="88" x2="104" y2="120" />
          <line x1="24" y1="106" x2="104" y2="106" />
          <rect x="84" y="68" width="16" height="12" />
          <line x1="92" y1="68" x2="92" y2="60" />
          <line x1="86" y1="60" x2="98" y2="60" />
          <line x1="34" y1="80" x2="46" y2="62" />
          <circle cx="48" cy="60" r="5" />
        </g>
      ) : (
        <g className="sanctuary-drawing-ink">
          <line x1="28" y1="84" x2="108" y2="84" />
          <line x1="36" y1="84" x2="36" y2="120" />
          <line x1="100" y1="84" x2="100" y2="120" />
          <ellipse cx="56" cy="80" rx="12" ry="3" />
          <rect x="76" y="72" width="10" height="12" />
        </g>
      )}
      <g className="sanctuary-drawing-ink">
        <rect x="140" y="34" width="40" height="86" />
        <line x1="174" y1="76" x2="174" y2="84" />
      </g>
      {installedUpgradeIdentifiers.has('photographic_darkroom') ? (
        <g className="sanctuary-drawing-upgrade">
          <rect x="143" y="37" width="34" height="80" className="sanctuary-drawing-darkroom-glow" />
          <circle cx="160" cy="26" r="4" className="sanctuary-drawing-darkroom-bulb" />
        </g>
      ) : null}
    </>
  )
}

function BedroomRoomDrawing({ installedUpgradeIdentifiers }: Pick<SanctuaryRoomIllustrationProperties, 'installedUpgradeIdentifiers'>) {
  const hasReinforcedLock = installedUpgradeIdentifiers.has('reinforced_door_lock')
  return (
    <>
      <rect x="20" y="16" width="52" height="48" className="sanctuary-drawing-window" />
      <g className="sanctuary-drawing-blind">
        <line x1="20" y1="24" x2="72" y2="24" />
        <line x1="20" y1="32" x2="72" y2="32" />
        <line x1="20" y1="40" x2="72" y2="40" />
        <line x1="20" y1="48" x2="72" y2="48" />
        {hasReinforcedLock ? (
          <>
            <line x1="20" y1="56" x2="72" y2="56" />
            <line x1="20" y1="62" x2="72" y2="62" />
          </>
        ) : (
          <line x1="20" y1="57" x2="72" y2="52" />
        )}
      </g>
      <g className="sanctuary-drawing-ink">
        <line x1="10" y1="120" x2="190" y2="120" />
        <rect x="16" y="92" width="98" height="16" />
        <line x1="16" y1="76" x2="16" y2="120" />
        <line x1="114" y1="92" x2="114" y2="120" />
        <rect x="22" y="84" width="26" height="8" className="sanctuary-drawing-paper" />
        <path d="M48 92 q30 -10 66 0" />
        <rect x="146" y="28" width="38" height="92" />
        <circle cx="152" cy="78" r="2" />
      </g>
      {hasReinforcedLock ? (
        <g className="sanctuary-drawing-upgrade sanctuary-drawing-ink">
          <rect x="148" y="62" width="10" height="8" className="sanctuary-drawing-solid" />
          <path d="M150 88 q8 8 16 0" />
          <circle cx="165" cy="48" r="2.5" className="sanctuary-drawing-lamp-fill" />
        </g>
      ) : null}
    </>
  )
}

function StorageRoomDrawing({ installedUpgradeIdentifiers }: Pick<SanctuaryRoomIllustrationProperties, 'installedUpgradeIdentifiers'>) {
  return (
    <>
      <g className="sanctuary-drawing-ink">
        <line x1="10" y1="120" x2="190" y2="120" />
        <polyline points="10,30 40,30 40,48 70,48 70,66 100,66 100,84 130,84 130,102 160,102 160,120" />
        <rect x="18" y="86" width="30" height="34" />
        <line x1="18" y1="98" x2="48" y2="98" />
        <rect x="54" y="100" width="24" height="20" />
        <path d="M86 120 v-18 q8 -8 16 0 v18" />
        <rect x="168" y="70" width="8" height="10" />
        <path d="M169 70 v-4 q3 -4 6 0 v4" />
      </g>
      {installedUpgradeIdentifiers.has('floor_safe') ? (
        <g className="sanctuary-drawing-upgrade sanctuary-drawing-ink">
          <rect x="106" y="98" width="26" height="22" className="sanctuary-drawing-solid" />
          <circle cx="119" cy="109" r="5" />
          <line x1="119" y1="104" x2="119" y2="109" />
          <line x1="100" y1="122" x2="138" y2="122" className="sanctuary-drawing-thread" />
        </g>
      ) : null}
    </>
  )
}

function ConstructionScaffoldDrawing({
  constructionProgress,
  constructionWorkVariantName,
}: {
  constructionProgress: number
  constructionWorkVariantName: ConstructionWorkVariantName
}) {
  return (
    <g className="sanctuary-drawing-scaffold">
      <rect x="0" y="0" width="200" height="130" className="sanctuary-drawing-scaffold-veil" />
      <line x1="34" y1="126" x2="34" y2="14" />
      <line x1="166" y1="126" x2="166" y2="14" />
      {constructionProgress >= 0.12 ? <line x1="26" y1="96" x2="174" y2="96" className="sanctuary-drawing-scaffold-plank" /> : null}
      {constructionProgress >= 0.25 ? (
        <>
          <line x1="34" y1="96" x2="100" y2="126" />
          <line x1="166" y1="96" x2="100" y2="126" />
        </>
      ) : null}
      {constructionProgress >= 0.4 ? <line x1="26" y1="64" x2="174" y2="64" className="sanctuary-drawing-scaffold-plank" /> : null}
      {constructionProgress >= 0.55 ? (
        <>
          <line x1="34" y1="64" x2="100" y2="96" />
          <line x1="166" y1="64" x2="100" y2="96" />
        </>
      ) : null}
      {constructionProgress >= 0.7 ? <line x1="26" y1="32" x2="174" y2="32" className="sanctuary-drawing-scaffold-plank" /> : null}
      {constructionProgress >= 0.85 ? (
        <>
          <line x1="34" y1="32" x2="100" y2="64" />
          <line x1="166" y1="32" x2="100" y2="64" />
        </>
      ) : null}
      <g className={`sanctuary-drawing-worker ${constructionWorkVariantName}`}>
        <line x1="100" y1="58" x2="118" y2="46" />
        <rect x="114" y="40" width="12" height="7" />
      </g>
      <g className={`sanctuary-drawing-work-sparks ${constructionWorkVariantName}`}>
        <circle cx="128" cy="56" r="1.6" />
        <circle cx="134" cy="50" r="1.2" />
        <circle cx="124" cy="62" r="1.4" />
      </g>
    </g>
  )
}

export function SanctuaryRoomIllustration({
  roomIdentifier,
  installedUpgradeIdentifiers,
  constructionProgress,
  lampIgnitionVariantName,
  constructionWorkVariantName,
}: SanctuaryRoomIllustrationProperties) {
  return (
    <svg viewBox="0 0 200 130" className="sanctuary-room-drawing" aria-hidden="true" focusable="false">
      {roomIdentifier === 'desk' ? (
        <DeskRoomDrawing
          installedUpgradeIdentifiers={installedUpgradeIdentifiers}
          lampIgnitionVariantName={lampIgnitionVariantName}
        />
      ) : null}
      {roomIdentifier === 'archive' ? <ArchiveRoomDrawing installedUpgradeIdentifiers={installedUpgradeIdentifiers} /> : null}
      {roomIdentifier === 'workshop' ? <WorkshopRoomDrawing installedUpgradeIdentifiers={installedUpgradeIdentifiers} /> : null}
      {roomIdentifier === 'bedroom' ? <BedroomRoomDrawing installedUpgradeIdentifiers={installedUpgradeIdentifiers} /> : null}
      {roomIdentifier === 'storage' ? <StorageRoomDrawing installedUpgradeIdentifiers={installedUpgradeIdentifiers} /> : null}
      {constructionProgress !== null ? (
        <ConstructionScaffoldDrawing
          constructionProgress={constructionProgress}
          constructionWorkVariantName={constructionWorkVariantName}
        />
      ) : null}
    </svg>
  )
}
