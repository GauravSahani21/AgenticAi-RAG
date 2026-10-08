import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterTopics, recommendTopic } from '../src/utils/studyPlan.ts';

const topics = ['Embeddings', 'Chunking', 'Retrieval'].map((name, index) => ({ id: String(index), name, module: 'Foundations', description: 'Course concepts' }));
const state = (status, mastery_score, attempts = 1) => ({ status, mastery_score, attempts });

test('review prioritizes weakest recorded topic without changing curriculum order', () => {
  const states = { 0: state('STRUGGLING', 40), 1: state('INTERVENTION_REQUIRED', 20) };
  assert.equal(recommendTopic(topics, states).topic.id, '1');
  assert.deepEqual(topics.map(t => t.id), ['0', '1', '2']);
});
test('continue existing learning before starting a new topic', () => {
  assert.equal(recommendTopic(topics, { 1: state('IMPROVING', 60) }).topic.id, '1');
});
test('new learner gets first topic; completed or empty curriculum has no recommendation', () => {
  assert.equal(recommendTopic(topics, {}).topic.id, '0');
  assert.equal(recommendTopic([], {}), null);
  assert.equal(recommendTopic(topics, Object.fromEntries(topics.map(t => [t.id, state('MASTERED', 90)]))), null);
});
test('search is trimmed, case-insensitive and combined with progress filter', () => {
  const states = { 0: state('STRUGGLING', 30), 1: state('MASTERED', 90) };
  assert.deepEqual(filterTopics(topics, states, ' EMBED ', 'review').map(t => t.id), ['0']);
  assert.equal(filterTopics(topics, states, 'embeddings', 'mastered').length, 0);
  assert.equal(filterTopics(topics, states, 'foundations', 'all').length, 3);
  assert.deepEqual(filterTopics(topics, states, '', 'new').map(t => t.id), ['2']);
});
