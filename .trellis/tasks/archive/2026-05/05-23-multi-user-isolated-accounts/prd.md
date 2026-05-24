# 多用户管理与独立用户账户

## 来源
用户原话：实现 `多用户管理` 与 `独立用户账户` 功能，参考 https://github.com/ArizeSky/Emby-In-One

## 当前事实（已通过代码与上游 README 确认）
- 本项目 = 单文件 Cloudflare Worker（`worker.js`, 4622 行），按路由前缀反代多台上游 Emby。
- 存储：Cloudflare D1，已有表 `routes / request_stats / visitor_logs`，无用户/会话/进度等表。
- 认证：单一管理员 TOKEN（密码登录），无"用户"概念，登录页只输 TOKEN。
- 参考项目（Emby-In-One）特性摘要：
  - 多用户管理：管理员创建普通用户，分配可访问的上游服务器，可经面板 / REST API / SSH 管理。
  - 独立用户账户：普通用户的观看进度 / 已播放 / 收藏 / 继续观看 / 接下来观看，由代理侧独立存储，与上游共享账户完全隔离；管理员保持原上游行为。
  - 角色权限：管理员完全访问；普通用户只能访问被分配的服务器，禁止访问管理 API。

## Goal
TBD（待"用户语义"问题澄清后落定）

## Requirements
TBD

## Acceptance Criteria
- [ ] TBD

## Out of Scope（暂定）
- `maxConcurrent` 并发播放数限制（与本任务正交，可后续单独立项）。
- 多服务器聚合（合并多上游为单一入口）—— 本 Worker 是前缀反代而非聚合器。

## Open Questions
1. "用户"语义：proxy 用户 ↔ 上游 Emby 账户的映射模型（最关键，未决前无法设计 design.md）。
2. Emby 客户端如何"看到"这个 proxy 用户（登录页 / 用户切换 / Token 兑换）。
3. 独立账户存储范围（仅播放进度？还是含收藏 / 已看 / CW / 设备 / UA）。
4. 用户 ↔ 现有 routes 的关系（每用户白名单 / 全局可见 / 标签分组）。
5. 与现有管理员 TOKEN 的兼容（保留 / 升级到 admin 用户 / 共存）。
