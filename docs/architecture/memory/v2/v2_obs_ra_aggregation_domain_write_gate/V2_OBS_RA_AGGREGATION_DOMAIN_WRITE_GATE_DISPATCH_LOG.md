# Dispatch Log — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

Chronological log of ME→RA dispatches performed during Phase 7 E2E.

Format: `<exec_id> <family.case> <action> <dispatch summary> <RA subcall> <rollup>`

## E1 — promote happy path (5/5)
```
3894 E1.1 promote_memory       step=mem-v2obs-e1-1  RA=3895  rollup=success  DB: e1100001-...-001 tier=long_term
3903 E1.2 promote_memory       step=mem-v2obs-e1-2  RA=3904  rollup=success  DB: e1100001-...-002 tier=long_term
3912 E1.3 promote_memory       step=mem-v2obs-e1-3  RA=3913  rollup=success  DB: e1100001-...-003 tier=long_term
3921 E1.4 promote_memory       step=mem-v2obs-e1-4  RA=3922  rollup=success  DB: e1100001-...-004 tier=long_term
3930 E1.5 promote_memory       step=mem-v2obs-e1-5  RA=3931  rollup=success  DB: e1100001-...-005 tier=long_term
```

## E2r — supersede happy path (5/5, corrected input shape)
```
3984 E2.1r supersede_memory    step=mem-v2obs-e2-1r RA=3985  rollup=success  DB: e2200002-...-001 superseded + new 3688e7a8
3993 E2.2r supersede_memory    step=mem-v2obs-e2-2r RA=3994  rollup=success  DB: e2200002-...-002 superseded + new 775684b9
4002 E2.3r supersede_memory    step=mem-v2obs-e2-3r RA=4003  rollup=success  DB: e2200002-...-003 superseded + new 0eda44f6
4011 E2.4r supersede_memory    step=mem-v2obs-e2-4r RA=4012  rollup=success  DB: e2200002-...-004 superseded + new f323da22
4020 E2.5r supersede_memory    step=mem-v2obs-e2-5r RA=4021  rollup=success  DB: e2200002-...-005 superseded + new b3efdc98
```

## E3 — promote deny preservation (5/5)
```
4029 E3.1 promote_memory deny  step=mem-v2obs-e3-1  RA=4030  rollup=failed   (INVALID_PROMOTION_TARGET, envelope preserved)
4038 E3.2 promote_memory deny  step=mem-v2obs-e3-2  RA=4039  rollup=failed
4047 E3.3 promote_memory deny  step=mem-v2obs-e3-3  RA=4048  rollup=failed
4056 E3.4 promote_memory deny  step=mem-v2obs-e3-4  RA=4057  rollup=failed
4065 E3.5 promote_memory deny  step=mem-v2obs-e3-5  RA=4066  rollup=failed
```

## E4 — supersede invalid preservation (5/5)
```
4074 E4.1 supersede_memory invalid  step=mem-v2obs-e4-1  RA=4075  rollup=failed   (target not found)
4083 E4.2 supersede_memory invalid  step=mem-v2obs-e4-2  RA=4084  rollup=failed   (already superseded)
4092 E4.3 supersede_memory invalid  step=mem-v2obs-e4-3  RA=4093  rollup=failed
4101 E4.4 supersede_memory invalid  step=mem-v2obs-e4-4  RA=4102  rollup=failed
4110 E4.5 supersede_memory invalid  step=mem-v2obs-e4-5  RA=4111  rollup=failed
```

## E5 — search read-only (5/5)
```
4119 E5.1 search_memory        step=mem-v2obs-e5-1  RA=4120  rollup=success  (read-only, domain_writes_performed=false)
4128 E5.2 search_memory        step=mem-v2obs-e5-2  RA=4129  rollup=success
4137 E5.3 search_memory        step=mem-v2obs-e5-3  RA=4138  rollup=success
4146 E5.4 search_memory empty  step=mem-v2obs-e5-4  RA=4147  rollup=success
4155 E5.5 search_memory        step=mem-v2obs-e5-5  RA=4156  rollup=success
```

## E6 — module_error preservation (5/5)
```
4164 E6.1 missing action       step=mem-v2obs-e6-1  RA=----  rollup=failed (module_error branch)
4165 E6.2 unknown action       step=mem-v2obs-e6-2  RA=----  rollup=failed
4166 E6.3 store missing inputs step=mem-v2obs-e6-3  RA=4167  rollup=failed (DB_WRITE_FAILED)
4175 E6.4 promote no memory_id step=mem-v2obs-e6-4  RA=----  rollup=failed
4184 E6.5 supersede incomplete step=mem-v2obs-e6-5  RA=----  rollup=failed
```

## E7 — store writeful (5/5)
```
4193 E7.1 store_memory         step=mem-v2obs-e7-1  RA=4194  rollup=success  DB: b1d72005... inserted
4202 E7.2 store_memory         step=mem-v2obs-e7-2  RA=4203  rollup=success  DB: d06d9760... inserted
4211 E7.3 store_memory         step=mem-v2obs-e7-3  RA=4212  rollup=success  DB: bba6fbcb... inserted
4220 E7.4 store_memory         step=mem-v2obs-e7-4  RA=4221  rollup=success  DB: 0bce82f8... inserted
4229 E7.5 store_memory         step=mem-v2obs-e7-5  RA=4230  rollup=success  DB: eccdfa44... inserted
```

## E8 — replay idempotent (5/5)
```
4238 E8.1 replay e7-1          step=mem-v2obs-e7-1  RA=4239  rollup=success  DB: no duplicate (ON CONFLICT DO NOTHING)
4247 E8.2 replay e7-2          step=mem-v2obs-e7-2  RA=4248  rollup=success
4256 E8.3 replay e7-3          step=mem-v2obs-e7-3  RA=4257  rollup=success
4265 E8.4 replay e7-4          step=mem-v2obs-e7-4  RA=4266  rollup=success
4274 E8.5 replay e7-5          step=mem-v2obs-e7-5  RA=4275  rollup=success
```

## E9r — promote writeful (5/5, corrected field)
```
4328 E9.1r promote_memory      step=mem-v2obs-e9-1r RA=4329  rollup=success  DB: e9900009-...-001 tier=long_term
4337 E9.2r promote_memory      step=mem-v2obs-e9-2r RA=4338  rollup=success  DB: e9900009-...-002 tier=long_term
4346 E9.3r promote_memory      step=mem-v2obs-e9-3r RA=4347  rollup=success  DB: e9900009-...-003 tier=long_term
4355 E9.4r promote_memory      step=mem-v2obs-e9-4r RA=4356  rollup=success  DB: e9900009-...-004 tier=long_term
4364 E9.5r promote_memory      step=mem-v2obs-e9-5r RA=4365  rollup=success  DB: e9900009-...-005 tier=long_term
```

## E10 — regression pack (5/5)
```
4373 E10.1 search_memory       step=mem-v2obs-e10-1 RA=4374  rollup=success
4382 E10.2 search_memory empty step=mem-v2obs-e10-2 RA=4383  rollup=success
4391 E10.3 store_memory        step=mem-v2obs-e10-3 RA=4392  rollup=success  DB: v2obs_regression row inserted
4400 E10.4 store_memory alt    step=mem-v2obs-e10-4 RA=4401  rollup=success  DB: v2obs_regression alt row inserted
4409 E10.5 promote_memory      step=mem-v2obs-e10-5 RA=4410  rollup=success  (e9900009-...-001 already long_term)
```

Note: RA subcall IDs in the format "RA=NNNN" are inferred as +1 relative to the parent exec ID based on observed behaviour from executions we inspected directly (3894→3895, 3984→3985, 4029→4030, 4119→4120, 4166→4167, 4283→4284). For the inspected executions the mapping was verified; for the remainder it follows n8n's sequential allocation pattern during contiguous dispatch.
