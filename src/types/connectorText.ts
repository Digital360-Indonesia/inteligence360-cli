// Stub for connector text types (internal Anthropic feature, not available externally)
export type ConnectorTextBlock = {
  type: 'connector_text'
  text: string
}

export type ConnectorTextDelta = {
  type: 'connector_text_delta'
  text: string
}

export function isConnectorTextBlock(block: unknown): block is ConnectorTextBlock {
  return typeof block === 'object' && block !== null && (block as ConnectorTextBlock).type === 'connector_text'
}
