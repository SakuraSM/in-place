# Harness 模板

## Impact Map

```md
- Goal:
- Scope:
- Risk:
- No-touch:
- Validation:
- Knowledge update:
```

## PR 描述

```md
## Summary
- <!-- describe the user-visible or engineering outcome -->

## Impact
- Apps/packages:
- User-visible behavior:
- API/data/config:
- Roles affected:

## Validation
- [ ] Relevant tests
- [ ] Typecheck
- [ ] Build
- [ ] Manual QA

## Risk and recovery
- Risk:
- Recovery/rollback:
- Skipped checks and reason:

## Documentation
- Updated:
- Follow-up:
```

## UI 验收

```md
- Routes/states:
- Desktop viewport:
- Mobile viewport:
- Loading/error/empty:
- Keyboard/focus:
- Permission variants:
- Before/after screenshots:
```

## 地图专项验收

```md
- Map provider/config state:
- Test data is anonymized:
- Projection and unmapped assets:
- Marker icon and clustering:
- Search/status/category/date filters:
- Summary metric scope:
- Point selection and detail navigation:
- Owner/editor/viewer behavior:
- Desktop/mobile layout:
- Browser response contains no security code:
```

## API 变更说明

```md
- Method/path:
- Authentication/authorization:
- Request example:
- Success response:
- Failure responses:
- Compatibility:
- Logs/metrics:
```

## 数据库变更说明

```md
- Schema change:
- Migration file:
- Existing-data behavior:
- Lock/downtime risk:
- Verification database:
- Recovery or forward-fix plan:
```

## 交付检查清单

- [ ] 改动与 Impact Map 一致，没有纳入用户无关改动。
- [ ] 行为变化和重构已分开说明。
- [ ] 权限、安全、迁移、备份、地图、AI 或发布风险已标记。
- [ ] 相关测试、类型检查和构建已运行，或写明跳过原因。
- [ ] UI 变更已验证桌面、移动、键盘和异常状态。
- [ ] `.env*`、密钥、生产数据和本地文件未进入差异。
- [ ] 架构、产品设计、Harness、README 或示例配置已按需同步。
