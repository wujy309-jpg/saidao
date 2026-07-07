# Java实训知识库

## 1. Java基础

### 1.1 面向对象编程
- **封装**: 将数据和操作数据的方法绑定在一起，隐藏内部实现细节
- **继承**: 子类继承父类的属性和方法，实现代码复用
- **多态**: 同一接口不同实现，包括方法重载和方法重写
- **抽象**: 将共性抽取为抽象类或接口

### 1.2 常用集合
- **ArrayList**: 基于数组实现，随机访问快，插入删除慢
- **LinkedList**: 基于链表实现，插入删除快，随机访问慢
- **HashMap**: 基于哈希表实现，键值对存储，O(1)查找
- **TreeMap**: 基于红黑树实现，有序存储，O(logN)查找

### 1.3 异常处理
- **受检异常**: 必须处理，如IOException
- **非受检异常**: RuntimeException及其子类
- **自定义异常**: 继承Exception或RuntimeException

## 2. Spring Boot

### 2.1 核心注解
- `@SpringBootApplication`: 启动类注解
- `@RestController`: RESTful控制器
- `@Service`: 服务层注解
- `@Repository`: 数据访问层注解
- `@Component`: 通用组件注解
- `@Autowired`: 依赖注入

### 2.2 RESTful API设计
- GET: 查询资源
- POST: 创建资源
- PUT: 更新资源
- DELETE: 删除资源
- 路径命名使用名词复数形式

### 2.3 数据验证
- `@NotNull`: 非空
- `@Size`: 大小限制
- `@Email`: 邮箱格式
- `@Pattern`: 正则匹配

## 3. JPA/Hibernate

### 3.1 实体映射
- `@Entity`: 实体类
- `@Table`: 表映射
- `@Id`: 主键
- `@GeneratedValue`: 主键生成策略
- `@Column`: 字段映射

### 3.2 关联关系
- `@OneToOne`: 一对一
- `@OneToMany`: 一对多
- `@ManyToOne`: 多对一
- `@ManyToMany`: 多对多

### 3.3 查询方式
- 方法名查询: findByXxx()
- JPQL: @Query注解
- 原生SQL: nativeQuery=true

## 4. 常见问题

### 4.1 N+1查询问题
**问题**: 查询关联对象时产生大量SQL
**解决**: 
- 使用JOIN FETCH
- 使用@EntityGraph
- 配置批量抓取

### 4.2 事务管理
- `@Transactional`: 声明式事务
- 事务传播机制: REQUIRED, REQUIRES_NEW等
- 事务隔离级别: READ_COMMITTED等

### 4.3 性能优化
- 合理使用缓存
- 避免循环依赖
- 使用分页查询
- 索引优化
