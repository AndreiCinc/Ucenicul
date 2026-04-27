// Candidate merge function for ME_Memory_Supersede_Embed_Merge.
// Derived from the final Code-node jsCode by replacing the $() lookup with a
// `prep` parameter, and by replacing `$json` (httpResp) with the second arg.
// Semantically equivalent to the live Code node; importable by the pack's
// run_merge_unit_tests.mjs harness.

export default function mergeSupersedeEmbedding(prep, httpResp) {
  if (prep && prep._error === true) {
    return [{ json: prep }];
  }

  let embeddingText      = prep.__db.embedding_text || null;
  let usedEmbedding      = prep.passthrough && prep.passthrough.used_embedding === true;
  let embeddingAttempted = false;
  let embeddingError     = null;

  if (!embeddingText) {
    embeddingAttempted = true;
    const vec = httpResp
      && httpResp.data
      && Array.isArray(httpResp.data)
      && httpResp.data[0]
      && Array.isArray(httpResp.data[0].embedding)
      ? httpResp.data[0].embedding
      : null;

    if (vec && vec.length === 1536) {
      embeddingText = JSON.stringify(vec);
      usedEmbedding = true;
    } else if (httpResp && httpResp.error) {
      embeddingError = 'embedding_http_error: '
        + (httpResp.error.message || httpResp.error.code || JSON.stringify(httpResp.error));
    } else if (httpResp && typeof httpResp.statusCode === 'number' && httpResp.statusCode >= 400) {
      embeddingError = 'embedding_http_' + httpResp.statusCode;
    } else {
      embeddingError = 'embedding_response_unusable';
    }
  }

  return [{ json: {
    __db: { ...prep.__db, embedding_text: embeddingText },
    passthrough: {
      ...prep.passthrough,
      used_embedding:      usedEmbedding,
      embedding_attempted: embeddingAttempted,
      embedding_error:     embeddingError
    }
  }}];
}
