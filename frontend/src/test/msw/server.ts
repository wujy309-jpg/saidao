import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** MSW 服务器实例，在 setup.ts 中 listen/close */
export const server = setupServer(...handlers)
