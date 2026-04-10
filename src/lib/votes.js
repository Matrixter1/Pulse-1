import { supabase } from './supabase'

export function bucket(value) {
  if (value <= 33) return 'Disagree'
  if (value <= 66) return 'Neutral'
  return 'Agree'
}

export function calcResults(votes) {
  const total = votes.length
  if (total === 0) return { Disagree: 0, Neutral: 0, Agree: 0, total: 0 }
  const counts = { Disagree: 0, Neutral: 0, Agree: 0 }
  votes.forEach(v => counts[bucket(v.spectrum_value)]++)
  return {
    Disagree: Math.round((counts.Disagree / total) * 100),
    Neutral: Math.round((counts.Neutral / total) * 100),
    Agree: Math.round((counts.Agree / total) * 100),
    total,
  }
}

export function calcTruthGap(allResults, verifiedResults) {
  const categories = ['Disagree', 'Neutral', 'Agree']
  let maxGap = 0
  categories.forEach(cat => {
    const gap = Math.abs((allResults[cat] || 0) - (verifiedResults[cat] || 0))
    if (gap > maxGap) maxGap = gap
  })
  return maxGap
}

export async function fetchVotesForQuestion(questionId) {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('question_id', questionId)
  if (error) throw error
  return data
}

export async function submitVote({ questionId, userId, spectrumValue, reason, isVerified }) {
  const { data, error } = await supabase
    .from('votes')
    .insert({
      question_id: questionId,
      user_id: userId,
      spectrum_value: spectrumValue,
      reason: reason || null,
      is_verified: isVerified,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchQuestions(category = null) {
  let query = supabase.from('questions').select('*').order('created_at', { ascending: true })
  if (category && category !== 'All') {
    query = query.eq('category', category)
  }
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchQuestion(id) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function hasUserVoted(questionId, userId) {
  if (!userId) return false
  const { data } = await supabase
    .from('votes')
    .select('id')
    .eq('question_id', questionId)
    .eq('user_id', userId)
    .single()
  return !!data
}
