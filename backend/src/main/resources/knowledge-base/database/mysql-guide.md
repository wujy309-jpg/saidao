# 数据库实训知识库

## 1. MySQL基础

### 1.1 数据类型
- 数值: INT, BIGINT, DECIMAL
- 字符串: VARCHAR, TEXT, CHAR
- 日期: DATE, DATETIME, TIMESTAMP
- 二进制: BLOB

### 1.2 SQL语句
- DDL: CREATE, ALTER, DROP
- DML: INSERT, UPDATE, DELETE
- DQL: SELECT, WHERE, JOIN
- DCL: GRANT, REVOKE

### 1.3 索引
- 主键索引
- 唯一索引
- 普通索引
- 复合索引

## 2. 数据库设计

### 2.1 范式
- 第一范式: 原子性
- 第二范式: 完全依赖
- 第三范式: 消除传递依赖

### 2.2 ER图
- 实体
- 属性
- 关系

### 2.3 表设计
- 命名规范
- 字段选择
- 主键设计

## 3. 查询优化

### 3.1 索引优化
- 最左前缀原则
- 覆盖索引
- 索引失效场景

### 3.2 查询优化
- 避免SELECT *
- 减少子查询
- 使用JOIN替代子查询

### 3.3 慢查询分析
- EXPLAIN命令
- 慢查询日志
- 性能监控

## 4. 事务与锁

### 4.1 事务特性(ACID)
- 原子性
- 一致性
- 隔离性
- 持久性

### 4.2 隔离级别
- READ UNCOMMITTED
- READ COMMITTED
- REPEATABLE READ
- SERIALIZABLE

### 4.3 锁机制
- 行锁
- 表锁
- 乐观锁
- 悲观锁

## 5. 常见问题

### 5.1 N+1查询
- 问题描述
- 解决方案

### 5.2 死锁
- 产生原因
- 预防措施

### 5.3 数据一致性
- 分布式事务
- 最终一致性
