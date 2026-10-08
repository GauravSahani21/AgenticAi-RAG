import type { LearningState, Topic } from '../types';

export type TopicFilter = 'all' | 'review' | 'new' | 'mastered';
export const needsReview = (state?: LearningState) => !!state &&
  (['STRUGGLING', 'INTERVENTION_REQUIRED'].includes(state.status) ||
    (state.attempts > 0 && state.mastery_score < 50));

export function filterTopics(topics: Topic[], states: Record<string, LearningState>, query: string, filter: TopicFilter) {
  const search = query.trim().toLowerCase();
  return topics.filter(topic => {
    const state = states[topic.id];
    const matches = `${topic.name} ${topic.module} ${topic.description ?? ''}`.toLowerCase().includes(search);
    return matches && (filter === 'all' ||
      (filter === 'review' && needsReview(state)) ||
      (filter === 'new' && (!state || state.status === 'NOT_STARTED')) ||
      (filter === 'mastered' && state?.status === 'MASTERED'));
  });
}

// Keep curriculum order for ties; prioritise explicit struggle, then unfinished work.
export function recommendTopic(topics: Topic[], states: Record<string, LearningState>) {
  const review = topics.filter(topic => needsReview(states[topic.id]))
    .sort((a, b) => states[a.id].mastery_score - states[b.id].mastery_score)[0];
  if (review) return { topic: review, reason: 'Revisit a topic where your recorded learning state shows room for improvement.' };
  const ongoing = topics.find(topic => states[topic.id] && !['NOT_STARTED', 'MASTERED'].includes(states[topic.id].status));
  if (ongoing) return { topic: ongoing, reason: 'Continue a topic you have already started.' };
  const next = topics.find(topic => !states[topic.id] || states[topic.id].status === 'NOT_STARTED');
  if (next) return { topic: next, reason: 'Take the next unstarted topic in your course sequence.' };
  return null;
}
