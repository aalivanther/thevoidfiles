export const consequenceLineTickVariantNames = ['ink_pressed', 'pen_check_drawn', 'margin_slide'] as const

export type ConsequenceLineTickVariantName = (typeof consequenceLineTickVariantNames)[number]
