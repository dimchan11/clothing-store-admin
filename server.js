const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());

// Обслуживаем статические файлы из текущей директории
app.use(express.static(__dirname));

// Корневой маршрут - отдаем HTML
app.get('/', (req, res) => {
    // Пытаемся отправить index.html
    const indexPath = path.join(__dirname, 'index.html');
    
    // Проверяем существование файла
    fs.access(indexPath)
        .then(() => {
            res.sendFile(indexPath);
        })
        .catch(() => {
            // Если файл не найден, отправляем простой HTML
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Магазин одежды - Админ панель</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                        .container { max-width: 800px; margin: 0 auto; }
                        .btn { 
                            display: inline-block; 
                            padding: 10px 20px; 
                            background: #3498db; 
                            color: white; 
                            text-decoration: none; 
                            border-radius: 5px; 
                            margin: 10px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>👕 Магазин одежды - Админ панель</h1>
                        <p>Файл index.html не найден. Пожалуйста, убедитесь что он находится в корневой директории.</p>
                        <p>Доступные API маршруты:</p>
                        <a href="/api/items" class="btn">📦 Все товары</a>
                        <a href="/health" class="btn">❤️ Проверка здоровья</a>
                        <a href="/test" class="btn">🔧 Тест</a>
                    </div>
                </body>
                </html>
            `);
        });
});

// Загружаем данные из файла (или создаем новый)
async function loadData() {
    try {
        // Проверяем, существует ли файл
        try {
            await fs.access(DATA_FILE);
        } catch {
            // Файла нет - создаем с демо-данными
            const demoData = getDemoData();
            await saveData(demoData);
            return demoData;
        }
        
        // Читаем существующий файл
        const data = await fs.readFile(DATA_FILE, 'utf8');
        
        // Проверяем, не пустой ли файл
        if (!data.trim()) {
            const demoData = getDemoData();
            await saveData(demoData);
            return demoData;
        }
        
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        // Возвращаем демо-данные в случае ошибки
        return getDemoData();
    }
}

// Демо-данные по умолчанию
function getDemoData() {
    return [
        { 
            id: 1, 
            name: "Черная футболка Premium", 
            image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop&crop=center",
            sizes: { S: 15, M: 22, L: 18, XL: 10, XXL: 5 }
        },
        { 
            id: 2, 
            name: "Синие джинсы Slim Fit", 
            image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&h=500&fit=crop&crop=center",
            sizes: { S: 8, M: 25, L: 30, XL: 15, XXL: 7 }
        },
        { 
            id: 3, 
            name: "Красное вечернее платье", 
            image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=500&fit=crop&crop=center",
            sizes: { S: 12, M: 20, L: 15, XL: 8, XXL: 3 }
        },
        { 
            id: 4, 
            name: "Белая рубашка офисная", 
            image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&h=500&fit=crop&crop=center",
            sizes: { S: 10, M: 18, L: 22, XL: 12, XXL: 6 }
        }
    ];
}

// Сохраняем данные в файл
async function saveData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Данные сохранены в файл');
        return true;
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
        // В случае ошибки записи, просто логируем
        return false;
    }
}

// Генерируем новый ID
function generateId(items) {
    const maxId = items.reduce((max, item) => Math.max(max, item.id || 0), 0);
    return maxId + 1;
}

// ========== API РОУТЫ ==========

// Получить все товары
app.get('/api/items', async (req, res) => {
    try {
        console.log('GET /api/items - Запрос всех товаров');
        const data = await loadData();
        res.json(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        // В случае ошибки отправляем демо-данные
        res.json(getDemoData());
    }
});

// Добавить новый товар
app.post('/api/items', async (req, res) => {
    try {
        const { name, image, sizes } = req.body;
        console.log('POST /api/items - Добавление товара:', { name, image, sizes });
        
        if (!name || !image) {
            return res.status(400).json({ 
                error: 'Название и изображение обязательны',
                received: { name, image }
            });
        }
        
        const data = await loadData();
        const newItem = {
            id: generateId(data),
            name: name.trim(),
            image: image.trim(),
            sizes: sizes || { S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
        };
        
        data.push(newItem);
        const saved = await saveData(data);
        
        if (!saved) {
            console.warn('Данные не сохранены на диск, но добавлены в память');
        }
        
        console.log('Товар добавлен, ID:', newItem.id);
        res.status(201).json(newItem);
    } catch (error) {
        console.error('Ошибка добавления товара:', error);
        res.status(500).json({ 
            error: 'Ошибка добавления товара',
            message: error.message
        });
    }
});

// Обновить товар
app.put('/api/items/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { sizes } = req.body;
        console.log(`PUT /api/items/${id} - Обновление размеров:`, sizes);
        
        const data = await loadData();
        const itemIndex = data.findIndex(item => item.id === id);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        data[itemIndex].sizes = sizes;
        const saved = await saveData(data);
        
        if (!saved) {
            console.warn('Данные не сохранены на диск, но обновлены в памяти');
        }
        
        res.json(data[itemIndex]);
    } catch (error) {
        console.error('Ошибка обновления товара:', error);
        res.status(500).json({ 
            error: 'Ошибка обновления данных',
            message: error.message
        });
    }
});

// Удалить товар
app.delete('/api/items/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        console.log(`DELETE /api/items/${id} - Удаление товара`);
        
        const data = await loadData();
        const itemIndex = data.findIndex(item => item.id === id);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const deletedItem = data.splice(itemIndex, 1)[0];
        const saved = await saveData(data);
        
        if (!saved) {
            console.warn('Данные не сохранены на диск, но удалены из памяти');
        }
        
        res.json({ 
            message: 'Товар удален', 
            item: deletedItem 
        });
    } catch (error) {
        console.error('Ошибка удаления товара:', error);
        res.status(500).json({ 
            error: 'Ошибка удаления товара',
            message: error.message
        });
    }
});

// Проверка здоровья сервера
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Clothing Store API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Тестовый маршрут для проверки
app.get('/test', (req, res) => {
    res.json({
        message: 'Сервер работает',
        timestamp: new Date().toISOString(),
        directory: __dirname,
        files: [
            'index.html',
            'server.js', 
            'package.json',
            'data.json'
        ]
    });
});

// Маршрут для получения списка файлов
app.get('/files', async (req, res) => {
    try {
        const files = await fs.readdir(__dirname);
        res.json({
            directory: __dirname,
            files: files
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Маршрут не найден',
        path: req.path,
        available: ['/', '/api/items', '/health', '/test', '/files']
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Инициализация данных при старте
async function initializeData() {
    try {
        console.log('Инициализация данных...');
        const data = await loadData();
        console.log(`Загружено ${data.length} товаров`);
        
        // Проверяем существование index.html
        try {
            await fs.access(path.join(__dirname, 'index.html'));
            console.log('✓ Файл index.html найден');
        } catch {
            console.warn('⚠ Файл index.html не найден в', __dirname);
            console.log('Создаю базовый index.html...');
            
            const basicHtml = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>👕 Магазин одежды - Админ панель</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 800px; margin: 50px auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        h1 { color: #2c3e50; }
        .btn { display: inline-block; padding: 12px 24px; margin: 10px; background: #3498db; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
        .btn:hover { background: #2980b9; }
        .api-list { text-align: left; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 10px; }
        .status { padding: 10px; border-radius: 5px; margin: 5px 0; }
        .status-ok { background: #d4edda; color: #155724; }
        .status-error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>👕 Магазин одежды - Админ панель</h1>
        <p>API сервер работает. Главный интерфейс не загружен.</p>
        
        <div class="api-list">
            <h3>Доступные API маршруты:</h3>
            <div class="status status-ok">GET /api/items - 📦 Все товары</div>
            <div class="status status-ok">POST /api/items - ➕ Добавить товар</div>
            <div class="status status-ok">PUT /api/items/:id - ✏️ Обновить товар</div>
            <div class="status status-ok">DELETE /api/items/:id - 🗑️ Удалить товар</div>
            <div class="status status-ok">GET /health - ❤️ Проверка здоровья</div>
            <div class="status status-ok">GET /test - 🔧 Тест</div>
            <div class="status status-ok">GET /files - 📁 Список файлов</div>
        </div>
        
        <div>
            <a href="/api/items" class="btn">📦 Просмотреть товары</a>
            <a href="/health" class="btn">❤️ Проверка здоровья</a>
            <a href="/test" class="btn">🔧 Тест сервера</a>
            <a href="/files" class="btn">📁 Список файлов</a>
        </div>
        
        <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
            Для полного функционала загрузите файл index.html в корень проекта
        </p>
    </div>
    
    <script>
        // Проверка API
        async function checkAPI() {
            try {
                const response = await fetch('/api/items');
                const data = await response.json();
                console.log('API работает, товаров:', data.length);
            } catch (error) {
                console.error('Ошибка API:', error);
            }
        }
        checkAPI();
    </script>
</body>
</html>`;
            
            await fs.writeFile(path.join(__dirname, 'index.html'), basicHtml);
            console.log('✓ Базовый index.html создан');
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
}

// Старт сервера
app.listen(PORT, async () => {
    console.log('🚀 Сервер запущен!');
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 Ссылка: http://localhost:${PORT}`);
    console.log(`📁 Директория: ${__dirname}`);
    console.log(`📁 Файл данных: ${DATA_FILE}`);
    console.log('📋 Доступные маршруты:');
    console.log('   GET  /              - Главная страница');
    console.log('   GET  /api/items     - Все товары');
    console.log('   POST /api/items     - Добавить товар');
    console.log('   PUT  /api/items/:id - Обновить товар');
    console.log('   DELETE /api/items/:id - Удалить товар');
    console.log('   GET  /health        - Проверка здоровья');
    console.log('   GET  /test          - Тестовый маршрут');
    console.log('   GET  /files         - Список файлов');
    
    // Инициализируем данные
    await initializeData();
});