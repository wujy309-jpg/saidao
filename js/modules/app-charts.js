/**
 * 数据可视化模块 - 甘特图、学习曲线、高级图表
 */

const ChartManager = {
    charts: {},
    
    init() {
        console.log('[ChartManager] 数据可视化模块已初始化');
    },
    
    createGanttChart(containerId, tasks) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        const chartContainer = document.createElement('div');
        chartContainer.className = 'gantt-chart';
        
        const header = document.createElement('div');
        header.className = 'gantt-header';
        header.innerHTML = `
            <div class="gantt-task-list-header">任务名称</div>
            <div class="gantt-timeline-header">
                <div class="gantt-dates"></div>
            </div>
        `;
        chartContainer.appendChild(header);
        
        const body = document.createElement('div');
        body.className = 'gantt-body';
        
        if (!tasks || tasks.length === 0) {
            body.innerHTML = '<div class="empty-state">暂无任务数据</div>';
            chartContainer.appendChild(body);
            container.appendChild(chartContainer);
            return;
        }
        
        const startDate = this.getGanttStartDate(tasks);
        const endDate = this.getGanttEndDate(tasks);
        const totalDays = this.daysBetween(startDate, endDate) + 1;
        
        const datesContainer = header.querySelector('.gantt-dates');
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateEl = document.createElement('span');
            dateEl.className = 'gantt-date';
            dateEl.textContent = `${date.getMonth() + 1}/${date.getDate()}`;
            datesContainer.appendChild(dateEl);
        }
        
        tasks.forEach(task => {
            const row = document.createElement('div');
            row.className = 'gantt-row';
            
            const taskStart = new Date(task.startedAt || task.createdAt);
            const taskEnd = task.completedAt ? new Date(task.completedAt) : new Date();
            const startOffset = this.daysBetween(startDate, taskStart);
            const duration = this.daysBetween(taskStart, taskEnd) + 1;
            
            row.innerHTML = `
                <div class="gantt-task-name">
                    <span class="gantt-task-title">${task.title}</span>
                    <span class="gantt-task-status status-${task.status}">${this.getStatusLabel(task.status)}</span>
                </div>
                <div class="gantt-timeline">
                    <div class="gantt-bar gantt-bar-${task.status}" 
                         style="left: ${(startOffset / totalDays) * 100}%; width: ${(duration / totalDays) * 100}%"
                         title="${task.title}: ${taskStart.toLocaleDateString()} - ${taskEnd.toLocaleDateString()}">
                    </div>
                </div>
            `;
            
            body.appendChild(row);
        });
        
        chartContainer.appendChild(body);
        container.appendChild(chartContainer);
    },
    
    getGanttStartDate(tasks) {
        const dates = tasks
            .filter(t => t.startedAt || t.createdAt)
            .map(t => new Date(t.startedAt || t.createdAt));
        return new Date(Math.min(...dates));
    },
    
    getGanttEndDate(tasks) {
        const dates = tasks
            .filter(t => t.completedAt)
            .map(t => new Date(t.completedAt));
        dates.push(new Date());
        return new Date(Math.max(...dates));
    },
    
    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round(Math.abs((date2 - date1) / oneDay));
    },
    
    getStatusLabel(status) {
        const labels = {
            'PENDING': '待开始',
            'IN_PROGRESS': '进行中',
            'SUBMITTED': '已提交',
            'REVIEWING': '审核中',
            'APPROVED': '已通过',
            'REJECTED': '已驳回',
            'COMPLETED': '已完成'
        };
        return labels[status] || status;
    },
    
    createLearningCurveChart(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container || typeof echarts === 'undefined') return;
        
        if (this.charts[containerId]) {
            this.charts[containerId].dispose();
        }
        
        const chart = echarts.init(container);
        this.charts[containerId] = chart;
        
        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            legend: {
                data: ['任务完成数', '平均评分', '学习时长']
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.dates || []
            },
            yAxis: [
                {
                    type: 'value',
                    name: '任务数',
                    position: 'left'
                },
                {
                    type: 'value',
                    name: '评分',
                    position: 'right',
                    max: 100
                }
            ],
            series: [
                {
                    name: '任务完成数',
                    type: 'line',
                    smooth: true,
                    data: data.completedTasks || [],
                    areaStyle: {
                        opacity: 0.3
                    },
                    itemStyle: {
                        color: '#3b82f6'
                    }
                },
                {
                    name: '平均评分',
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    data: data.averageScores || [],
                    itemStyle: {
                        color: '#10b981'
                    }
                },
                {
                    name: '学习时长',
                    type: 'bar',
                    data: data.learningHours || [],
                    itemStyle: {
                        color: '#8b5cf6'
                    }
                }
            ]
        };
        
        chart.setOption(option);
        
        window.addEventListener('resize', () => chart.resize());
    },
    
    createSkillRadarChart(containerId, skills) {
        const container = document.getElementById(containerId);
        if (!container || typeof echarts === 'undefined') return;
        
        if (this.charts[containerId]) {
            this.charts[containerId].dispose();
        }
        
        const chart = echarts.init(container);
        this.charts[containerId] = chart;
        
        const option = {
            tooltip: {},
            radar: {
                indicator: skills.map(s => ({
                    name: s.name,
                    max: 100
                }))
            },
            series: [{
                type: 'radar',
                data: [{
                    value: skills.map(s => s.score),
                    name: '技能水平',
                    areaStyle: {
                        opacity: 0.3
                    }
                }]
            }]
        };
        
        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
    },
    
    createProgressChart(containerId, projects) {
        const container = document.getElementById(containerId);
        if (!container || typeof echarts === 'undefined') return;
        
        if (this.charts[containerId]) {
            this.charts[containerId].dispose();
        }
        
        const chart = echarts.init(container);
        this.charts[containerId] = chart;
        
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left'
            },
            series: [{
                name: '项目状态',
                type: 'pie',
                radius: '50%',
                data: [
                    { value: projects.filter(p => p.status === 'COMPLETED').length, name: '已完成' },
                    { value: projects.filter(p => p.status === 'IN_PROGRESS').length, name: '进行中' },
                    { value: projects.filter(p => p.status === 'PLANNING').length, name: '计划中' },
                    { value: projects.filter(p => p.status === 'ON_HOLD').length, name: '已暂停' }
                ],
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
    },
    
    createTeamPerformanceChart(containerId, teamData) {
        const container = document.getElementById(containerId);
        if (!container || typeof echarts === 'undefined') return;
        
        if (this.charts[containerId]) {
            this.charts[containerId].dispose();
        }
        
        const chart = echarts.init(container);
        this.charts[containerId] = chart;
        
        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            legend: {
                data: ['完成任务', '平均评分']
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: teamData.members || []
            },
            yAxis: [
                {
                    type: 'value',
                    name: '任务数'
                },
                {
                    type: 'value',
                    name: '评分',
                    max: 100
                }
            ],
            series: [
                {
                    name: '完成任务',
                    type: 'bar',
                    data: teamData.completedTasks || []
                },
                {
                    name: '平均评分',
                    type: 'line',
                    yAxisIndex: 1,
                    data: teamData.averageScores || [],
                    smooth: true
                }
            ]
        };
        
        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
    },
    
    disposeAll() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.dispose) {
                chart.dispose();
            }
        });
        this.charts = {};
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ChartManager.init();
});
