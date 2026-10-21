import { investigatorProfileCopy as realCopy } from '../../copy/investigator_profile_copy'
import { adaptCopyToNamelessInvestigator } from '../nameless_investigator_wording'

export const investigatorProfileCopy = adaptCopyToNamelessInvestigator(realCopy)
