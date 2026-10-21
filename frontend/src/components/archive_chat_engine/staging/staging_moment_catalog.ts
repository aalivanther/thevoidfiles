import type { StagingIntensityName, StagingMomentName } from './staging_director'

export type StagingVariantDefinition = {
  variantName: string
  weight: number
  intensityName: StagingIntensityName
  cooldownTurnCount: number
  usesScreenShake: boolean
  usesScreenFlash: boolean
  isUnsettlingApparition: boolean
}

export type StagingMomentDefinition = {
  ignoresSceneTensionCeiling: boolean
  minimumTurnsBetweenStrongerThanSoberOccurrences: number
  soberDefaultVariantName: string
  variants: StagingVariantDefinition[]
}

function defineVariant(
  variantName: string,
  weight: number,
  intensityName: StagingIntensityName,
  cooldownTurnCount = 0,
  traits: Partial<Pick<StagingVariantDefinition, 'usesScreenShake' | 'usesScreenFlash' | 'isUnsettlingApparition'>> = {},
): StagingVariantDefinition {
  return {
    variantName,
    weight,
    intensityName,
    cooldownTurnCount,
    usesScreenShake: traits.usesScreenShake ?? false,
    usesScreenFlash: traits.usesScreenFlash ?? false,
    isUnsettlingApparition: traits.isUnsettlingApparition ?? false,
  }
}

export const stagingMomentCatalog: Record<StagingMomentName, StagingMomentDefinition> = {
  director_wait_weighing: {
    ignoresSceneTensionCeiling: false,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'steady_lamp',
    variants: [
      defineVariant('steady_lamp', 4, 'sober'),
      defineVariant('turning_pages', 4, 'sober'),
      defineVariant('pen_hovering', 3, 'sober'),
      defineVariant('flickering_lamp', 3, 'marked', 2),
      defineVariant('held_breath', 2, 'strong', 3),
    ],
  },
  director_wait_narrating: {
    ignoresSceneTensionCeiling: false,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'ink_loading',
    variants: [
      defineVariant('ink_loading', 4, 'sober'),
      defineVariant('typewriter_carriage', 4, 'sober'),
      defineVariant('blotting_paper', 3, 'sober'),
      defineVariant('hurried_scrawl', 3, 'marked', 2),
      defineVariant('trembling_nib', 2, 'strong', 3),
    ],
  },
  consequence_receipt_entrance: {
    ignoresSceneTensionCeiling: false,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'filed_from_left',
    variants: [
      defineVariant('filed_from_left', 4, 'sober'),
      defineVariant('dropped_on_desk', 4, 'sober'),
      defineVariant('unfolded_slip', 3, 'sober'),
      defineVariant('stamped_slip', 3, 'marked', 1),
      defineVariant('torn_in_slip', 2, 'strong', 3),
    ],
  },
  relationship_pulse_entrance: {
    ignoresSceneTensionCeiling: false,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'quiet_underline',
    variants: [
      defineVariant('quiet_underline', 4, 'sober'),
      defineVariant('margin_note', 4, 'sober'),
      defineVariant('pinned_card', 3, 'sober'),
      defineVariant('inked_arrow', 3, 'marked', 1),
      defineVariant('struck_seal', 2, 'strong', 3),
    ],
  },
  attack_received: {
    ignoresSceneTensionCeiling: false,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'still_impact_mark',
    variants: [
      defineVariant('still_impact_mark', 2, 'sober'),
      defineVariant('side_splatter', 4, 'marked', 1),
      defineVariant('dry_blow', 3, 'marked', 1, { usesScreenShake: true }),
      defineVariant('cracked_panel', 4, 'strong', 2, { usesScreenShake: true, usesScreenFlash: true }),
    ],
  },
  attack_delivered: {
    ignoresSceneTensionCeiling: false,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'still_ink_stroke',
    variants: [
      defineVariant('still_ink_stroke', 2, 'sober'),
      defineVariant('diagonal_stroke', 4, 'marked'),
      defineVariant('three_short_strokes', 4, 'marked'),
      defineVariant('ink_sweep', 3, 'strong', 2),
    ],
  },
  critical_failure: {
    ignoresSceneTensionCeiling: true,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'still_failure_stamp',
    variants: [
      defineVariant('still_failure_stamp', 1, 'sober'),
      defineVariant('forked_crack', 4, 'strong', 1, { usesScreenFlash: true }),
      defineVariant('descending_crack', 4, 'strong', 1, { usesScreenFlash: true }),
      defineVariant('radial_crack', 3, 'strong', 1, { usesScreenFlash: true }),
    ],
  },
  mental_attack: {
    ignoresSceneTensionCeiling: true,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 3,
    soberDefaultVariantName: 'steady_arcane_outline',
    variants: [
      defineVariant('steady_arcane_outline', 1, 'sober'),
      defineVariant('rewritten_memory', 4, 'marked', 3, { isUnsettlingApparition: true }),
      defineVariant('lying_clock', 4, 'marked', 3, { isUnsettlingApparition: true }),
      defineVariant('returning_echo', 3, 'marked', 3, { isUnsettlingApparition: true }),
    ],
  },
  anomaly_manifested: {
    ignoresSceneTensionCeiling: false,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'arcane_margin_bleed',
    variants: [
      defineVariant('arcane_margin_bleed', 3, 'sober'),
      defineVariant('cold_corner_glyphs', 3, 'sober', 1),
      defineVariant('watching_eyes_pair', 4, 'marked', 2, { isUnsettlingApparition: true }),
      defineVariant('screen_tear_bands', 3, 'strong', 3, { usesScreenFlash: true, isUnsettlingApparition: true }),
      defineVariant('many_eyes_blink', 2, 'strong', 4, { isUnsettlingApparition: true }),
    ],
  },
  scene_changed: {
    ignoresSceneTensionCeiling: false,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'plain_place_caption',
    variants: [
      defineVariant('plain_place_caption', 3, 'sober'),
      defineVariant('sliding_place_caption', 4, 'sober'),
      defineVariant('slanted_place_band', 4, 'marked', 1),
      defineVariant('stamped_place_card', 3, 'marked', 2),
    ],
  },
  tension_rose: {
    ignoresSceneTensionCeiling: false,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'thin_warning_line',
    variants: [
      defineVariant('thin_warning_line', 2, 'sober'),
      defineVariant('heartbeat_vignette', 4, 'marked', 2),
      defineVariant('tightening_frame', 4, 'marked', 2),
      defineVariant('cold_breath_line', 3, 'marked', 2),
    ],
  },
  physical_death: {
    ignoresSceneTensionCeiling: true,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'static_closure_plate',
    variants: [
      defineVariant('static_closure_plate', 0, 'sober'),
      defineVariant('cracks_from_left_margin', 4, 'strong', 0, { usesScreenShake: true }),
      defineVariant('cracks_from_right_margin', 4, 'strong', 0, { usesScreenShake: true }),
      defineVariant('cracks_from_upper_edge', 3, 'strong', 0, { usesScreenShake: true }),
    ],
  },
  psychological_death: {
    ignoresSceneTensionCeiling: true,
    minimumTurnsBetweenStrongerThanSoberOccurrences: 0,
    soberDefaultVariantName: 'static_closure_plate',
    variants: [
      defineVariant('static_closure_plate', 0, 'sober'),
      defineVariant('ink_from_upper_edge', 4, 'strong'),
      defineVariant('ink_from_both_margins', 4, 'strong'),
      defineVariant('ink_in_scattered_blots', 3, 'strong'),
    ],
  },
}
