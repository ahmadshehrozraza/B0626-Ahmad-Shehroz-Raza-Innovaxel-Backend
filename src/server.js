import express from 'express'
import eventRoutes from './routes/eventRoutes.js'
import registrationRoutes from './routes/registrationRoutes.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Event Registration API'
  })
})

app.use('/api/events', eventRoutes)
app.use('/api/registrations', registrationRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})