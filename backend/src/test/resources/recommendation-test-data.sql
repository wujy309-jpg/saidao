-- 清理旧测试数据（保证幂等）
DELETE FROM competition_disciplines WHERE competition_id BETWEEN 9000 AND 9039;
DELETE FROM competition_tags WHERE competition_id BETWEEN 9000 AND 9039;
DELETE FROM competition_grades WHERE competition_id BETWEEN 9000 AND 9039;
DELETE FROM competitions WHERE id BETWEEN 9000 AND 9039;

-- ====== 原有艺术类竞赛种子数据（6 条，LIBERAL_ARTS 类别 + 艺术关键词） ======

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9000, '全国大学生艺术展演', 'LIBERAL_ARTS', 'NATIONAL', 'INDIVIDUAL', 2, 3, 'ACTIVE', '教育部', '全国大学生艺术展演，含声乐、器乐、舞蹈、戏剧等', true, '免费', '教育部竞赛目录', '2026-06-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9000, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9000, '音乐');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9000, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9000, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9000, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9000, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9000, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9000, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9000, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9000, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9001, '全国高校数字艺术设计大赛', 'LIBERAL_ARTS', 'NATIONAL', 'TEAM', 3, 3, 'ACTIVE', '中国数字艺术委员会', '数字艺术、动画、游戏设计等', true, '免费', '高教学会榜单', '2026-05-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9001, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9001, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9001, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9001, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9001, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9001, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9001, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9002, '中国大学生书法大赛', 'LIBERAL_ARTS', 'NATIONAL', 'INDIVIDUAL', 1, 2, 'ACTIVE', '中国书法家协会', '书法与篆刻创作比赛', false, '免费', '其他', '2026-04-10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9002, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9002, '书法');
INSERT INTO competition_tags (competition_id, tag) VALUES (9002, '书法');
INSERT INTO competition_tags (competition_id, tag) VALUES (9002, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9002, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9002, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9002, 3);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9003, '全国大学生舞蹈比赛', 'LIBERAL_ARTS', 'NATIONAL', 'TEAM', 2, 2, 'ACTIVE', '中国舞蹈家协会', '群舞、独舞、现代舞等', false, '免费', '其他', '2026-07-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9003, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9003, '舞蹈');
INSERT INTO competition_tags (competition_id, tag) VALUES (9003, '舞蹈');
INSERT INTO competition_tags (competition_id, tag) VALUES (9003, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9003, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9003, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9003, 3);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9004, '全国高校影视创作大赛', 'LIBERAL_ARTS', 'NATIONAL', 'TEAM', 3, 3, 'ACTIVE', '中国电影家协会', '短片、纪录片、微电影创作', true, '免费', '高教学会榜单', '2026-06-30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9004, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9004, '影视创作');
INSERT INTO competition_tags (competition_id, tag) VALUES (9004, '影视创作');
INSERT INTO competition_tags (competition_id, tag) VALUES (9004, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9004, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9004, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9004, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9005, '全国大学生音乐表演赛', 'LIBERAL_ARTS', 'NATIONAL', 'INDIVIDUAL', 2, 2, 'ACTIVE', '中国音乐家协会', '声乐、器乐独奏与合奏', false, '免费', '其他', '2026-05-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9005, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9005, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9005, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9005, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9005, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9005, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9005, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9005, 4);

-- ====== 非艺术类竞赛种子数据（4 条，确保非艺术学科也有 >= 8 条 ACTIVE 竞赛） ======

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9006, '全国大学生数学建模竞赛', 'SCIENCE', 'NATIONAL', 'TEAM', 4, 5, 'ACTIVE', '中国工业与应用数学学会', '数学建模竞赛', true, '免费', '教育部竞赛目录', '2026-09-10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9006, '理科');
INSERT INTO competition_tags (competition_id, tag) VALUES (9006, '数据分析');
INSERT INTO competition_tags (competition_id, tag) VALUES (9006, '数学');
INSERT INTO competition_grades (competition_id, grade) VALUES (9006, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9006, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9006, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9007, '全国大学生电子设计竞赛', 'ENGINEERING', 'NATIONAL', 'TEAM', 4, 5, 'ACTIVE', '教育部', '电子设计自动化', true, '免费', '教育部竞赛目录', '2026-08-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9007, '工科');
INSERT INTO competition_tags (competition_id, tag) VALUES (9007, '电路设计');
INSERT INTO competition_tags (competition_id, tag) VALUES (9007, '单片机');
INSERT INTO competition_grades (competition_id, grade) VALUES (9007, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9007, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9007, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9008, '全国大学生创新创业大赛', 'COMPREHENSIVE', 'NATIONAL', 'TEAM', 3, 5, 'ACTIVE', '教育部', '创新创业大赛', true, '免费', '教育部竞赛目录', '2026-10-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9008, '工科');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9008, '经管');
INSERT INTO competition_tags (competition_id, tag) VALUES (9008, '创新创业');
INSERT INTO competition_tags (competition_id, tag) VALUES (9008, '商业分析');
INSERT INTO competition_grades (competition_id, grade) VALUES (9008, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9008, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9008, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9008, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9009, '外研社杯全国英语演讲大赛', 'COMPREHENSIVE', 'NATIONAL', 'INDIVIDUAL', 2, 4, 'ACTIVE', '外语教学与研究出版社', '英语演讲比赛', true, '免费', '高教学会榜单', '2026-11-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9009, '文科');
INSERT INTO competition_tags (competition_id, tag) VALUES (9009, '英语口语');
INSERT INTO competition_tags (competition_id, tag) VALUES (9009, '写作');
INSERT INTO competition_grades (competition_id, grade) VALUES (9009, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9009, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9009, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9009, 4);

-- ====== 扩展艺术类竞赛种子数据（24 条，覆盖 8 个艺术学科 + 3 个级别） ======

-- --- 音乐类（9010-9013）---
INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9010, '省级高校声乐大赛', 'LIBERAL_ARTS', 'PROVINCIAL', 'INDIVIDUAL', 2, 2, 'ACTIVE', '省教育厅', '声乐独唱与合唱比赛', false, '免费', '省级竞赛', '2026-04-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9010, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9010, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9010, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9010, '声乐');
INSERT INTO competition_grades (competition_id, grade) VALUES (9010, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9010, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9010, 3);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9011, '校级器乐演奏比赛', 'LIBERAL_ARTS', 'SCHOOL', 'INDIVIDUAL', 1, 1, 'ACTIVE', '校团委', '钢琴、小提琴、古筝等器乐比赛', false, '免费', '校级竞赛', '2026-05-10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9011, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9011, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9011, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9011, '乐器');
INSERT INTO competition_grades (competition_id, grade) VALUES (9011, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9011, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9011, 3);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9012, '全国高校原创音乐大赛', 'LIBERAL_ARTS', 'NATIONAL', 'TEAM', 3, 3, 'ACTIVE', '中国音乐家协会', '原创歌曲创作与编曲', true, '免费', '高教学会榜单', '2026-08-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9012, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9012, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9012, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9012, '声乐');
INSERT INTO competition_grades (competition_id, grade) VALUES (9012, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9012, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9012, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9013, '省级大学生合唱节', 'LIBERAL_ARTS', 'PROVINCIAL', 'TEAM', 2, 2, 'ACTIVE', '省文旅厅', '高校合唱团比赛', false, '免费', '省级竞赛', '2026-06-05', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9013, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9013, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9013, '音乐');
INSERT INTO competition_tags (competition_id, tag) VALUES (9013, '声乐');
INSERT INTO competition_grades (competition_id, grade) VALUES (9013, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9013, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9013, 3);

-- --- 美术/绘画类（9014-9016）---
INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9014, '省级高校美术作品展', 'LIBERAL_ARTS', 'PROVINCIAL', 'INDIVIDUAL', 2, 2, 'ACTIVE', '省美协', '油画、国画、水彩等美术作品', false, '免费', '省级竞赛', '2026-05-25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9014, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9014, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9014, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9014, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9014, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9014, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9014, 3);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9015, '校级大学生绘画比赛', 'LIBERAL_ARTS', 'SCHOOL', 'INDIVIDUAL', 1, 1, 'ACTIVE', '校团委', '校园写生与创意绘画', false, '免费', '校级竞赛', '2026-04-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9015, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9015, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9015, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9015, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9015, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9015, 2);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9016, '全国高校插画艺术大赛', 'LIBERAL_ARTS', 'NATIONAL', 'INDIVIDUAL', 3, 3, 'ACTIVE', '中国插画艺术委员会', '商业插画、绘本插画创作', true, '免费', '高教学会榜单', '2026-09-05', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9016, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9016, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9016, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9016, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9016, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9016, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9016, 4);

-- --- 设计类（9017-9019）---
INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9017, '全国大学生视觉设计大赛', 'LIBERAL_ARTS', 'NATIONAL', 'INDIVIDUAL', 3, 3, 'ACTIVE', '中国设计师协会', '平面设计、品牌设计、海报设计', true, '免费', '高教学会榜单', '2026-07-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9017, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9017, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9017, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9017, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9017, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9017, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9017, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9018, '省级高校工业设计竞赛', 'LIBERAL_ARTS', 'PROVINCIAL', 'TEAM', 2, 2, 'ACTIVE', '省工信厅', '产品设计与工业创新', false, '免费', '省级竞赛', '2026-06-18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9018, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9018, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9018, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9018, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9018, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9018, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9018, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9019, '校级UI设计挑战赛', 'LIBERAL_ARTS', 'SCHOOL', 'INDIVIDUAL', 1, 1, 'ACTIVE', '计算机学院', '移动应用与网页界面设计', false, '免费', '校级竞赛', '2026-03-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9019, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9019, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9019, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9019, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9019, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9019, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9019, 3);

-- --- 书法类（9020-9021）---
INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9020, '省级大学生书法篆刻展', 'LIBERAL_ARTS', 'PROVINCIAL', 'INDIVIDUAL', 2, 2, 'ACTIVE', '省书协', '毛笔书法、硬笔书法、篆刻', false, '免费', '省级竞赛', '2026-05-08', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9020, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9020, '书法');
INSERT INTO competition_tags (competition_id, tag) VALUES (9020, '书法');
INSERT INTO competition_tags (competition_id, tag) VALUES (9020, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9020, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9020, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9020, 3);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9021, '校级硬笔书法大赛', 'LIBERAL_ARTS', 'SCHOOL', 'INDIVIDUAL', 1, 1, 'ACTIVE', '校语委', '硬笔书法创作比赛', false, '免费', '校级竞赛', '2026-04-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9021, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9021, '书法');
INSERT INTO competition_tags (competition_id, tag) VALUES (9021, '书法');
INSERT INTO competition_tags (competition_id, tag) VALUES (9021, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9021, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9021, 2);

-- --- 摄影类（9022-9024）---
INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9022, '全国高校摄影艺术大展', 'LIBERAL_ARTS', 'NATIONAL', 'INDIVIDUAL', 2, 3, 'ACTIVE', '中国摄影家协会', '纪实摄影、艺术摄影、创意摄影', true, '免费', '高教学会榜单', '2026-08-10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9022, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9022, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9022, '摄影');
INSERT INTO competition_tags (competition_id, tag) VALUES (9022, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9022, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9022, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9022, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9022, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9023, '省级大学生摄影比赛', 'LIBERAL_ARTS', 'PROVINCIAL', 'INDIVIDUAL', 1, 2, 'ACTIVE', '省摄协', '校园生活主题摄影', false, '免费', '省级竞赛', '2026-05-30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9023, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9023, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9023, '摄影');
INSERT INTO competition_tags (competition_id, tag) VALUES (9023, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9023, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9023, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9023, 3);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9024, '校级手机摄影大赛', 'LIBERAL_ARTS', 'SCHOOL', 'INDIVIDUAL', 1, 1, 'ACTIVE', '校传媒中心', '手机摄影创作比赛', false, '免费', '校级竞赛', '2026-03-25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9024, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9024, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9024, '摄影');
INSERT INTO competition_tags (competition_id, tag) VALUES (9024, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9024, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9024, 2);

-- --- 影视类（9025-9027）---
INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9025, '省级大学生微电影大赛', 'LIBERAL_ARTS', 'PROVINCIAL', 'TEAM', 2, 2, 'ACTIVE', '省广电局', '剧情短片、纪录片创作', false, '免费', '省级竞赛', '2026-06-22', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9025, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9025, '影视创作');
INSERT INTO competition_tags (competition_id, tag) VALUES (9025, '影视创作');
INSERT INTO competition_tags (competition_id, tag) VALUES (9025, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9025, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9025, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9025, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9026, '校级短视频创作比赛', 'LIBERAL_ARTS', 'SCHOOL', 'INDIVIDUAL', 1, 1, 'ACTIVE', '校传媒中心', '短视频脚本与剪辑创作', false, '免费', '校级竞赛', '2026-04-08', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9026, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9026, '影视创作');
INSERT INTO competition_tags (competition_id, tag) VALUES (9026, '影视创作');
INSERT INTO competition_tags (competition_id, tag) VALUES (9026, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9026, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9026, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9026, 3);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9027, '全国大学生纪录片创作大赛', 'LIBERAL_ARTS', 'NATIONAL', 'TEAM', 3, 3, 'ACTIVE', '中国纪录片协会', '纪录片策划、拍摄与后期', true, '免费', '高教学会榜单', '2026-09-25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9027, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9027, '影视创作');
INSERT INTO competition_tags (competition_id, tag) VALUES (9027, '影视创作');
INSERT INTO competition_tags (competition_id, tag) VALUES (9027, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9027, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9027, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9027, 4);

-- --- 戏剧/表演类（9028-9030）---
INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9028, '全国高校戏剧节', 'LIBERAL_ARTS', 'NATIONAL', 'TEAM', 3, 3, 'ACTIVE', '中国戏剧家协会', '话剧、音乐剧、戏曲展演', true, '免费', '高教学会榜单', '2026-10-10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9028, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9028, '舞蹈');
INSERT INTO competition_tags (competition_id, tag) VALUES (9028, '表演');
INSERT INTO competition_tags (competition_id, tag) VALUES (9028, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9028, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9028, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9028, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9028, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9029, '省级高校话剧大赛', 'LIBERAL_ARTS', 'PROVINCIAL', 'TEAM', 2, 2, 'ACTIVE', '省文旅厅', '校园话剧创作与表演', false, '免费', '省级竞赛', '2026-07-08', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9029, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9029, '舞蹈');
INSERT INTO competition_tags (competition_id, tag) VALUES (9029, '表演');
INSERT INTO competition_tags (competition_id, tag) VALUES (9029, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9029, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9029, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9029, 3);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9030, '校级舞台表演挑战赛', 'LIBERAL_ARTS', 'SCHOOL', 'INDIVIDUAL', 1, 1, 'ACTIVE', '校艺术学院', '独白、即兴表演、角色塑造', false, '免费', '校级竞赛', '2026-05-02', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9030, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9030, '舞蹈');
INSERT INTO competition_tags (competition_id, tag) VALUES (9030, '表演');
INSERT INTO competition_tags (competition_id, tag) VALUES (9030, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9030, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9030, 2);

-- --- 动画类（9031-9033）---
INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9031, '全国大学生动画设计大赛', 'LIBERAL_ARTS', 'NATIONAL', 'INDIVIDUAL', 3, 3, 'ACTIVE', '中国动画学会', '2D/3D动画短片创作', true, '免费', '高教学会榜单', '2026-08-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9031, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9031, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9031, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9031, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9031, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9031, 3);
INSERT INTO competition_grades (competition_id, grade) VALUES (9031, 4);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9032, '省级高校动漫创作比赛', 'LIBERAL_ARTS', 'PROVINCIAL', 'TEAM', 2, 2, 'ACTIVE', '省动漫协会', '动漫角色设计与故事创作', false, '免费', '省级竞赛', '2026-06-12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9032, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9032, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9032, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9032, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9032, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9032, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9032, 3);

INSERT INTO competitions (id, name, category, level, format, difficulty, prestige, status, organizer, description, baoyan_bonus, entry_fee, catalog_list, competition_date, created_at, updated_at)
VALUES (9033, '校级定格动画比赛', 'LIBERAL_ARTS', 'SCHOOL', 'INDIVIDUAL', 1, 1, 'ACTIVE', '校传媒学院', '定格动画短片创作', false, '免费', '校级竞赛', '2026-04-18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9033, '艺术');
INSERT INTO competition_disciplines (competition_id, discipline) VALUES (9033, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9033, '绘画');
INSERT INTO competition_tags (competition_id, tag) VALUES (9033, '艺术');
INSERT INTO competition_grades (competition_id, grade) VALUES (9033, 1);
INSERT INTO competition_grades (competition_id, grade) VALUES (9033, 2);
INSERT INTO competition_grades (competition_id, grade) VALUES (9033, 3);
