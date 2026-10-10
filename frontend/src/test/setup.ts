import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { server } from './msw/server'

afterEach(() => cleanup())

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
