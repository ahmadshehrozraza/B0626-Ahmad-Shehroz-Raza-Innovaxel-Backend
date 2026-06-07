import { Router } from 'express'
import prisma from '../db.js'

const router = Router()


router.post('/', async (req, res) => {
  const { name, totalSeats, eventDate } = req.body

  if (!name || !totalSeats || !eventDate) {
    return res.status(400).json({
      error: 'name, totalSeats, and eventDate are required'
    })
  }

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name must be a non-empty string' })
  }

  if (!Number.isInteger(totalSeats) || totalSeats <= 0) {
    return res.status(400).json({ error: 'totalSeats must be a positive integer' })
  }

  const date = new Date(eventDate)
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: 'eventDate is not a valid date' })
  }
  if (date <= new Date()) {
    return res.status(400).json({ error: 'eventDate must be in the future' })
  }

  try {
    const event = await prisma.event.create({
      data: {
        name: name.trim(),
        totalSeats,
        availableSeats: totalSeats,
        eventDate: date,
      },
    })
    return res.status(201).json(event)
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Event name already exists' })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
})


router.get('/', async (req, res) => {
  const { upcoming, sort } = req.query

  const where = upcoming === 'true'
    ? { eventDate: { gt: new Date() } }
    : {}

  const orderBy = sort === 'date'
    ? { eventDate: 'asc' }
    : { createdAt: 'desc' }

  try {
    const events = await prisma.event.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: {
            registrations: {
              where: { status: 'active' }
            }
          }
        }
      }
    })

    const formatted = events.map(event => ({
      id:                 event.id,
      name:               event.name,
      totalSeats:         event.totalSeats,
      availableSeats:     event.availableSeats,
      totalRegistrations: event._count.registrations,
      eventDate:          event.eventDate,
      createdAt:          event.createdAt,
    }))

    return res.json(formatted)
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})


router.get('/:id', async (req, res) => {
  const eventId = parseInt(req.params.id)

  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' })
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        registrations: {
          where: { status: 'active' },
          select: {
            id:           true,
            userName:     true,
            registeredAt: true,
            status:       true,
          }
        }
      }
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    return res.json({
      id:                  event.id,
      name:                event.name,
      totalSeats:          event.totalSeats,
      availableSeats:      event.availableSeats,
      totalRegistrations:  event.registrations.length,
      eventDate:           event.eventDate,
      createdAt:           event.createdAt,
      activeRegistrations: event.registrations,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})


router.put('/:id', async (req, res) => {
  const eventId = parseInt(req.params.id)
  const { name, totalSeats, eventDate } = req.body

  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' })
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const updateData = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'name must be a non-empty string' })
      }
      updateData.name = name.trim()
    }

    if (eventDate !== undefined) {
      const date = new Date(eventDate)
      if (isNaN(date.getTime()) || date <= new Date()) {
        return res.status(400).json({ error: 'eventDate must be a valid future date' })
      }
      updateData.eventDate = date
    }

    if (totalSeats !== undefined) {
      if (!Number.isInteger(totalSeats) || totalSeats <= 0) {
        return res.status(400).json({ error: 'totalSeats must be a positive integer' })
      }
      const diff = totalSeats - event.totalSeats
      updateData.totalSeats = totalSeats
      updateData.availableSeats = event.availableSeats + diff

      if (updateData.availableSeats < 0) {
        return res.status(409).json({
          error: 'Cannot reduce seats below current registrations'
        })
      }
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: updateData
    })

    return res.json(updated)

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Event name already exists' })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
})


router.delete('/:id', async (req, res) => {
  const eventId = parseInt(req.params.id)

  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' })
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    await prisma.$transaction([
      prisma.registration.deleteMany({
        where: { eventId }
      }),
      prisma.event.delete({
        where: { id: eventId }
      })
    ])

    return res.json({ message: 'Event deleted successfully' })

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router