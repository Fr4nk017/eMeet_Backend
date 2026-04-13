import { Router } from 'express'
import { createAnonClient } from '../lib/supabase'
import { badRequest, serverError } from '../utils/http'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    return badRequest(res, 'Email y contraseña son obligatorios.')
  }

  const supabase = createAnonClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return badRequest(res, error.message)
  }

  return res.json({ user: data.user, session: data.session })
})

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string }

  if (!name || !email || !password) {
    return badRequest(res, 'Nombre, email y contraseña son obligatorios.')
  }

  if (password.length < 6) {
    return badRequest(res, 'La contraseña debe tener al menos 6 caracteres.')
  }

  const supabase = createAnonClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) {
    return badRequest(res, error.message)
  }

  return res.status(201).json({ user: data.user, session: data.session })
})

router.post('/logout', async (req, res) => {
  const rawAuth = req.headers.authorization
  const token = rawAuth?.startsWith('Bearer ') ? rawAuth.slice(7) : undefined

  const supabase = createAnonClient(token)
  const { error } = await supabase.auth.signOut()

  if (error) {
    return serverError(res, error.message)
  }

  return res.status(204).send()
})

router.get('/session', async (req, res) => {
  const rawAuth = req.headers.authorization
  const token = rawAuth?.startsWith('Bearer ') ? rawAuth.slice(7) : undefined

  if (!token) {
    return res.json({ session: null })
  }

  const supabase = createAnonClient(token)
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    return serverError(res, error.message)
  }

  return res.json({ session: data.session })
})

export default router
