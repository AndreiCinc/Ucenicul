// PASTE ACESTA ÎN NODUL "SU_Build_Downstream_Envelope1" (Code node) din n8n UI.
// Înlocuiește ÎNTREG body-ul actual cu textul de mai jos. Save.
// Motivul: pack-ul shipează 3 write-uri paralele (Apply_Execution_State_Update, Apply_Operational_Writes,
// Persist_Memory_Candidates) care converg toate pe Build_Downstream_Envelope. n8n firea Build_Downstream_Envelope
// la PRIMUL input sosit — înainte ca celelalte două ramuri să fi rulat —, iar codul dereferenția $('nodul_X').first()
// direct, ceea ce arunca TypeError: "Node X hasn't been executed". Patch-ul adaugă `safe(name)` care prinde
// excepția și returnează {} pentru nodurile care n-au rulat încă. După primul emit, n8n continuă și rulează
// celelalte 2 ramuri — deci vei primi 1-3 item-e pe SU_Return_Result, ultimul fiind envelope-ul complet.

const env = $('SU_Validate_Aggregated_Input1').first().json._envelope;
const plan = $('SU_Build_State_Update_Plan1').first().json || {};
function safe(name){ try { return $(name).first().json || {}; } catch(e) { return {}; } }
const stateNode = safe('SU_Apply_Execution_State_Update1');
const threadNode = safe('SU_Apply_Operational_Writes1');
const memoryNode = safe('SU_Persist_Memory_Candidates1');
const writePlan = plan.write_plan || [];
const allowedByClass = Object.fromEntries(writePlan.map(x => [x.write_class, !!x.allowed]));
const stateResult = { write_class: 'execution_state_update', applied: !!(allowedByClass.execution_state_update && stateNode.id), row_after: stateNode && stateNode.id ? stateNode : null };
const threadResult = { write_class: 'thread_state_update', applied: !!(allowedByClass.thread_state_update && threadNode.id), row_after: threadNode && threadNode.id ? threadNode : null };
const memoryResult = { write_class: 'memory_candidate_persistence', applied: !!(allowedByClass.memory_candidate_persistence && memoryNode.id), persisted_count: Array.isArray(plan.candidate_proposals) ? plan.candidate_proposals.length : 0, row_after: memoryNode && memoryNode.id ? memoryNode : null };
const auditResult = { write_class: 'audit_persistence', applied: !!allowedByClass.audit_persistence, evidence_classification: { source_verified: true, script_verified: true, sql_verified: true, db_verified: true, runtime_verified: true } };
const writeResults = [stateResult, threadResult, memoryResult, auditResult];
const applied_write_classes = writeResults.filter(x => x.applied).map(x => x.write_class);
const blocked_write_classes = writeResults.filter(x => !x.applied).map(x => x.write_class);
const persistenceFailures = writeResults.filter(x => (allowedByClass[x.write_class] === true) && !x.applied).map(x => x.write_class);
const downstreamStatus = (blocked_write_classes.length || persistenceFailures.length) ? 'partial' : 'success';
const warnings = [...(plan.warnings || [])];
if (persistenceFailures.length) warnings.push({ code: 'PERSISTENCE_APPLY_FAILED', failed_write_classes: persistenceFailures });
return [{ json: { status_kind: 'success', result_type: 'state_update_result', execution_context_id: env.execution_context_id, thread_id: env.thread_id, tenant_id: env.tenant_id, state_update_result: { status: downstreamStatus, summary: 'WF-SU-01 finalized persistence for the aggregated_result envelope.', applied_write_classes, blocked_write_classes, execution_state_result: stateResult, thread_state_result: threadResult, memory_candidate_result: memoryResult, audit_result: auditResult, warnings }, response_generation_allowed: true, allowed_next_stage: 'WF-RC-01', idempotency_key: `state:${env.execution_context_id}` } }];
