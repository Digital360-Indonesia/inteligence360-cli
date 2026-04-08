import chalk from 'chalk'
import React, { useEffect, useState } from 'react'
import { Box, Text } from '../ink.js'

const NAVY = '#0a1f6e'
const NAVY_LIGHT = '#1e3a8a'
const DIM_TEXT = '#4a6fa5'

// "360" in big block ASCII art
const LOGO_360 = [
  '██████╗  ██████╗   ██████╗ ',
  '╚════██╗██╔════╝  ██╔═══██╗',
  ' █████╔╝███████╗  ██║   ██║',
  ' ╚═══██╗██╔═══██╗ ██║   ██║',
  '██████╔╝╚██████╔╝ ╚██████╔╝',
  '╚═════╝  ╚═════╝   ╚═════╝ ',
]

// Neon flicker: gold → bright-blue → gold → dim-gold → gold → blue-white ...
const FLICKER: string[] = [
  '#f5c842', // gold
  '#f5c842', // gold (hold)
  '#93c5fd', // soft blue
  '#f5c842', // gold
  '#bfa030', // dim gold (flicker dip)
  '#f5c842', // gold
  '#60a5fa', // bright blue
  '#f5c842', // gold
  '#f5c842', // gold (hold)
  '#38bdf8', // sky blue
  '#f5c842', // gold
  '#e8b800', // warm gold
]

// Interval between each flicker frame (ms)
const FLICKER_MS = 280

export function Intelligence360Banner(): React.ReactNode {
  const cols = process.stdout.columns ?? 80
  const [fi, setFi] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setFi(i => (i + 1) % FLICKER.length)
    }, FLICKER_MS)
    return () => clearInterval(id)
  }, [])

  const flickerColor = FLICKER[fi]!
  const borderLen = Math.min(cols - 2, 70)

  return (
    <Box flexDirection="column" marginBottom={1} marginTop={1}>
      {/* Top border */}
      <Text>{chalk.hex(NAVY_LIGHT)('▄'.repeat(borderLen))}</Text>

      {/* 360 block art + brand label side by side */}
      <Box flexDirection="row" paddingLeft={2} gap={4} alignItems="center">
        {/* Big "360" */}
        <Box flexDirection="column">
          {LOGO_360.map((line, i) => (
            <Text key={i}>{chalk.hex(NAVY).bold(line)}</Text>
          ))}
        </Box>

        {/* Brand label */}
        <Box flexDirection="column">
          <Text>{chalk.hex(NAVY_LIGHT).bold('Intelligence')}</Text>
          <Text>{chalk.hex(flickerColor).bold('360')}</Text>
          <Text> </Text>
          <Text>{chalk.hex(DIM_TEXT)('Multi-model AI assistant')}</Text>
          <Text>{chalk.hex(DIM_TEXT)('v1.0.0')}</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Box paddingLeft={2} marginTop={1}>
        <Text>{chalk.hex(NAVY_LIGHT)('─'.repeat(Math.min(cols - 6, 60)))}</Text>
      </Box>

      {/* Hints */}
      <Box flexDirection="row" paddingLeft={2} gap={4}>
        <Text>{chalk.hex(DIM_TEXT)('/model')}<Text dimColor> — switch AI model</Text></Text>
        <Text>{chalk.hex(DIM_TEXT)('/help')}<Text dimColor> — show commands</Text></Text>
        <Text>{chalk.hex(DIM_TEXT)('Esc')}<Text dimColor> — cancel</Text></Text>
      </Box>

      {/* Bottom border */}
      <Box marginTop={1}>
        <Text>{chalk.hex(NAVY_LIGHT)('▀'.repeat(borderLen))}</Text>
      </Box>
    </Box>
  )
}
