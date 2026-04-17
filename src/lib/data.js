import { supabase } from './supabase'

export function bucket(value) {
  if (value <= 33) return 'Disagree'
  if (value <= 66) return 'Neutral'
  return 'Agree'
}

export function bucketLabel(value) {
  if (value <= 15) return 'Strongly Disagree'
  if (value <= 33) return 'Disagree'
  if (value <= 45) return 'Lean Disagree'
  if (value <= 55) return 'Neutral'
  if (value <= 66) return 'Lean Agree'
  if (value <= 84) return 'Agree'
  return 'Strongly Agree'
}

export function calcResults(votes) {
  const total = votes.length
  if (total === 0) return { Disagree: 0, Neutral: 0, Agree: 0, total: 0 }
  const counts = { Disagree: 0, Neutral: 0, Agree: 0 }
  votes.forEach(v => counts[bucket(v.spectrum_value)]++)
  return {
    Disagree: Math.round((counts.Disagree / total) * 100),
    Neutral:  Math.round((counts.Neutral  / total) * 100),
    Agree:    Math.round((counts.Agree    / total) * 100),
    total,
  }
}

export function calcTruthGap(allResults, verifiedResults) {
  let maxGap = 0
  ;['Disagree', 'Neutral', 'Agree'].forEach(cat => {
    const gap = Math.abs((allResults[cat] || 0) - (verifiedResults[cat] || 0))
    if (gap > maxGap) maxGap = gap
  })
  return maxGap
}

export function calcChoiceResults(votes, options) {
  const total = votes.length
  if (total === 0) return { options: options.map(o => ({ label: o, count: 0, pct: 0 })), total: 0 }
  const counts = {}
  options.forEach(o => { counts[o] = 0 })
  votes.forEach(v => { if (v.choice_value && counts[v.choice_value] !== undefined) counts[v.choice_value]++ })
  return {
    options: options.map(o => ({ label: o, count: counts[o], pct: Math.round((counts[o] / total) * 100) })),
    total,
    winner: options.reduce((a, b) => counts[a] >= counts[b] ? a : b),
  }
}

export function calcChoiceTruthGap(allResults, verifiedResults) {
  if (!verifiedResults || verifiedResults.total === 0) return 0
  let maxGap = 0
  allResults.options.forEach((opt, i) => {
    const verOpt = verifiedResults.options[i]
    if (verOpt) {
      const gap = Math.abs(opt.pct - verOpt.pct)
      if (gap > maxGap) maxGap = gap
    }
  })
  return maxGap
}

// Ranked results have { label, avgRank, score } and are sorted by avgRank per set,
// so the sort order differs between all and verified. Match by label and compare
// the 0–100 score field (pct does not exist on ranked results).
export function calcRankedTruthGap(allResults, verifiedResults) {
  if (!verifiedResults || verifiedResults.total === 0) return 0
  const allByLabel = {}
  allResults.options.forEach(o => { allByLabel[o.label] = o.score })
  let maxGap = 0
  verifiedResults.options.forEach(verOpt => {
    const allScore = allByLabel[verOpt.label]
    if (allScore !== undefined) {
      const gap = Math.abs(allScore - verOpt.score)
      if (gap > maxGap) maxGap = gap
    }
  })
  return maxGap
}

export function calcRankedResults(votes, options) {
  const total = votes.length
  if (total === 0) return { options: options.map((o, i) => ({ label: o, avgRank: i + 1, score: 0 })), total: 0 }
  const rankSums = {}
  options.forEach(o => { rankSums[o] = 0 })
  votes.forEach(v => {
    if (Array.isArray(v.ranked_values)) {
      v.ranked_values.forEach((item, idx) => { if (rankSums[item] !== undefined) rankSums[item] += idx + 1 })
    }
  })
  const avgRanks = options.map(o => ({
    label: o,
    avgRank: rankSums[o] / total,
    score: Math.round(((options.length - (rankSums[o] / total)) / (options.length - 1)) * 100),
  }))
  return { options: avgRanks.sort((a, b) => a.avgRank - b.avgRank), total }
}

export async function fetchQuestions(category = null) {
  // Auto-archive questions older than 30 days that aren't featured — fire-and-forget
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  supabase
    .from('questions')
    .update({ archived: true })
    .lt('created_at', cutoff)
    .eq('featured', false)
    .eq('archived', false)
    .then(() => {})

  let query = supabase
    .from('questions')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false })
  if (category && category !== 'All') query = query.eq('category', category)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchQuestion(id) {
  const { data, error } = await supabase.from('questions').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function fetchVotesForQuestion(questionId) {
  const { data, error } = await supabase.from('votes').select('*').eq('question_id', questionId)
  if (error) throw error
  return data
}

export async function hasUserVoted(questionId, userId) {
  if (!userId) return false
  const { data } = await supabase.from('votes').select('id').eq('question_id', questionId).eq('user_id', userId).maybeSingle()
  return !!data
}

export async function submitVote({ questionId, userId, type, spectrumValue, reason, choiceValue, rankedValues, isVerified }) {
  const payload = { question_id: questionId, user_id: userId, is_verified: isVerified }
  if (type === 'statement') { payload.spectrum_value = spectrumValue; payload.reason = reason || null }
  else if (type === 'choice') { payload.choice_value = choiceValue }
  else if (type === 'ranked') { payload.ranked_values = rankedValues }
  const { data, error } = await supabase.from('votes').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function fetchTotalVoteCount() {
  const { count, error } = await supabase.from('votes').select('*', { count: 'exact', head: true })
  if (error) return 0
  return count || 0
}

export async function fetchFirstQuestionByType(type) {
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data
}

export async function fetchSuggestions({ limit = 20, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*, users(nickname, tier)')
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data || []
}

export async function submitSuggestion(text, userId) {
  const { data, error } = await supabase
    .from('suggestions')
    .insert({ text, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleUpvote(suggestionId, userId, hasUpvoted) {
  if (hasUpvoted) {
    const { error } = await supabase
      .from('suggestion_upvotes')
      .delete()
      .eq('suggestion_id', suggestionId)
      .eq('user_id', userId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('suggestion_upvotes')
      .insert({ suggestion_id: suggestionId, user_id: userId })
    if (error) throw error
  }
}

export async function fetchUserUpvotedIds(userId) {
  if (!userId) return new Set()
  const { data } = await supabase
    .from('suggestion_upvotes')
    .select('suggestion_id')
    .eq('user_id', userId)
  return new Set((data || []).map(r => r.suggestion_id))
}

export async function deleteSuggestion(suggestionId) {
  const { error } = await supabase.from('suggestions').delete().eq('id', suggestionId)
  if (error) throw error
}
