import asyncio
from unittest.mock import AsyncMock

import pytest
from app.ai import agent_loop, tutor


@pytest.mark.parametrize('module,function', [
    (agent_loop, agent_loop.run_agentic_tutor_loop),
    (tutor, tutor.generate_response),
])
def test_source_evidence_preserves_full_retrieved_chunk(monkeypatch, module, function):
    monkeypatch.setattr(module, 'call_openrouter', AsyncMock(return_value='Test explanation'))
    passage = 'Embeddings represent semantic meaning. ' * 20 + 'Important final qualification.'
    chunk = dict(content=passage, document_name='lecture.txt', page_number=3,
                 section='Embeddings', similarity_score=0.95)
    result = asyncio.run(function(message='Explain embeddings', subject_name='AI',
                                  topic_name='Embeddings', rag_chunks=[chunk] * 5))
    assert len(result['sources']) == 4
    assert result['sources'][0]['snippet'] == passage
    assert result['sources'][0]['page'] == 3
    assert result['sources'][0]['section'] == 'Embeddings'


@pytest.mark.parametrize('module,function', [
    (agent_loop, agent_loop.run_agentic_tutor_loop),
    (tutor, tutor.generate_response),
])
def test_missing_evidence_is_not_reported_as_grounded(monkeypatch, module, function):
    monkeypatch.setattr(module, 'call_openrouter', AsyncMock(return_value='General background'))
    result = asyncio.run(function(message='Explain embeddings', subject_name='AI',
                                  topic_name=None, rag_chunks=[]))
    assert result['grounded'] is False
    assert result['sources'] == []
