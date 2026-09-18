import type { Block } from '../codec/types'
import { Barcode } from './nodes/Barcode'
import { Box } from './nodes/Box'
import { Icon } from './nodes/Icon'
import { Image } from './nodes/Image'
import { Pokemon } from './nodes/Pokemon'
import { Qr } from './nodes/Qr'
import { Rule } from './nodes/Rule'
import { Text } from './nodes/Text'

export function renderBlock(block: Block, width: number, height: number | undefined) {
  switch (block.t) {
    case 't':
      return <Text block={block} />
    case 'r':
      return <Rule block={block} width={width} />
    case 'b':
      return <Box block={block} width={width} height={height} />
    case 'q':
      return <Qr block={block} />
    case 'c':
      return <Barcode block={block} />
    case 'i':
      return <Image block={block} height={height} />
    case 'p':
      return <Pokemon block={block} />
    case 'k':
      return <Icon block={block} height={height} />
  }
}
