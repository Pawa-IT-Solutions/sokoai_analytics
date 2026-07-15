import { useMemo, useState } from 'react';
import { MODEL_2_SEGMENTS } from '../data/segments';

function mapSegments(baseSegments, aiSegments) {
    const aiById = new Map();
    aiSegments.forEach((segment) => {
        const id = Number(segment?.centroid_id);
        if (Number.isFinite(id)) {
            aiById.set(id, segment);
        }
    });

    return baseSegments.map((segment) => {
        const ai = aiById.get(segment.id);
        if (!ai) {
            return { ...segment, aiTagline: '', aiLabels: null };
        }

        const behavioralProfile = typeof ai.behavioral_profile === 'string' && ai.behavioral_profile.trim()
            ? ai.behavioral_profile.trim()
            : ai.narrative;

        const operationalPlaybook = typeof ai.operational_playbook === 'string' && ai.operational_playbook.trim()
            ? ai.operational_playbook.trim()
            : null;

        const actions = Array.isArray(ai.recommended_actions)
            ? ai.recommended_actions.filter((item) => typeof item === 'string' && item.trim())
            : [];

        return {
            ...segment,
            name: ai.segment_name || segment.name,
            profile: behavioralProfile || segment.profile,
            action: operationalPlaybook || (actions.length > 0
                ? actions.map((item, index) => `${index + 1}. ${item}`).join(' ')
                : segment.action),
            aiTagline: ai.segment_tagline || '',
            aiLabels: ai.ui_labels ?? null,
        };
    });
}

export function useSegmentAICopy() {
    const [aiSegments, setAiSegments] = useState([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [isRefreshingAI, setIsRefreshingAI] = useState(false);
    const [aiError, setAiError] = useState('');
    const [lastGeneratedAt, setLastGeneratedAt] = useState('');

    const loadAICopy = async (refresh = false) => {
        if (refresh) {
            setIsRefreshingAI(true);
        } else {
            setIsLoadingAI(true);
        }
        setAiError('');

        try {
            const endpoint = refresh ? '/api/segment-ai-copy?refresh=1' : '/api/segment-ai-copy';
            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.toLowerCase().includes('application/json')) {
                const fallbackText = await response.text();
                const preview = fallbackText.slice(0, 60).replace(/\s+/g, ' ');
                throw new Error(`Expected JSON but got ${contentType || 'unknown content type'} (${preview})`);
            }

            const payload = await response.json();
            const segments = Array.isArray(payload?.segments) ? payload.segments : [];
            setAiSegments(segments);
            setLastGeneratedAt(payload?.generatedAt ?? '');
        } catch (error) {
            setAiError(`AI copy unavailable: ${error?.message ?? 'Unknown error'}`);
        } finally {
            setIsLoadingAI(false);
            setIsRefreshingAI(false);
        }
    };

    const displaySegments = useMemo(
        () => mapSegments(MODEL_2_SEGMENTS, aiSegments),
        [aiSegments]
    );

    return {
        displaySegments,
        isLoadingAI,
        isRefreshingAI,
        aiError,
        lastGeneratedAt,
        loadAICopy,
    };
}
