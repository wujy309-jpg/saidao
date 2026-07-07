/**
 * 性能优化模块 - 懒加载、资源压缩、缓存管理
 */

const PerformanceOptimizer = {
    // 图片懒加载观察器
    imageObserver: null,
    
    // 资源加载缓存
    resourceCache: new Map(),
    
    // 初始化性能优化
    init() {
        this.initImageLazyLoading();
        this.initResourcePreloading();
        this.initServiceWorker();
        this.initPerformanceMonitoring();
        console.log('[Performance] 性能优化模块已初始化');
    },
    
    // 图片懒加载
    initImageLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            this.imageObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px'
            });
            
            this.observeImages();
        }
    },
    
    // 观察所有懒加载图片
    observeImages() {
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.imageObserver.observe(img);
        });
    },
    
    // 资源预加载
    initResourcePreloading() {
        const criticalResources = [
            '/css/style.css',
            '/js/app.js',
            '/js/api.js'
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource;
            link.as = resource.endsWith('.css') ? 'style' : 'script';
            document.head.appendChild(link);
        });
    },
    
    // Service Worker 缓存
    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('[Performance] Service Worker 注册成功');
                })
                .catch(error => {
                    console.log('[Performance] Service Worker 注册失败:', error);
                });
        }
    },
    
    // 性能监控
    initPerformanceMonitoring() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData) {
                        console.log('[Performance] 页面加载时间:', Math.round(perfData.loadEventEnd - perfData.startTime), 'ms');
                        console.log('[Performance] DOM解析时间:', Math.round(perfData.domContentLoadedEventEnd - perfData.startTime), 'ms');
                    }
                }, 0);
            });
        }
    },
    
    // 延迟加载非关键资源
    loadNonCriticalResources() {
        const nonCriticalCSS = [
            '/css/animations.css',
            '/css/code-repo.css'
        ];
        
        nonCriticalCSS.forEach(css => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = css;
            link.media = 'print';
            link.onload = function() {
                this.media = 'all';
            };
            document.head.appendChild(link);
        });
    },
    
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // 虚拟滚动实现
    createVirtualScroller(container, items, itemHeight, renderFunction) {
        const totalHeight = items.length * itemHeight;
        const visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
        
        const wrapper = document.createElement('div');
        wrapper.style.height = totalHeight + 'px';
        wrapper.style.position = 'relative';
        container.appendChild(wrapper);
        
        let lastStartIndex = -1;
        
        const updateVisibleItems = this.throttle(() => {
            const scrollTop = container.scrollTop;
            const startIndex = Math.floor(scrollTop / itemHeight);
            
            if (startIndex === lastStartIndex) return;
            lastStartIndex = startIndex;
            
            const endIndex = Math.min(startIndex + visibleItems, items.length);
            
            wrapper.innerHTML = '';
            
            for (let i = startIndex; i < endIndex; i++) {
                const item = items[i];
                const element = renderFunction(item, i);
                element.style.position = 'absolute';
                element.style.top = (i * itemHeight) + 'px';
                element.style.width = '100%';
                wrapper.appendChild(element);
            }
        }, 16);
        
        container.addEventListener('scroll', updateVisibleItems);
        updateVisibleItems();
        
        return {
            update: (newItems) => {
                items = newItems;
                wrapper.style.height = (items.length * itemHeight) + 'px';
                lastStartIndex = -1;
                updateVisibleItems();
            }
        };
    },
    
    // 缓存管理
    cache: {
        set(key, value, ttl = 300000) {
            const item = {
                value,
                expiry: Date.now() + ttl
            };
            localStorage.setItem('cache_' + key, JSON.stringify(item));
        },
        
        get(key) {
            const itemStr = localStorage.getItem('cache_' + key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            if (Date.now() > item.expiry) {
                localStorage.removeItem('cache_' + key);
                return null;
            }
            
            return item.value;
        },
        
        remove(key) {
            localStorage.removeItem('cache_' + key);
        },
        
        clear() {
            Object.keys(localStorage)
                .filter(key => key.startsWith('cache_'))
                .forEach(key => localStorage.removeItem(key));
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    PerformanceOptimizer.init();
    
    // 延迟加载非关键资源
    setTimeout(() => {
        PerformanceOptimizer.loadNonCriticalResources();
    }, 1000);
});
