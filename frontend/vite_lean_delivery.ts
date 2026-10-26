import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

type SyntaxNode = { type: string; start: number; end: number; [property: string]: unknown }

const phosphorPackageName = '@phosphor-icons/react'
const everyPhosphorWeight = 'every_weight'
const defaultPhosphorWeight = 'regular'
const phosphorDefinitionModulePattern = /[\\/]@phosphor-icons[\\/]react[\\/]dist[\\/]defs[\\/]([A-Za-z0-9]+)\.es\.js$/
const phosphorNamedImportPattern = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]@phosphor-icons\/react['"]/g
const conditionalWeightPattern = /^[^'"`?:]+\?\s*(['"])(\w+)\1\s*:\s*(['"])(\w+)\3$/
const startupScreenModulePattern = /[\\/]src[\\/]components[\\/]TitleScreen\.tsx$/

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((directoryEntry) => {
    const entryPath = path.join(directory, directoryEntry.name)
    if (directoryEntry.isDirectory()) {
      return listSourceFiles(entryPath)
    }
    return /\.(ts|tsx)$/.test(directoryEntry.name) ? [entryPath] : []
  })
}

function readBalancedBraces(sourceText: string, openingBraceIndex: number): string {
  let braceDepth = 0
  for (let characterIndex = openingBraceIndex; characterIndex < sourceText.length; characterIndex += 1) {
    const character = sourceText[characterIndex]
    if (character === '{') {
      braceDepth += 1
    } else if (character === '}') {
      braceDepth -= 1
      if (braceDepth === 0) {
        return sourceText.slice(openingBraceIndex + 1, characterIndex)
      }
    }
  }
  return sourceText.slice(openingBraceIndex + 1)
}

function readJsxOpeningTagAttributes(sourceText: string, attributesStartIndex: number): string {
  let braceDepth = 0
  let openQuote: string | null = null
  for (let characterIndex = attributesStartIndex; characterIndex < sourceText.length; characterIndex += 1) {
    const character = sourceText[characterIndex]
    if (openQuote) {
      if (character === openQuote) {
        openQuote = null
      }
    } else if (braceDepth === 0 && (character === '"' || character === "'")) {
      openQuote = character
    } else if (character === '{') {
      braceDepth += 1
    } else if (character === '}') {
      braceDepth -= 1
    } else if (character === '>' && braceDepth === 0) {
      return sourceText.slice(attributesStartIndex, characterIndex)
    }
  }
  return sourceText.slice(attributesStartIndex)
}

function hasSpreadAttribute(attributesText: string): boolean {
  let braceDepth = 0
  for (let characterIndex = 0; characterIndex < attributesText.length; characterIndex += 1) {
    const character = attributesText[characterIndex]
    if (character === '{') {
      if (braceDepth === 0 && attributesText.slice(characterIndex + 1).trimStart().startsWith('...')) {
        return true
      }
      braceDepth += 1
    } else if (character === '}') {
      braceDepth -= 1
    }
  }
  return false
}

function readRenderedWeights(attributesText: string): string[] {
  if (hasSpreadAttribute(attributesText)) {
    return [everyPhosphorWeight]
  }
  const literalWeight = /(^|\s)weight=(["'])(\w+)\2/.exec(attributesText)
  if (literalWeight) {
    return [literalWeight[3]]
  }
  const expressionWeight = /(^|\s)weight=\{/.exec(attributesText)
  if (!expressionWeight) {
    return [defaultPhosphorWeight]
  }
  const weightExpression = readBalancedBraces(attributesText, expressionWeight.index + expressionWeight[0].length - 1).trim()
  const singleLiteral = /^(['"])(\w+)\1$/.exec(weightExpression)
  if (singleLiteral) {
    return [singleLiteral[2]]
  }
  const conditionalLiterals = conditionalWeightPattern.exec(weightExpression)
  return conditionalLiterals ? [conditionalLiterals[2], conditionalLiterals[4]] : [everyPhosphorWeight]
}

function resolveDefinitionName(importedName: string, definitionDirectory: string): string | null {
  for (const candidateName of [importedName, importedName.replace(/Icon$/, '')]) {
    if (candidateName && existsSync(path.join(definitionDirectory, `${candidateName}.es.js`))) {
      return candidateName
    }
  }
  return null
}

function collectRenderedPhosphorWeights(
  sourceDirectory: string,
  definitionDirectory: string,
): Map<string, Set<string>> | null {
  const renderedWeightsByDefinitionName = new Map<string, Set<string>>()
  for (const sourceFile of listSourceFiles(sourceDirectory)) {
    const sourceText = readFileSync(sourceFile, 'utf-8')
    if (!sourceText.includes(phosphorPackageName)) {
      continue
    }
    const namedImports = [...sourceText.matchAll(phosphorNamedImportPattern)]
    const everyPhosphorImportCount = sourceText.split(phosphorPackageName).length - 1
    if (namedImports.length !== everyPhosphorImportCount) {
      return null
    }
    let sourceTextWithoutImports = sourceText
    const localNameToDefinitionName = new Map<string, string>()
    for (const namedImport of namedImports) {
      sourceTextWithoutImports = sourceTextWithoutImports.replace(namedImport[0], '')
      if (namedImport[1]) {
        continue
      }
      for (const importSpecifier of namedImport[2].split(',').map((specifierText) => specifierText.trim())) {
        if (!importSpecifier || importSpecifier.startsWith('type ')) {
          continue
        }
        const [importedName, localName = importedName] = importSpecifier.split(/\s+as\s+/).map((name) => name.trim())
        if (importedName === 'IconContext' || importedName === 'IconBase') {
          return null
        }
        const definitionName = resolveDefinitionName(importedName, definitionDirectory)
        if (definitionName) {
          localNameToDefinitionName.set(localName, definitionName)
        }
      }
    }
    for (const [localName, definitionName] of localNameToDefinitionName) {
      const renderedWeights = renderedWeightsByDefinitionName.get(definitionName) ?? new Set<string>()
      renderedWeightsByDefinitionName.set(definitionName, renderedWeights)
      for (const usage of sourceTextWithoutImports.matchAll(new RegExp(`(<\\/|<)?\\b${localName}\\b`, 'g'))) {
        if (usage[1] === '</') {
          continue
        }
        const weights =
          usage[1] === '<'
            ? readRenderedWeights(readJsxOpeningTagAttributes(sourceTextWithoutImports, usage.index + usage[0].length))
            : [everyPhosphorWeight]
        weights.forEach((weight) => renderedWeights.add(weight))
      }
    }
  }
  return renderedWeightsByDefinitionName
}

function findWeightMapEntries(syntaxNode: unknown): SyntaxNode[] | null {
  if (!syntaxNode || typeof syntaxNode !== 'object') {
    return null
  }
  const candidateNode = syntaxNode as SyntaxNode
  if (Array.isArray(syntaxNode)) {
    for (const childNode of syntaxNode) {
      const foundEntries = findWeightMapEntries(childNode)
      if (foundEntries) {
        return foundEntries
      }
    }
    return null
  }
  const callee = candidateNode.callee as SyntaxNode | undefined
  const constructorArguments = candidateNode.arguments as SyntaxNode[] | undefined
  if (
    candidateNode.type === 'NewExpression' &&
    callee?.type === 'Identifier' &&
    callee.name === 'Map' &&
    constructorArguments?.[0]?.type === 'ArrayExpression'
  ) {
    return constructorArguments[0].elements as SyntaxNode[]
  }
  for (const [propertyName, childNode] of Object.entries(candidateNode)) {
    if (propertyName !== 'type' && propertyName !== 'start' && propertyName !== 'end') {
      const foundEntries = findWeightMapEntries(childNode)
      if (foundEntries) {
        return foundEntries
      }
    }
  }
  return null
}

export function keepOnlyRenderedPhosphorWeights(frontendRootDirectory: string): Plugin {
  const definitionDirectory = path.join(frontendRootDirectory, 'node_modules', phosphorPackageName, 'dist', 'defs')
  let renderedWeightsByDefinitionName: Map<string, Set<string>> | null = null
  return {
    name: 'the-void-files-rendered-phosphor-weights',
    apply: 'build',
    buildStart() {
      renderedWeightsByDefinitionName = collectRenderedPhosphorWeights(
        path.join(frontendRootDirectory, 'src'),
        definitionDirectory,
      )
    },
    transform(code, id) {
      const definitionMatch = phosphorDefinitionModulePattern.exec(id.split('?')[0])
      const renderedWeights = definitionMatch ? renderedWeightsByDefinitionName?.get(definitionMatch[1]) : undefined
      if (!renderedWeights || renderedWeights.size === 0 || renderedWeights.has(everyPhosphorWeight)) {
        return null
      }
      const weightEntries = findWeightMapEntries(this.parse(code))
      if (!weightEntries || weightEntries.length === 0) {
        return null
      }
      const readEntryWeight = (weightEntry: SyntaxNode) => {
        const weightLiteral = (weightEntry.elements as SyntaxNode[] | undefined)?.[0]
        return typeof weightLiteral?.value === 'string' ? weightLiteral.value : null
      }
      if (weightEntries.some((weightEntry) => readEntryWeight(weightEntry) === null)) {
        return null
      }
      const keptEntries = weightEntries.filter((weightEntry) => renderedWeights.has(readEntryWeight(weightEntry) as string))
      const firstEntry = weightEntries[0]
      const lastEntry = weightEntries[weightEntries.length - 1]
      return {
        code: `${code.slice(0, firstEntry.start)}${keptEntries.map((weightEntry) => code.slice(weightEntry.start, weightEntry.end)).join(',\n  ')}${code.slice(lastEntry.end)}`,
        map: null,
      }
    },
  }
}

export function preloadStartupScreenModules(): Plugin {
  let publicBasePath = '/'
  return {
    name: 'the-void-files-startup-screen-modules',
    apply: 'build',
    configResolved(resolvedConfig) {
      publicBasePath = resolvedConfig.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        if (!bundle) {
          return
        }
        const bundleOutputs = Object.values(bundle)
        const entryChunk = bundleOutputs.find((bundleOutput) => bundleOutput.type === 'chunk' && bundleOutput.isEntry)
        const startupScreenChunk = bundleOutputs.find(
          (bundleOutput) =>
            bundleOutput.type === 'chunk' &&
            bundleOutput.facadeModuleId !== null &&
            startupScreenModulePattern.test(bundleOutput.facadeModuleId),
        )
        const filesAlreadyRequestedByEntry = new Set(
          entryChunk?.type === 'chunk' ? [entryChunk.fileName, ...entryChunk.imports] : [],
        )
        const startupScreenFiles =
          startupScreenChunk?.type === 'chunk'
            ? [startupScreenChunk.fileName, ...startupScreenChunk.imports].filter(
                (fileName) => !filesAlreadyRequestedByEntry.has(fileName),
              )
            : []
        return startupScreenFiles.map((fileName) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: true, href: `${publicBasePath}${fileName}` },
          injectTo: 'head' as const,
        }))
      },
    },
  }
}
