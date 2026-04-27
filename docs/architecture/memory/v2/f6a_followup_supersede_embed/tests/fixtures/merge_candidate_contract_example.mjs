// Example only. Claude must generate the real candidate from the final n8n Code node jsCode.
// The test harness imports a pure function with this signature.
export default function mergeSupersedeEmbedding(prep, httpResp) {
  if (prep && prep._error === true) return prep;

  let embeddingText = prep.__db.embedding_text || null;
  let embeddingAttempted = false;
  let embeddingError = null;

  if (!embeddingText) {
    embeddingAttempted = true;
    const vec = httpResp?.data?.[0]?.embedding;
    if (Array.isArray(vec) && vec.length === 1536) {
      embeddingText = JSON.stringify(vec);
    } else if (httpResp?.error) {
      embeddingError = 'embedding_http_error: ' + (httpResp.error.message || httpResp.error.code || JSON.stringify(httpResp.error));
    } else if (typeof httpResp?.statusCode === 'number' && httpResp.statusCode >= 400) {
      embeddingError = 'embedding_http_' + httpResp.statusCode;
    } else {
      embeddingError = 'embedding_response_unusable';
    }
  }

  return [{ json: {
    __db: { ...prep.__db, embedding_text: embeddingText },
    passthrough: {
      ...prep.passthrough,
      embedding_attempted: embeddingAttempted,
      embedding_error: embeddingError,
    },
  }}];
}
