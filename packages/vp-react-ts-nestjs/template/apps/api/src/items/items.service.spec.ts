import 'reflect-metadata'

import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vite-plus/test'

import { ItemsService } from './items.service'

// Building the module through Nest's DI container is the real proof that decorator metadata is being
// emitted by vite-plus's Oxc transform — without it, `Test.createTestingModule(...).compile()` would throw.
describe('ItemsService', () => {
  let service: ItemsService

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [ItemsService] }).compile()
    service = moduleRef.get(ItemsService)
  })

  it('creates and lists items', () => {
    const created = service.create({ name: 'first' })
    expect(created.id).toBeTruthy()
    expect(service.findAll()).toHaveLength(1)
    expect(service.findOne(created.id)).toEqual(created)
  })

  it('throws for an unknown id', () => {
    expect(() => service.findOne('nope')).toThrow()
  })
})
