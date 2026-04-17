import { Router } from 'express'
import { withAuth } from '../middleware/auth'
import { createServiceRoleClient } from '../lib/supabase'
import { serverError } from '../utils/http'
import type { User } from '@supabase/supabase-js'

const router = Router()

function readRoleBucket(value: unknown): 'admin' | 'locatario' | 'user' | undefined {
  if (!value || typeof value !== 'object') return undefined
  const role = (value as { role?: unknown }).role
  if (role === 'admin' || role === 'locatario' || role === 'user') {
    return role
  }
  return undefined
}

function extractRole(user: User | null | undefined): 'admin' | 'locatario' | 'user' | undefined {
  if (!user) return undefined

  const appRole = readRoleBucket(user.app_metadata)
  if (appRole) return appRole

  const userRole = readRoleBucket(user.user_metadata)
  if (userRole) return userRole

  return undefined
}

router.get('/stats', withAuth, async (req, res) => {
  const role = extractRole(req.authUser)
  if (role !== 'admin') {
    return res.status(403).json({ error: 'No tienes permisos de administrador.' })
  }

  const supabase = createServiceRoleClient()

  const [
    profilesCountResult,
    locatarioEventsCountResult,
    communitiesCountResult,
    likesCountResult,
    savesCountResult,
    messagesCountResult,
    recentProfilesResult,
    recentEventsResult,
    recentCommunitiesResult,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('locatario_events').select('id', { count: 'exact', head: true }),
    supabase.from('chat_rooms').select('id', { count: 'exact', head: true }),
    supabase.from('user_events').select('id', { count: 'exact', head: true }).eq('action', 'like'),
    supabase.from('user_events').select('id', { count: 'exact', head: true }).eq('action', 'save'),
    supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, name, created_at').order('created_at', { ascending: false }).limit(6),
    supabase
      .from('locatario_events')
      .select('id, title, category, address, created_at, organizer_name')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('chat_rooms')
      .select('id, event_title, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  if (
    profilesCountResult.error ||
    locatarioEventsCountResult.error ||
    communitiesCountResult.error ||
    likesCountResult.error ||
    savesCountResult.error ||
    messagesCountResult.error ||
    recentProfilesResult.error ||
    recentEventsResult.error ||
    recentCommunitiesResult.error
  ) {
    return serverError(res, 'No se pudieron obtener las estadísticas de administración.')
  }

  return res.json({
    kpis: {
      totalProfiles: profilesCountResult.count ?? 0,
      locatariosWithEvents: locatarioEventsCountResult.count ?? 0,
      totalEvents: locatarioEventsCountResult.count ?? 0,
      totalCommunities: communitiesCountResult.count ?? 0,
      totalLikes: likesCountResult.count ?? 0,
      totalSaves: savesCountResult.count ?? 0,
      totalMessages: messagesCountResult.count ?? 0,
    },
    recentProfiles: recentProfilesResult.data ?? [],
    recentEvents: recentEventsResult.data ?? [],
    recentCommunities: recentCommunitiesResult.data ?? [],
  })
})

export default router
