import { Router } from 'express'
import prisma from '../db.js'

const router = Router()



router.post('/', async (req, res) => {
  const { userName, eventId } = req.body

  if (!userName || !eventId) {
    return res.status(400).json({ error: 'userName and eventId are required' })
  }

  if (typeof userName !== 'string' || userName.trim() === '') {
    return res.status(400).json({ error: 'userName must be a non-empty string' })
  }

  const parsedEventId = parseInt(eventId)
  if (isNaN(parsedEventId)) {
    return res.status(400).json({ error: 'eventId must be a valid number' })
  }

  try {
    const registration = await prisma.$transaction(async (tx) => {

      const event = await tx.event.findUnique({
        where: { id: parsedEventId }
      })

      if (!event) {
        throw new Error('EVENT_NOT_FOUND')
      }

      if (event.eventDate <= new Date()) {
        throw new Error('EVENT_PAST')
      }

      const existing = await tx.registration.findUnique({
        where: {
          userName_eventId: {
            userName: userName.trim(),
            eventId: parsedEventId
          }
        }
      })

      if (existing && existing.status === 'active') {
        throw new Error('ALREADY_REGISTERED')
      }

      if (existing && existing.status === 'cancelled') {
        const updatedEvent = await tx.event.updateMany({
          where: {
            id: parsedEventId,
            availableSeats: { gt: 0 }
          },
          data: { availableSeats: { decrement: 1 } }
        })

        if (updatedEvent.count === 0) {
          throw new Error('EVENT_FULL')
        }

        return await tx.registration.update({
          where: { id: existing.id },
          data: {
            status:       'active',
            registeredAt: new Date()
          }
        })
      }

      const updatedEvent = await tx.event.updateMany({
        where: {
          id: parsedEventId,
          availableSeats: { gt: 0 }
        },
        data: { availableSeats: { decrement: 1 } }
      })

      if (updatedEvent.count === 0) {
        throw new Error('EVENT_FULL')
      }

      return await tx.registration.create({
        data: {
          userName: userName.trim(),
          eventId:  parsedEventId,
        }
      })
    })

    return res.status(201).json(registration)

  } catch (error) {
    const errorMap = {
      EVENT_NOT_FOUND:    [404, 'Event not found'],
      EVENT_PAST:         [400, 'Cannot register for a past event'],
      EVENT_FULL:         [409, 'Event is fully booked'],
      ALREADY_REGISTERED: [409, 'User is already registered for this event'],
    }

    if (errorMap[error.message]) {
      const [status, message] = errorMap[error.message]
      return res.status(status).json({ error: message })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})



router.delete('/cancel', async (req, res) => {
  const userName = req.body.userName || req.query.userName
  const eventId  = req.body.eventId  || req.query.eventId

  if (!userName || !eventId) {
    return res.status(400).json({ error: 'userName and eventId are required' })
  }

  const parsedEventId = parseInt(eventId)
  if (isNaN(parsedEventId)) {
    return res.status(400).json({ error: 'eventId must be a valid number' })
  }

  try {
    await prisma.$transaction(async (tx) => {

      const registration = await tx.registration.findUnique({
        where: {
          userName_eventId: {
            userName: userName.trim(),
            eventId: parsedEventId
          }
        }
      })

      if (!registration) {
        throw new Error('NOT_FOUND')
      }

      if (registration.status === 'cancelled') {
        throw new Error('ALREADY_CANCELLED')
      }

      await tx.registration.update({
        where: { id: registration.id },
        data: { status: 'cancelled' }
      })

      await tx.event.update({
        where: { id: parsedEventId },
        data: { availableSeats: { increment: 1 } }
      })
    })

    return res.json({ message: 'Registration cancelled successfully' })

  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Registration not found' })
    }
    if (error.message === 'ALREADY_CANCELLED') {
      return res.status(409).json({ error: 'Registration is already cancelled' })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
})



router.get('/event/:eventId', async (req, res) => {
  const parsedEventId = parseInt(req.params.eventId)

  if (isNaN(parsedEventId)) {
    return res.status(400).json({ error: 'Invalid event ID' })
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: parsedEventId }
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const registrations = await prisma.registration.findMany({
      where: {
        eventId: parsedEventId,
        status:  'active'
      },
      orderBy: { registeredAt: 'asc' }
    })

    return res.json({
      eventId:       parsedEventId,
      eventName:     event.name,
      registrations,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router