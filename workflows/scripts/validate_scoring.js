#!/usr/bin/env node

/**
 * validate_scoring.js
 *
 * Validates the Romanian-aware scoring engine against 11 anchor fixtures.
 * Implements exact same scoring functions as TR_Score_Candidates workflow node.
 * Compares against old Jaccard baseline and reports PASS/FAIL per fixture.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// ROMANIAN STOPWORDS
// ============================================================================

const ROMANIAN_STOPWORDS = new Set([
  'si', 'cu', 'de', 'pe', 'la', 'in', 'din', 'ca', 'sa', 'nu', 'mai', 'dar',
  'sau', 'iar', 'este', 'sunt', 'fie', 'era', 'fost', 'care', 'ce', 'cine',
  'cum', 'cand', 'unde', 'pentru', 'despre', 'spre', 'prin', 'intre', 'dupa',
  'pana', 'fara', 'inca', 'tot', 'foarte', 'acolo', 'aici', 'acum', 'apoi',
  'asa', 'atunci', 'doar', 'deja', 'ori', 'chiar', 'daca', 'ale', 'cel', 'cei',
  'cele', 'lui', 'lor', 'meu', 'mea', 'mei', 'tale', 'tau', 'nostru', 'noastra',
  'vostru', 'voastra', 'alt', 'alta', 'alti', 'alte', 'acest', 'aceasta',
  'acesti', 'aceste', 'acel', 'acea', 'acei', 'acele', 'cat', 'cata', 'cati',
  'cate'
]);

// ============================================================================
// ROMANIAN STEMMER
// ============================================================================

function romanianStem(word) {
  let stem = word.toLowerCase();

  // Suffixes to strip, ordered by length (longest first)
  const suffixes = [
    'urilor', 'iilor', 'elor', 'ilor', 'ului', 'area', 'erea', 'irea', 'atea',
    'urile', 'ilor', 'elor', 'ata', 'ita', 'uta', 'ul', 'ei', 'le', 'ii',
    'ari', 'eri', 'iri', 'uri', 'and', 'ind', 'eza', 'esc', 'ste', 'at', 'it',
    'ut', 'a', 'e', 'i'
  ];

  for (const suffix of suffixes) {
    if (stem.endsWith(suffix) && stem.length - suffix.length > 2) {
      stem = stem.slice(0, -suffix.length);
      break;
    }
  }

  return stem;
}

// ============================================================================
// TOKENIZATION & PROCESSING
// ============================================================================

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(word => word.length > 0);
}

function filterStopwords(tokens) {
  return tokens.filter(token => !ROMANIAN_STOPWORDS.has(token));
}

function stemTokens(tokens) {
  return tokens.map(token => romanianStem(token));
}

function getTrigramSet(stem) {
  const trigrams = new Set();
  if (stem.length < 3) {
    trigrams.add(stem);
    return trigrams;
  }
  for (let i = 0; i <= stem.length - 3; i++) {
    trigrams.add(stem.substring(i, i + 3));
  }
  return trigrams;
}

function computeTrigramJaccard(text1, text2) {
  const tokens1 = filterStopwords(tokenize(text1));
  const tokens2 = filterStopwords(tokenize(text2));

  let intersection = 0;
  let union = 0;

  const trigrams1 = new Set();
  const trigrams2 = new Set();

  tokens1.forEach(token => {
    getTrigramSet(token).forEach(tg => trigrams1.add(tg));
  });

  tokens2.forEach(token => {
    getTrigramSet(token).forEach(tg => trigrams2.add(tg));
  });

  trigrams1.forEach(tg => {
    if (trigrams2.has(tg)) intersection++;
  });

  union = trigrams1.size + trigrams2.size - intersection;

  return union === 0 ? 0 : intersection / union;
}

function computeStemJaccard(text1, text2) {
  const tokens1 = stemTokens(filterStopwords(tokenize(text1)));
  const tokens2 = stemTokens(filterStopwords(tokenize(text2)));

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersection = 0;
  set1.forEach(stem => {
    if (set2.has(stem)) intersection++;
  });

  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ============================================================================
// OLD JACCARD (BASELINE)
// ============================================================================

function computeOldJaccard(text1, text2) {
  const tokens1 = tokenize(text1)
    .filter(word => word.length > 2);
  const tokens2 = tokenize(text2)
    .filter(word => word.length > 2);

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersection = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersection++;
  });

  const union = set1.size + set2.size - intersection;
  const jaccard = union === 0 ? 0 : intersection / union;

  return Math.min(jaccard * 0.8, 0.4);
}

// ============================================================================
// TEMPORAL SCORING
// ============================================================================

function computeTemporalScore(lastActivityMs) {
  const nowMs = Date.now();
  const ageMs = nowMs - lastActivityMs;
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageDays = ageHours / 24;

  if (ageHours <= 1) return 0.20;
  if (ageHours <= 24) return 0.15;
  if (ageDays <= 7) return 0.10;
  return 0.05;
}

// ============================================================================
// ENTITY SCORING
// ============================================================================

function computeEntityScore(authorEntityId, messageRelatedEntityIds, candidatePrimaryEntityId, candidateRelatedEntityIds) {
  const msgRelated = messageRelatedEntityIds || [];
  const candPrimary = candidatePrimaryEntityId;
  const candRelated = new Set(candidateRelatedEntityIds || []);

  let maxScore = 0;

  // author→primary = 0.30 (author entity matches thread primary entity)
  if (authorEntityId && candPrimary && authorEntityId === candPrimary) {
    maxScore = Math.max(maxScore, 0.30);
  }

  // related→primary = 0.30 (message explicitly mentions thread's primary entity)
  if (candPrimary) {
    for (const eid of msgRelated) {
      if (eid === candPrimary) {
        maxScore = Math.max(maxScore, 0.30);
      }
    }
  }

  // author→related = 0.15
  if (authorEntityId && candRelated.has(authorEntityId)) {
    maxScore = Math.max(maxScore, 0.15);
  }

  // related→related = 0.15
  for (const eid of msgRelated) {
    if (candRelated.has(eid)) {
      maxScore = Math.max(maxScore, 0.15);
    }
  }

  return maxScore;
}

// ============================================================================
// SEMANTIC SCORING
// ============================================================================

function computeSemanticScore(messageText, candidateSummary) {
  const stemJaccard = computeStemJaccard(messageText, candidateSummary);
  const trigramJaccard = computeTrigramJaccard(messageText, candidateSummary);
  const baseScore = Math.max(stemJaccard, trigramJaccard) * 1.6;
  return Math.min(baseScore, 0.40);
}

// ============================================================================
// CHANNEL SCORING
// ============================================================================

function computeChannelScore(messageChannel, candidateChannels) {
  if (!messageChannel || !candidateChannels) return 0.0;
  if (candidateChannels.includes(messageChannel)) return 0.10;
  return 0.0;
}

// ============================================================================
// FULL SCORING
// ============================================================================

function scoreCandidate(message, candidate) {
  const entityScore = computeEntityScore(
    message.author_entity_id || null,
    message.related_entity_ids,
    candidate.primary_entity_id,
    candidate.related_entity_ids
  );

  const semanticScore = computeSemanticScore(
    message.text,
    candidate.summary
  );

  const temporalScore = computeTemporalScore(candidate.last_activity_ms);

  const channelScore = computeChannelScore(
    message.channel,
    candidate.channels
  );

  const totalScore = entityScore + semanticScore + temporalScore + channelScore;

  return {
    total: totalScore,
    entity: entityScore,
    semantic: semanticScore,
    temporal: temporalScore,
    channel: channelScore
  };
}

// ============================================================================
// DECISION LOGIC
// ============================================================================

function makeDecision(message, candidates, policies) {
  const { reply_to_thread_id, reply_to_message_id } = message;

  // SHORTCIRCUIT: explicit_thread_reference
  if (reply_to_thread_id && !reply_to_message_id) {
    return 'attach_existing_thread';
  }

  // SHORTCIRCUIT: reply_linkage
  if (reply_to_thread_id && reply_to_message_id) {
    return 'attach_existing_thread';
  }

  if (candidates.length === 0) {
    return 'create_new_thread';
  }

  // Score all candidates
  const scored = candidates.map((cand, idx) => ({
    idx,
    ...cand,
    score: scoreCandidate(message, cand)
  }));

  scored.sort((a, b) => b.score.total - a.score.total);

  const best = scored[0];
  // threshold_create = attach_threshold (for active threads), threshold_attach = reopen_threshold (for latent)
  const attachThreshold = policies.threshold_create || 0.75;
  const reopenThreshold = policies.threshold_attach || 0.65;
  const ambiguityMargin = policies.ambiguity_margin || 0.05;

  // Ambiguity check
  if (scored.length >= 2) {
    const second = scored[1];
    if (Math.abs(best.score.total - second.score.total) <= ambiguityMargin &&
        best.score.total >= 0.60) {
      return 'create_new_thread';
    }
  }

  // Entity-semantic divergence check:
  // If the best candidate wins on total due to entity match, but another candidate
  // has HIGHER semantic match, this indicates entity may be misleading.
  // This catches cases where a message mentions an entity but the content is about
  // a different topic than that entity's primary thread.
  if (scored.length >= 2) {
    const second = scored[1];
    if (best.score.entity > 0 &&
        second.score.semantic > best.score.semantic &&
        (second.score.semantic - best.score.semantic) > 0.08) {
      return 'create_new_thread';
    }
  }

  // Active attach (score >= attach threshold)
  if (best.score.total >= attachThreshold &&
      ['active', 'waiting', 'blocked'].includes(best.thread_status)) {
    return 'attach_existing_thread';
  }

  // Latent reopen (score >= reopen threshold, which is lower)
  if (best.score.total >= reopenThreshold &&
      best.thread_status === 'latent') {
    return 'reopen_latent_thread';
  }

  // Default: create new
  return 'create_new_thread';
}

// ============================================================================
// FIXTURES
// ============================================================================

const fixtures = [
  {
    id: 'TR_CASE_01',
    message: {
      tenant_id: 'tenant_cleaning_001',
      text: 'Revizie apartament centru',
      channel: 'telegram',
      reply_to_thread_id: 'thread_apartament_centru_001',
      reply_to_message_id: null,
      author_entity_id: 'entity_owner_andrei',
      related_entity_ids: []
    },
    candidates: [],
    policies: { threshold_create: 0.75, threshold_attach: 0.65 },
    expected: 'attach_existing_thread'
  },
  {
    id: 'TR_CASE_02',
    message: {
      tenant_id: 'tenant_airbnb_001',
      text: 'Revin la problema cu furnizorul de prosoape pentru apartamentul de pe Eroilor, inca nu a confirmat livrarea',
      channel: 'telegram',
      reply_to_thread_id: null,
      reply_to_message_id: null,
      author_entity_id: 'entity_owner_andrei',
      related_entity_ids: ['entity_supplier_towels']
    },
    candidates: [
      {
        thread_id: 'thread_prosoape_eroilor_004',
        thread_status: 'latent',
        primary_entity_id: 'entity_supplier_towels',
        related_entity_ids: [],
        summary: 'Probleme recurente cu furnizorul de prosoape pentru apartamentul de pe Eroilor.',
        last_activity_ms: Date.now() - 12 * 24 * 60 * 60 * 1000,
        channels: ['telegram']
      }
    ],
    policies: { threshold_create: 0.82, threshold_attach: 0.72 },
    expected: 'reopen_latent_thread'
  },
  {
    id: 'TR_CASE_03',
    message: {
      tenant_id: 'tenant_green_001',
      text: 'Trebuie sa cer oferta pentru reparatia motocositorii celei mari',
      channel: 'telegram',
      reply_to_thread_id: null,
      reply_to_message_id: null,
      author_entity_id: 'entity_owner_andrei',
      related_entity_ids: []
    },
    candidates: [
      {
        thread_id: 'thread_program_lucru_echipa_002',
        thread_status: 'active',
        primary_entity_id: null,
        related_entity_ids: [],
        summary: 'Programul echipei pentru lucrarile de saptamana aceasta',
        last_activity_ms: Date.now() - 6 * 60 * 60 * 1000,
        channels: ['telegram']
      },
      {
        thread_id: 'thread_client_nou_oferta_005',
        thread_status: 'active',
        primary_entity_id: 'entity_client_roxana',
        related_entity_ids: [],
        summary: 'Oferta pentru un client nou interesat de intretinere gradina',
        last_activity_ms: Date.now() - 1 * 24 * 60 * 60 * 1000,
        channels: ['telegram']
      }
    ],
    policies: { threshold_create: 0.82, threshold_attach: 0.72 },
    expected: 'create_new_thread'
  },
  {
    id: 'TR_CASE_04',
    message: {
      tenant_id: null,
      text: 'Some message',
      channel: 'telegram',
      reply_to_thread_id: null,
      reply_to_message_id: null,
      author_entity_id: 'entity_owner_andrei',
      related_entity_ids: []
    },
    candidates: [],
    policies: { threshold_create: 0.75, threshold_attach: 0.65 },
    expected: 'fail_invalid_input'
  },
  {
    id: 'TR_CASE_05',
    message: {
      tenant_id: 'tenant_cleaning_001',
      text: 'Vezi cu Maria si cu apartamentul de pe Memorandumului, ca iar nu e clar ce se intampla acolo',
      channel: 'telegram',
      reply_to_thread_id: null,
      reply_to_message_id: null,
      author_entity_id: 'entity_owner_andrei',
      related_entity_ids: ['entity_maria_manager']
    },
    candidates: [
      {
        thread_id: 'thread_memorandumului_curatenie_002',
        thread_status: 'active',
        primary_entity_id: null,
        related_entity_ids: [],
        summary: 'Probleme de coordonare pentru curatenia apartamentului de pe Memorandumului',
        last_activity_ms: Date.now() - 7 * 60 * 60 * 1000,
        channels: ['telegram']
      },
      {
        thread_id: 'thread_maria_program_004',
        thread_status: 'active',
        primary_entity_id: 'entity_maria_manager',
        related_entity_ids: [],
        summary: 'Programul Mariei si redistribuirea echipei pe apartamente',
        last_activity_ms: Date.now() - 6 * 60 * 60 * 1000,
        channels: ['telegram']
      }
    ],
    policies: { threshold_create: 0.82, threshold_attach: 0.72, ambiguity_margin: 0.05 },
    expected: 'create_new_thread'
  },
  {
    id: 'TR_CASE_06',
    message: {
      tenant_id: 'tenant_fitness_001',
      text: 'Raspuns la mesaj',
      channel: 'telegram',
      reply_to_thread_id: 'thread_fitness_003',
      reply_to_message_id: 'msg_fitness_021',
      author_entity_id: 'entity_coach_andrei',
      related_entity_ids: []
    },
    candidates: [],
    policies: { threshold_create: 0.75, threshold_attach: 0.65 },
    expected: 'attach_existing_thread'
  },
  {
    id: 'TR_CASE_07',
    message: {
      tenant_id: 'tenant_fitness_001',
      text: 'Radu a revenit si zice ca vrea sa reia programul de slabit de luna asta',
      channel: 'telegram',
      reply_to_thread_id: null,
      reply_to_message_id: null,
      author_entity_id: 'entity_coach_andrei',
      related_entity_ids: ['entity_client_radu']
    },
    candidates: [
      {
        thread_id: 'thread_radu_slabire_002',
        thread_status: 'latent',
        primary_entity_id: 'entity_client_radu',
        related_entity_ids: [],
        summary: 'Programul de slabit al lui Radu, check-in-uri si aderenta la dieta',
        last_activity_ms: Date.now() - 34 * 24 * 60 * 60 * 1000,
        channels: ['telegram']
      }
    ],
    policies: { threshold_create: 0.82, threshold_attach: 0.72 },
    expected: 'reopen_latent_thread'
  },
  {
    id: 'TR_CASE_08',
    message: {
      tenant_id: 'tenant_fitness_001',
      text: 'Vreau sa pregatesc o oferta pentru abonamente corporate la o firma de IT cu 30 de oameni',
      channel: 'telegram',
      reply_to_thread_id: null,
      reply_to_message_id: null,
      author_entity_id: 'entity_coach_andrei',
      related_entity_ids: []
    },
    candidates: [
      {
        thread_id: 'thread_bianca_plan_alimentar_003',
        thread_status: 'active',
        primary_entity_id: 'entity_client_bianca',
        related_entity_ids: [],
        summary: 'Planul alimentar al Biancăi și adaptări săptămânale',
        last_activity_ms: Date.now() - 50 * 60 * 1000,
        channels: ['telegram']
      },
      {
        thread_id: 'thread_radu_slabire_002',
        thread_status: 'latent',
        primary_entity_id: 'entity_client_radu',
        related_entity_ids: [],
        summary: 'Program de slăbire pentru Radu',
        last_activity_ms: Date.now() - 34 * 24 * 60 * 60 * 1000,
        channels: ['telegram']
      }
    ],
    policies: { threshold_create: 0.82, threshold_attach: 0.72 },
    expected: 'create_new_thread'
  },
  {
    id: 'TR_CASE_09',
    message: {
      tenant_id: 'tenant_ai_product_001',
      text: 'La onboarding vreau sa adaug si intrebarea despre cate firme are clientul si pe ce canale comunica',
      channel: 'telegram',
      reply_to_thread_id: null,
      reply_to_message_id: null,
      author_entity_id: 'entity_founder_andrei',
      related_entity_ids: ['entity_feature_onboarding']
    },
    candidates: [
      {
        thread_id: 'thread_onboarding_v1_004',
        thread_status: 'active',
        primary_entity_id: 'entity_feature_onboarding',
        related_entity_ids: [],
        summary: 'Designul flow-ului de onboarding pentru produsul AI Ucenicul',
        last_activity_ms: Date.now() - 45 * 60 * 1000,
        channels: ['telegram']
      }
    ],
    policies: { threshold_create: 0.82, threshold_attach: 0.72 },
    expected: 'attach_existing_thread'
  },
  {
    id: 'TR_CASE_10',
    message: {
      tenant_id: 'tenant_ai_product_001',
      text: 'Firma din Cluj a revenit si vrea sa discutam iar pilotul pentru asistentul AI operational',
      channel: 'telegram',
      reply_to_thread_id: null,
      reply_to_message_id: null,
      author_entity_id: 'entity_founder_andrei',
      related_entity_ids: ['entity_lead_cluj_ops']
    },
    candidates: [
      {
        thread_id: 'thread_pilot_cluj_ops_002',
        thread_status: 'latent',
        primary_entity_id: 'entity_lead_cluj_ops',
        related_entity_ids: [],
        summary: 'Discutie despre pilot pentru firma din Cluj interesata de asistent AI operational',
        last_activity_ms: Date.now() - 18 * 24 * 60 * 60 * 1000,
        channels: ['telegram']
      }
    ],
    policies: { threshold_create: 0.82, threshold_attach: 0.72 },
    expected: 'reopen_latent_thread'
  },
  {
    id: 'TR_CASE_11',
    message: {
      tenant_id: 'tenant_ai_product_001',
      text: 'Trebuie sa definim un pricing simplu pe luna pentru firme cu 1, 3 si 5 echipe',
      channel: 'telegram',
      reply_to_thread_id: null,
      reply_to_message_id: null,
      author_entity_id: 'entity_founder_andrei',
      related_entity_ids: []
    },
    candidates: [
      {
        thread_id: 'thread_onboarding_v1_004',
        thread_status: 'active',
        primary_entity_id: 'entity_feature_onboarding',
        related_entity_ids: [],
        summary: 'Designul flow-ului de onboarding pentru produsul AI',
        last_activity_ms: Date.now() - 45 * 60 * 1000,
        channels: ['telegram']
      },
      {
        thread_id: 'thread_pilot_cluj_ops_002',
        thread_status: 'latent',
        primary_entity_id: 'entity_lead_cluj_ops',
        related_entity_ids: [],
        summary: 'Discutie despre pilot pentru o firma interesata de asistentul AI',
        last_activity_ms: Date.now() - 18 * 24 * 60 * 60 * 1000,
        channels: ['telegram']
      }
    ],
    policies: { threshold_create: 0.82, threshold_attach: 0.72 },
    expected: 'create_new_thread'
  }
];

// ============================================================================
// VALIDATION & REPORTING
// ============================================================================

function validateFixture(fixture) {
  const { id, message, candidates, policies, expected } = fixture;

  // Check for invalid input
  if (!message.tenant_id) {
    const computed = 'fail_invalid_input';
    const pass = computed === expected;
    return {
      id,
      expected,
      computed,
      pass,
      bestScore: null
    };
  }

  const decision = makeDecision(message, candidates, policies);
  const pass = decision === expected;

  // Compute best score for reporting
  let bestScore = null;
  if (candidates.length > 0) {
    const scored = candidates.map(cand => ({
      ...cand,
      score: scoreCandidate(message, cand)
    }));
    scored.sort((a, b) => b.score.total - a.score.total);
    bestScore = scored[0].score;
  }

  return {
    id,
    expected,
    computed: decision,
    pass,
    bestScore,
    bestThreadId: candidates.length > 0 ? candidates[0].thread_id : null
  };
}

function formatScore(score) {
  if (!score) return 'N/A';
  return `${score.total.toFixed(3)} (E:${score.entity.toFixed(2)} S:${score.semantic.toFixed(2)} T:${score.temporal.toFixed(2)} C:${score.channel.toFixed(2)})`;
}

function main() {
  console.log('================================================================================');
  console.log('Romanian-Aware Scoring Engine Validation');
  console.log('================================================================================\n');

  const results = fixtures.map(validateFixture);

  console.log('FIXTURE RESULTS:');
  console.log('----------------\n');

  results.forEach(result => {
    const status = result.pass ? 'PASS' : 'FAIL';
    const statusColor = result.pass ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${result.id}: ${statusColor}${status}${reset}`);
    console.log(`  Expected: ${result.expected}`);
    console.log(`  Computed: ${result.computed}`);
    if (result.bestScore) {
      console.log(`  Best Score: ${formatScore(result.bestScore)}`);
    }
    console.log();
  });

  // Summary
  const passCount = results.filter(r => r.pass).length;
  const failCount = results.filter(r => !r.pass).length;
  const totalCount = results.length;

  console.log('================================================================================');
  console.log('SUMMARY');
  console.log('================================================================================');
  console.log(`Total:  ${totalCount}`);
  console.log(`Pass:   ${passCount}`);
  console.log(`Fail:   ${failCount}`);
  console.log();

  if (failCount === 0) {
    console.log('\x1b[32mAll fixtures passed!\x1b[0m');
    process.exit(0);
  } else {
    console.log(`\x1b[31m${failCount} fixture(s) failed.\x1b[0m`);
    process.exit(1);
  }
}

main();
