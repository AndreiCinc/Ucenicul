# 09_CANONICALITY_AND_EVIDENCE_POLICY

## Canonical selection rules
Alege exact o sursă canonică per rol:
- implementation truth
- contract truth
- runtime truth
- current status truth

## Promotion rules
Promovezi un patch la canonical doar dacă:
- a înlocuit semantic baza
- este susținut de dovadă mai puternică
- promotion este documentată explicit

## Demotion rules
Marchezi ca stale/historical/foreign când:
- surse mai noi și mai puternice îl contrazic
- aparține altui workflow
- este doar snapshot / backup / superseded handoff

## No silent truth merging
Dacă două surse se bat cap în cap, nu compui adevărul din amândouă fără o regulă de dominanță documentată.
