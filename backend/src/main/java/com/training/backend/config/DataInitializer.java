package com.training.backend.config;

import com.training.backend.entity.User;
import com.training.backend.entity.User.UserRole;
import com.training.backend.entity.Project;
import com.training.backend.entity.Project.ProjectStatus;
import com.training.backend.entity.Project.ProjectPhase;
import com.training.backend.entity.Task;
import com.training.backend.entity.Task.TaskStatus;
import com.training.backend.entity.Task.TaskPriority;
import com.training.backend.entity.Evaluation;
import com.training.backend.entity.Evaluation.EvaluationType;
import com.training.backend.entity.WorkRecord;
import com.training.backend.entity.Notification;
import com.training.backend.entity.Notification.NotificationType;
import com.training.backend.repository.UserRepository;
import com.training.backend.repository.ProjectRepository;
import com.training.backend.repository.TaskRepository;
import com.training.backend.repository.EvaluationRepository;
import com.training.backend.repository.WorkRecordRepository;
import com.training.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 数据初始化器
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final EvaluationRepository evaluationRepository;
    private final WorkRecordRepository workRecordRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            log.info("初始化演示数据...");
            initUsers();
            initProjects();
            initTasks();
            initEvaluations();
            initWorkRecords();
            initNotifications();
            log.info("演示数据初始化完成");
        }
    }
    
    /**
     * 初始化用户数据
     */
    private void initUsers() {
        // 管理员
        User admin = new User();
        admin.setUsername("admin");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setName("系统管理员");
        admin.setRole(UserRole.ADMIN);
        admin.setEmail("admin@training.com");
        admin.setPhone("13800000000");
        admin.setDepartment("系统管理部");
        userRepository.save(admin);
        
        // 教师
        User teacher = new User();
        teacher.setUsername("teacher01");
        teacher.setPassword(passwordEncoder.encode("teacher123"));
        teacher.setName("张老师");
        teacher.setRole(UserRole.TEACHER);
        teacher.setEmail("teacher@training.com");
        teacher.setPhone("13800000001");
        teacher.setDepartment("软件工程系");
        userRepository.save(teacher);
        
        // 学生
        User student = new User();
        student.setUsername("student01");
        student.setPassword(passwordEncoder.encode("student123"));
        student.setName("李同学");
        student.setRole(UserRole.STUDENT);
        student.setEmail("student@training.com");
        student.setPhone("13800000002");
        student.setDepartment("软件工程系");
        student.setStudentId("2024001");
        userRepository.save(student);
        
        // 企业导师
        User enterprise = new User();
        enterprise.setUsername("enterprise01");
        enterprise.setPassword(passwordEncoder.encode("enterprise123"));
        enterprise.setName("王工程师");
        enterprise.setRole(UserRole.ENTERPRISE);
        enterprise.setEmail("enterprise@training.com");
        enterprise.setPhone("13800000003");
        enterprise.setDepartment("技术研发部");
        enterprise.setCompany("北京软通动力教育科技有限公司");
        userRepository.save(enterprise);
        
        log.info("用户数据初始化完成");
    }
    
    /**
     * 初始化项目数据
     */
    private void initProjects() {
        User admin = userRepository.findByUsername("admin").orElseThrow();
        
        Project project = new Project();
        project.setName("软件实训管理平台开发");
        project.setDescription("开发一套覆盖软件实训全流程的管理与评价系统");
        project.setCreatedBy(admin);
        project.setStartDate(LocalDate.now());
        project.setEndDate(LocalDate.now().plusMonths(3));
        project.setStatus(ProjectStatus.IN_PROGRESS);
        project.setCurrentPhase(ProjectPhase.DEVELOPMENT);
        
        projectRepository.save(project);
        log.info("项目数据初始化完成");
    }
    
    /**
     * 初始化任务数据
     */
    private void initTasks() {
        User teacher = userRepository.findByUsername("teacher01").orElseThrow();
        User student = userRepository.findByUsername("student01").orElseThrow();
        Project project = projectRepository.findAll().get(0);
        
        // 任务1：需求分析
        Task task1 = new Task();
        task1.setTitle("需求分析文档编写");
        task1.setDescription("完成软件实训管理系统的需求分析文档");
        task1.setCreatedBy(teacher);
        task1.setAssignedTo(student);
        task1.setProject(project);
        task1.setStatus(TaskStatus.IN_PROGRESS);
        task1.setPriority(TaskPriority.HIGH);
        task1.setDueDate(LocalDate.now().plusWeeks(2));
        task1.setStartedAt(LocalDateTime.now().minusDays(3));
        task1.setEstimatedHours(20);
        taskRepository.save(task1);
        
        // 任务2：系统设计
        Task task2 = new Task();
        task2.setTitle("系统设计文档编写");
        task2.setDescription("完成系统的架构设计和数据库设计");
        task2.setCreatedBy(teacher);
        task2.setAssignedTo(student);
        task2.setProject(project);
        task2.setStatus(TaskStatus.PENDING);
        task2.setPriority(TaskPriority.MEDIUM);
        task2.setDueDate(LocalDate.now().plusWeeks(4));
        task2.setEstimatedHours(30);
        taskRepository.save(task2);
        
        // 任务3：前端开发
        Task task3 = new Task();
        task3.setTitle("前端界面开发");
        task3.setDescription("完成系统前端界面的开发工作");
        task3.setCreatedBy(teacher);
        task3.setAssignedTo(student);
        task3.setProject(project);
        task3.setStatus(TaskStatus.PENDING);
        task3.setPriority(TaskPriority.HIGH);
        task3.setDueDate(LocalDate.now().plusWeeks(8));
        task3.setEstimatedHours(80);
        taskRepository.save(task3);
        
        log.info("任务数据初始化完成");
    }
    
    /**
     * 初始化评价数据
     */
    private void initEvaluations() {
        User teacher = userRepository.findByUsername("teacher01").orElseThrow();
        User enterprise = userRepository.findByUsername("enterprise01").orElseThrow();
        User student = userRepository.findByUsername("student01").orElseThrow();
        Project project = projectRepository.findAll().get(0);
        
        // 教师评价
        Evaluation eval1 = new Evaluation();
        eval1.setEvaluator(teacher);
        eval1.setEvaluatee(student);
        eval1.setProject(project);
        eval1.setType(EvaluationType.TEACHER);
        eval1.setTechScore(85);
        eval1.setTeamworkScore(90);
        eval1.setDocumentScore(80);
        eval1.setInnovationScore(75);
        eval1.setAttitudeScore(95);
        eval1.calculateTotalScore();
        eval1.setComment("工作态度认真，团队协作能力强，技术能力有待提高。");
        evaluationRepository.save(eval1);
        
        // 企业评价
        Evaluation eval2 = new Evaluation();
        eval2.setEvaluator(enterprise);
        eval2.setEvaluatee(student);
        eval2.setProject(project);
        eval2.setType(EvaluationType.ENTERPRISE);
        eval2.setTechScore(80);
        eval2.setTeamworkScore(85);
        eval2.setDocumentScore(75);
        eval2.setInnovationScore(70);
        eval2.setAttitudeScore(90);
        eval2.calculateTotalScore();
        eval2.setComment("具备良好的职业素养，能够按时完成任务，建议加强创新能力。");
        evaluationRepository.save(eval2);
        
        log.info("评价数据初始化完成");
    }
    
    /**
     * 初始化工作记录数据
     */
    private void initWorkRecords() {
        User student = userRepository.findByUsername("student01").orElseThrow();
        Project project = projectRepository.findAll().get(0);
        Task task = taskRepository.findAll().get(0);
        
        // 创建几条工作记录
        WorkRecord record1 = new WorkRecord();
        record1.setUser(student);
        record1.setProject(project);
        record1.setTask(task);
        record1.setDate(LocalDate.now().minusDays(2));
        record1.setDuration(4.0);
        record1.setContent("完成了需求分析文档的初稿编写，包括功能需求和非功能需求。");
        record1.setIssues("对部分业务流程理解不够深入。");
        record1.setPlan("与教师沟通，确认业务流程细节。");
        workRecordRepository.save(record1);
        
        WorkRecord record2 = new WorkRecord();
        record2.setUser(student);
        record2.setProject(project);
        record2.setTask(task);
        record2.setDate(LocalDate.now().minusDays(1));
        record2.setDuration(3.5);
        record2.setContent("根据教师反馈修改了需求分析文档，补充了用例图。");
        record2.setIssues("无。");
        record2.setPlan("开始系统设计文档的编写。");
        workRecordRepository.save(record2);
        
        WorkRecord record3 = new WorkRecord();
        record3.setUser(student);
        record3.setProject(project);
        record3.setDate(LocalDate.now());
        record3.setDuration(5.0);
        record3.setContent("学习了系统架构设计方法，开始编写系统设计文档。");
        record3.setIssues("对数据库设计规范不够熟悉。");
        record3.setPlan("继续完善数据库设计，参考相关规范文档。");
        workRecordRepository.save(record3);
        
        log.info("工作记录数据初始化完成");
    }
    
    /**
     * 初始化通知数据
     */
    private void initNotifications() {
        User student = userRepository.findByUsername("student01").orElseThrow();
        User teacher = userRepository.findByUsername("teacher01").orElseThrow();
        
        // 任务通知
        Notification noti1 = new Notification();
        noti1.setUser(student);
        noti1.setType(NotificationType.TASK);
        noti1.setTitle("新任务分配");
        noti1.setContent("您有一个新任务：需求分析文档编写，请尽快查看。");
        noti1.setIsRead(false);
        notificationRepository.save(noti1);
        
        // 评价通知
        Notification noti2 = new Notification();
        noti2.setUser(student);
        noti2.setType(NotificationType.EVALUATION);
        noti2.setTitle("收到新评价");
        noti2.setContent("您收到了一条来自张老师的评价，得分：85分。");
        noti2.setIsRead(false);
        notificationRepository.save(noti2);
        
        // 系统通知
        Notification noti3 = new Notification();
        noti3.setUser(student);
        noti3.setType(NotificationType.SYSTEM);
        noti3.setTitle("系统公告");
        noti3.setContent("欢迎使用软件实训全流程管理与评价系统！如有问题请联系管理员。");
        noti3.setIsRead(true);
        notificationRepository.save(noti3);
        
        log.info("通知数据初始化完成");
    }
}
